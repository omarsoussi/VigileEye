#!/usr/bin/env python3

import json
import os
import queue
import signal
import subprocess
import sys
import threading
import time
import tkinter as tk
import shlex
import re
from dataclasses import dataclass, field
from pathlib import Path
from tkinter import filedialog
from tkinter import messagebox, ttk
from typing import Dict, List, Optional, Set, Tuple

from library_db import add_file, add_note, delete_item, get_item, init_db, list_categories, list_items


APP_DIR = Path(__file__).resolve().parent
BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", str(APP_DIR)))


def get_login_shell_env(shell: str = "/bin/zsh") -> Dict[str, str]:
    """Return environment variables from a login shell.

    On macOS, GUI-launched apps do not inherit your interactive shell environment.
    That often breaks PATH resolution for tools like `python3` and `npm`.
    """
    try:
        completed = subprocess.run(
            [shell, "-lc", "env"],
            capture_output=True,
            text=True,
            check=False,
        )
    except Exception:
        return {}

    if completed.returncode != 0:
        return {}

    env: Dict[str, str] = {}
    for line in (completed.stdout or "").splitlines():
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k:
            env[k] = v
    return env


def resolve_in_login_shell(cmd: str, shell: str = "/bin/zsh") -> str:
    """Resolve a command name using a login shell's PATH.

    Returns the absolute path to the command (as the shell would resolve it),
    or an empty string if not found.
    """
    try:
        completed = subprocess.run([shell, "-lc", f"command -v {cmd} 2>/dev/null || which {cmd} 2>/dev/null || echo """], capture_output=True, text=True, check=False)
    except Exception:
        return ""

    if completed.returncode not in (0, 1):
        return ""
    return (completed.stdout or "").strip()


def _python_version_of(exe: str) -> Tuple[int, int]:
    try:
        completed = subprocess.run([exe, "-V"], capture_output=True, text=True, check=False)
        out = (completed.stdout or completed.stderr or "").strip()
        m = re.search(r"Python\s+(\d+)\.(\d+)", out)
        if m:
            return int(m.group(1)), int(m.group(2))
    except Exception:
        pass
    return (0, 0)


def find_suitable_python(min_major: int = 3, min_minor: int = 10) -> Optional[str]:
    """Return an absolute python path with version >= min_major.min_minor if found.

    Search order: login-shell python3, common locations (/opt/homebrew, /opt/anaconda3, /usr/local/bin), system python.
    """
    candidates = []
    # login shell resolved
    shell_python = resolve_in_login_shell("python3")
    if shell_python:
        candidates.append(shell_python)

    # common paths
    candidates.extend([
        "/opt/homebrew/bin/python3.13",
        "/opt/homebrew/bin/python3",
        "/opt/anaconda3/bin/python3",
        "/usr/local/bin/python3",
        "/usr/bin/python3",
    ])

    seen = set()
    for c in candidates:
        if not c or c in seen:
            continue
        seen.add(c)
        try:
            if not Path(c).exists():
                continue
        except Exception:
            continue
        maj, minv = _python_version_of(c)
        if (maj, minv) >= (min_major, min_minor):
            return c
    return None


def _is_frozen_app() -> bool:
    # py2app sets sys.frozen
    return bool(getattr(sys, "frozen", False))


def _config_path() -> Path:
    # In a built .app, the bundle is read-only. Store config in Application Support.
    if _is_frozen_app():
        base = Path.home() / "Library" / "Application Support" / "DevRunner"
        base.mkdir(parents=True, exist_ok=True)
        cfg = base / "projects.json"
        if not cfg.exists():
            bundled = BUNDLE_DIR / "projects.json"
            if bundled.exists():
                cfg.write_text(bundled.read_text(encoding="utf-8"), encoding="utf-8")
            else:
                cfg.write_text(json.dumps({"projects": []}, indent=2), encoding="utf-8")
        return cfg
    return APP_DIR / "projects.json"


CONFIG_PATH = _config_path()


@dataclass
class Project:
    name: str
    working_dir: str
    start_command: str
    port: Optional[int] = None
    kill_port_before_start: bool = False
    env: Dict[str, str] = field(default_factory=dict)


class ProcessHandle:
    def __init__(self, popen: subprocess.Popen[str], project: Project):
        self.popen = popen
        self.project = project
        self.log_queue: "queue.Queue[Tuple[str, str]]" = queue.Queue()
        self._threads: List[threading.Thread] = []

    def start_readers(self) -> None:
        def reader(stream, stream_name: str):
            try:
                for line in iter(stream.readline, ""):
                    if not line:
                        break
                    self.log_queue.put((stream_name, line.rstrip("\n")))
            finally:
                try:
                    stream.close()
                except Exception:
                    pass

        assert self.popen.stdout is not None
        assert self.popen.stderr is not None

        t1 = threading.Thread(target=reader, args=(self.popen.stdout, "stdout"), daemon=True)
        t2 = threading.Thread(target=reader, args=(self.popen.stderr, "stderr"), daemon=True)
        t1.start()
        t2.start()
        self._threads.extend([t1, t2])


def load_projects() -> List[Project]:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Missing config: {CONFIG_PATH}")

    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    projects = []
    for raw in data.get("projects", []):
        projects.append(
            Project(
                name=str(raw.get("name", "")),
                working_dir=str(raw.get("working_dir", "")),
                start_command=str(raw.get("start_command", "")),
                port=raw.get("port"),
                kill_port_before_start=bool(raw.get("kill_port_before_start", False)),
                env=dict(raw.get("env", {}) or {}),
            )
        )

    return projects


def save_projects(projects: List[Project]) -> None:
    data = {
        "projects": [
            {
                "name": p.name,
                "working_dir": p.working_dir,
                "start_command": p.start_command,
                "port": p.port,
                "kill_port_before_start": p.kill_port_before_start,
                "env": p.env,
            }
            for p in projects
        ]
    }
    CONFIG_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def is_port_listening(port: int) -> Tuple[bool, str]:
    try:
        completed = subprocess.run(
            ["/usr/sbin/lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN"],
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.returncode == 0:
            return True, completed.stdout.strip() or "Port is listening"
        return False, (completed.stderr.strip() or completed.stdout.strip() or "Not listening")
    except FileNotFoundError:
        return False, "lsof not found"


def kill_port(port: int) -> Tuple[bool, str]:
    cmd = f"lsof -ti:{port} | xargs kill -9 2>/dev/null || true"
    completed = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    out = (completed.stdout + completed.stderr).strip()
    return True, out or f"Killed any process on port {port} (if existed)."


def is_git_repo(working_dir: str) -> bool:
    """Check if directory is a git repository."""
    git_dir = Path(working_dir) / ".git"
    return git_dir.exists()


def get_git_status(working_dir: str) -> Tuple[str, str]:
    """Get git status for a project directory.
    
    Returns: (status_label, detail_message)
      - status_label: 'clean', 'modified', 'no-git', 'error'
      - detail_message: human-readable description
    """
    if not Path(working_dir).exists():
        return "error", "Directory not found"
    
    if not is_git_repo(working_dir):
        return "no-git", "Not a git repository"
    
    try:
        # Check for uncommitted changes
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=working_dir,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            return "error", result.stderr.strip() or "Git error"
        
        output = result.stdout.strip()
        if output:
            # Count changes
            lines = [l for l in output.splitlines() if l.strip()]
            return "modified", f"{len(lines)} file(s) changed"
        else:
            return "clean", "Up to date"
    except FileNotFoundError:
        return "error", "Git not installed"
    except Exception as e:
        return "error", str(e)


def run_git_update(working_dir: str, commit_message: str) -> Tuple[bool, str]:
    """Run git add, commit, and push for a project.
    
    Returns: (success, message)
    """
    if not Path(working_dir).exists():
        return False, "Directory not found"
    
    if not is_git_repo(working_dir):
        return False, "Not a git repository"
    
    logs: List[str] = []
    
    try:
        # git add .
        result = subprocess.run(
            ["git", "add", "."],
            cwd=working_dir,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            return False, f"git add failed: {result.stderr.strip()}"
        logs.append("✓ git add .")
        
        # Check if there's anything to commit
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=working_dir,
            capture_output=True,
            text=True,
            check=False,
        )
        if not status_result.stdout.strip():
            return True, "Nothing to commit, working tree clean"
        
        # git commit -m "message"
        result = subprocess.run(
            ["git", "commit", "-m", commit_message],
            cwd=working_dir,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            err = result.stderr.strip() or result.stdout.strip()
            if "nothing to commit" in err.lower():
                return True, "Nothing to commit"
            return False, f"git commit failed: {err}"
        logs.append(f"✓ git commit -m \"{commit_message}\"")
        
        # git push origin main
        result = subprocess.run(
            ["git", "push", "origin", "main"],
            cwd=working_dir,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            # Try 'master' branch as fallback
            result = subprocess.run(
                ["git", "push", "origin", "master"],
                cwd=working_dir,
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                err = result.stderr.strip() or result.stdout.strip()
                return False, f"git push failed: {err}"
            logs.append("✓ git push origin master")
        else:
            logs.append("✓ git push origin main")
        
        return True, "\n".join(logs)
    
    except FileNotFoundError:
        return False, "Git not installed"
    except Exception as e:
        return False, str(e)


class GitCommitDialog(tk.Toplevel):
    """Dialog to enter commit message for git update."""
    
    def __init__(self, master: tk.Tk, project_name: str, colors: Optional[Dict[str, str]] = None):
        super().__init__(master)
        self.title(f"Git Update — {project_name}")
        self.resizable(False, False)
        self.result: Optional[str] = None
        
        self._colors = colors or {
            "panel": "#111827",
            "panel2": "#0f172a",
            "text": "#e5e7eb",
            "muted": "#9ca3af",
            "input_bg": "#0b1220",
            "input_fg": "#e5e7eb",
        }
        
        try:
            self.configure(bg=self._colors["panel"])
        except Exception:
            pass
        
        frm = tk.Frame(self, bg=self._colors["panel"], padx=16, pady=16)
        frm.pack(fill="both", expand=True)
        
        tk.Label(
            frm,
            text="Commit Message:",
            bg=self._colors["panel"],
            fg=self._colors["muted"],
            font=("-apple-system", 12),
        ).pack(anchor="w", pady=(0, 8))
        
        self.msg_var = tk.StringVar(value="")
        self.msg_entry = tk.Entry(
            frm,
            textvariable=self.msg_var,
            width=50,
            bg=self._colors["input_bg"],
            fg=self._colors["input_fg"],
            insertbackground=self._colors["input_fg"],
            relief="flat",
            highlightthickness=1,
            highlightbackground=self._colors["panel2"],
            highlightcolor=self._colors["panel2"],
            font=("-apple-system", 12),
        )
        self.msg_entry.pack(fill="x", pady=(0, 16))
        self.msg_entry.focus_set()
        
        btn_frame = tk.Frame(frm, bg=self._colors["panel"])
        btn_frame.pack(fill="x")
        
        ttk.Button(btn_frame, text="Cancel", command=self._cancel).pack(side="right", padx=(8, 0))
        ttk.Button(btn_frame, text="Update", command=self._confirm).pack(side="right")
        
        self.bind("<Escape>", lambda _e: self._cancel())
        self.bind("<Return>", lambda _e: self._confirm())
        
        self.grab_set()
        self.transient(master)
        self.wait_visibility()
    
    def _cancel(self) -> None:
        self.result = None
        self.destroy()
    
    def _confirm(self) -> None:
        msg = self.msg_var.get().strip()
        if not msg:
            messagebox.showerror("Commit Message", "Please enter a commit message.")
            return
        self.result = msg
        self.destroy()


class AddProjectDialog(tk.Toplevel):
    def __init__(self, master: tk.Tk, colors: Optional[Dict[str, str]] = None):
        super().__init__(master)
        self.title("Add Project")
        self.resizable(False, False)
        self.result: Optional[Project] = None

        # ttk widgets can ignore custom colors on macOS depending on theme.
        # Use tk widgets here to guarantee readable text in dark mode.
        self._colors = colors or {
            "panel": "#ffffff",
            "panel2": "#f3f4f6",
            "text": "#111827",
            "muted": "#4b5563",
            "input_bg": "#ffffff",
            "input_fg": "#111827",
        }
        try:
            self.configure(bg=self._colors["panel"])
        except Exception:
            pass

        self.var_name = tk.StringVar()
        self.var_dir = tk.StringVar()
        self.var_cmd = tk.StringVar()
        self.var_port = tk.StringVar()
        self.var_kill = tk.BooleanVar(value=True)
        self.var_env = tk.StringVar(value="")

        frm = tk.Frame(self, bg=self._colors["panel"], padx=12, pady=12)
        frm.grid(row=0, column=0, sticky="nsew")

        def add_row(label: str, widget: tk.Widget, row: int):
            tk.Label(frm, text=label, bg=self._colors["panel"], fg=self._colors["muted"]).grid(
                row=row, column=0, sticky="w", pady=4
            )
            widget.grid(row=row, column=1, sticky="ew", pady=4)

        frm.columnconfigure(1, weight=1)

        def mk_entry(var: tk.StringVar, width: int = 50) -> tk.Entry:
            return tk.Entry(
                frm,
                textvariable=var,
                width=width,
                bg=self._colors["input_bg"],
                fg=self._colors["input_fg"],
                insertbackground=self._colors["input_fg"],
                relief="flat",
                highlightthickness=1,
                highlightbackground=self._colors["panel2"],
                highlightcolor=self._colors["panel2"],
            )

        add_row("Name", mk_entry(self.var_name, 50), 0)
        add_row("Working dir", mk_entry(self.var_dir, 50), 1)
        add_row("Start command", mk_entry(self.var_cmd, 50), 2)
        add_row("Port (optional)", mk_entry(self.var_port, 20), 3)

        chk = tk.Checkbutton(
            frm,
            text="Kill port before start",
            variable=self.var_kill,
            bg=self._colors["panel"],
            fg=self._colors["text"],
            activebackground=self._colors["panel"],
            activeforeground=self._colors["text"],
            selectcolor=self._colors["input_bg"],
        )
        add_row("", chk, 4)

        env_hint = "ENV (optional): one per line as KEY=VALUE"
        add_row(env_hint, mk_entry(self.var_env, 50), 5)

        btns = tk.Frame(frm, bg=self._colors["panel"])
        btns.grid(row=6, column=0, columnspan=2, sticky="e", pady=(10, 0))
        ttk.Button(btns, text="Cancel", command=self._cancel).grid(row=0, column=0, padx=6)
        ttk.Button(btns, text="Add", command=self._add).grid(row=0, column=1)

        self.bind("<Escape>", lambda _e: self._cancel())
        self.bind("<Return>", lambda _e: self._add())

        self.grab_set()
        self.transient(master)
        self.wait_visibility()
        self.focus_set()

    def _cancel(self) -> None:
        self.result = None
        self.destroy()

    def _add(self) -> None:
        name = self.var_name.get().strip()
        working_dir = self.var_dir.get().strip()
        cmd = self.var_cmd.get().strip()
        port_raw = self.var_port.get().strip()

        if not name or not working_dir or not cmd:
            messagebox.showerror("Missing fields", "Name, working dir, and command are required.")
            return

        port: Optional[int]
        if port_raw:
            try:
                port = int(port_raw)
                if port <= 0 or port > 65535:
                    raise ValueError()
            except ValueError:
                messagebox.showerror("Invalid port", "Port must be an integer between 1 and 65535.")
                return
        else:
            port = None

        env_text = self.var_env.get().strip()
        env: Dict[str, str] = {}
        if env_text:
            for part in env_text.split("\\n"):
                part = part.strip()
                if not part:
                    continue
                if "=" not in part:
                    messagebox.showerror("Invalid env", f"Invalid ENV line (expected KEY=VALUE): {part}")
                    return
                k, v = part.split("=", 1)
                env[k.strip()] = v.strip()

        self.result = Project(
            name=name,
            working_dir=working_dir,
            start_command=cmd,
            port=port,
            kill_port_before_start=bool(self.var_kill.get()),
            env=env,
        )
        self.destroy()


class DevRunnerApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Dev Runner")
        self.geometry("1100x700")

        # Default theme: dark (user requested). Keeps everything readable on macOS.
        self._theme_mode = "dark"  # "dark" | "pastel"

        self.projects: List[Project] = load_projects()
        self.handles: Dict[str, ProcessHandle] = {}
        self.logs_by_project: Dict[str, List[Tuple[str, str]]] = {p.name: [] for p in self.projects}
        self.status_by_project: Dict[str, str] = {p.name: "stopped" for p in self.projects}
        self.git_status_by_project: Dict[str, str] = {p.name: "..." for p in self.projects}
        self._exit_logged_pids: Set[int] = set()
        # GUI apps on macOS don't inherit your interactive shell PATH.
        # Capture login-shell env so commands like `python3`/`npm` work the same as Terminal.
        self._login_shell_env: Dict[str, str] = get_login_shell_env()

        init_db()
        self._selected_item_id: Optional[int] = None

        self._build_ui()
        self._poll_logs()

    def _build_ui(self) -> None:
        def palette_pastel() -> Dict[str, str]:
            return {
                "bg": "#c9f5e7",  # mint
                "panel": "#f7f4ef",  # warm white
                "panel2": "#efece6",  # slightly darker
                "text": "#0f172a",  # near-black
                "muted": "#475569",  # slate
                "ok": "#16a34a",
                "warn": "#d97706",
                "err": "#dc2626",
                "info": "#2563eb",
                "chip": "#111827",
                "chip_text": "#ffffff",
                "input_bg": "#ffffff",
                "input_fg": "#0f172a",
                "running_bg": "#d1fae5",
                "starting_bg": "#fef3c7",
                "stopped_bg": "#e5e7eb",
                "failed_bg": "#fee2e2",
            }

        def palette_dark() -> Dict[str, str]:
            return {
                "bg": "#0b1020",  # deep navy
                "panel": "#111827",  # slate
                "panel2": "#0f172a",  # darker slate
                "text": "#e5e7eb",  # light
                "muted": "#9ca3af",  # muted light
                "ok": "#22c55e",
                "warn": "#f59e0b",
                "err": "#ef4444",
                "info": "#60a5fa",
                "chip": "#1f2937",
                "chip_text": "#e5e7eb",
                "input_bg": "#0b1220",
                "input_fg": "#e5e7eb",
                "running_bg": "#064e3b",
                "starting_bg": "#78350f",
                "stopped_bg": "#1f2937",
                "failed_bg": "#7f1d1d",
            }

        self._colors = palette_dark() if self._theme_mode == "dark" else palette_pastel()

        style = ttk.Style()
        try:
            style.theme_use("clam")
        except Exception:
            pass
        try:
            # Base ttk look
            style.configure("TFrame", background=self._colors["panel"])
            style.configure("TLabel", background=self._colors["panel"], foreground=self._colors["text"])
            style.configure(
                "TEntry",
                fieldbackground=self._colors["input_bg"],
                background=self._colors["input_bg"],
                foreground=self._colors["input_fg"],
                insertcolor=self._colors["input_fg"],
            )
            style.configure(
                "TCombobox",
                fieldbackground=self._colors["input_bg"],
                background=self._colors["input_bg"],
                foreground=self._colors["input_fg"],
                arrowcolor=self._colors["input_fg"],
                insertcolor=self._colors["input_fg"],
            )
            style.map(
                "TCombobox",
                fieldbackground=[("readonly", self._colors["input_bg"])],
                foreground=[("readonly", self._colors["input_fg"])],
            )

            # Notebook
            style.configure("TNotebook", background=self._colors["panel"], borderwidth=0)
            style.configure(
                "TNotebook.Tab",
                background=self._colors["panel2"],
                foreground=self._colors["text"],
                padding=(12, 6),
            )
            style.map(
                "TNotebook.Tab",
                background=[("selected", self._colors["panel"])],
                foreground=[("selected", self._colors["text"])],
            )

            # Action buttons (use ttk on macOS so colors apply reliably)
            style.configure(
                "Action.TButton",
                background=self._colors["chip"],
                foreground=self._colors["chip_text"],
                borderwidth=0,
                focusthickness=0,
                padding=(12, 10),
                font=("-apple-system", 12, "bold"),
            )
            style.map(
                "Action.TButton",
                background=[("active", "#0b1220"), ("pressed", "#0b1220")],
                foreground=[("disabled", "#6b7280")],
            )

            style.configure(
                "Treeview",
                background=self._colors["panel"],
                fieldbackground=self._colors["panel"],
                foreground=self._colors["text"],
                rowheight=28,
            )
            style.configure(
                "Treeview.Heading",
                background=self._colors["panel2"],
                foreground=self._colors["text"],
                relief="flat",
            )
            style.map(
                "Treeview",
                background=[("selected", self._colors["chip"])],
                foreground=[("selected", self._colors["chip_text"])],
            )
        except Exception:
            pass

        self.configure(bg=self._colors["bg"])

        # Force default widget colors so no text ends up white-on-white.
        # Use option_add to ensure even native widgets pick up readable colors.
        try:
            self.option_add("*Label.foreground", self._colors["text"])
            self.option_add("*Label.background", self._colors["panel"])
            self.option_add("*Button.background", self._colors["chip"])
            self.option_add("*Button.foreground", self._colors["chip_text"])
            self.option_add("*Entry.background", self._colors["input_bg"])
            self.option_add("*Entry.foreground", self._colors["input_fg"])
            self.option_add("*Text.background", self._colors["input_bg"])
            self.option_add("*Text.foreground", self._colors["input_fg"])
            self.option_add("*Listbox.background", self._colors["panel"])
            self.option_add("*Listbox.foreground", self._colors["text"])
        except Exception:
            pass

        root = tk.Frame(self, bg=self._colors["bg"])
        root.pack(fill="both", expand=True)

        left = tk.Frame(root, bg=self._colors["panel"], padx=14, pady=14)
        left.pack(side="left", fill="y", padx=16, pady=16)

        right = tk.Frame(root, bg=self._colors["bg"])
        right.pack(side="right", fill="both", expand=True, padx=(0, 16), pady=16)

        tk.Label(
            left,
            text="Dev Runner",
            font=("-apple-system", 20, "bold"),
            fg=self._colors["text"],
            bg=self._colors["panel"],
        ).pack(anchor="w")

        tk.Label(
            left,
            text="Run services + keep notes/files",
            font=("-apple-system", 12),
            fg=self._colors["muted"],
            bg=self._colors["panel"],
        ).pack(anchor="w", pady=(0, 14))

        # Projects table
        self.project_tree = ttk.Treeview(left, columns=("name", "status", "port", "git"), show="headings", height=16)
        self.project_tree.heading("name", text="Project")
        self.project_tree.heading("status", text="Status")
        self.project_tree.heading("port", text="Port")
        self.project_tree.heading("git", text="Git")
        self.project_tree.column("name", width=200, anchor="w")
        self.project_tree.column("status", width=80, anchor="center")
        self.project_tree.column("port", width=50, anchor="center")
        self.project_tree.column("git", width=90, anchor="center")

        self.project_tree.tag_configure("running", background=self._colors["running_bg"], foreground=self._colors["text"])
        self.project_tree.tag_configure("starting", background=self._colors["starting_bg"], foreground=self._colors["text"])
        self.project_tree.tag_configure("stopped", background=self._colors["stopped_bg"], foreground=self._colors["text"])
        self.project_tree.tag_configure("failed", background=self._colors["failed_bg"], foreground=self._colors["text"])
        # Git status tags (row background based on run status, git shown in column)
        self.project_tree.tag_configure("git_clean", foreground=self._colors["ok"])
        self.project_tree.tag_configure("git_modified", foreground=self._colors["warn"])
        self.project_tree.tag_configure("git_error", foreground=self._colors["err"])

        self.project_tree.pack(fill="y", expand=False)
        self.project_tree.bind("<<TreeviewSelect>>", lambda _e: self._on_project_selected())
        self._rebuild_project_tree()

        # Runner buttons
        btn_row = tk.Frame(left, bg=self._colors["panel"])
        btn_row.pack(fill="x", pady=(12, 0))
        self._mk_btn(btn_row, "Run", self._run_selected).pack(side="left", padx=(0, 8))
        self._mk_btn(btn_row, "Stop", self._stop_selected).pack(side="left", padx=(0, 8))
        self._mk_btn(btn_row, "Restart", self._restart_selected).pack(side="left")

        all_row = tk.Frame(left, bg=self._colors["panel"])
        all_row.pack(fill="x", pady=(8, 0))
        self._mk_btn(all_row, "Run All", self._run_all).pack(side="left", padx=(0, 8))
        self._mk_btn(all_row, "Stop All", self._stop_all).pack(side="left")

        manage_row = tk.Frame(left, bg=self._colors["panel"])
        manage_row.pack(fill="x", pady=(10, 0))
        self._mk_btn(manage_row, "Add…", self._add_project).pack(side="left", padx=(0, 8))
        self._mk_btn(manage_row, "Remove", self._remove_project).pack(side="left", padx=(0, 8))
        self._mk_btn(manage_row, "Config", self._open_config).pack(side="left")

        # Git buttons row
        git_row = tk.Frame(left, bg=self._colors["panel"])
        git_row.pack(fill="x", pady=(10, 0))
        self._mk_btn(git_row, "Git Update", self._git_update_selected).pack(side="left", padx=(0, 8))
        self._mk_btn(git_row, "Update All", self._git_update_all).pack(side="left", padx=(0, 8))
        self._mk_btn(git_row, "Refresh Git", self._refresh_all_git_status).pack(side="left")

        # Status pill
        self.status_var = tk.StringVar(value="Select a project")
        self.status_label = tk.Label(
            left,
            textvariable=self.status_var,
            fg=self._colors["text"],
            bg=self._colors["stopped_bg"],
            padx=12,
            pady=10,
            wraplength=320,
            justify="left",
        )
        self.status_label.pack(fill="x", pady=(14, 0))

        # Main card with tabs
        card = tk.Frame(right, bg=self._colors["panel"], padx=14, pady=14)
        card.pack(fill="both", expand=True)

        self.tabs = ttk.Notebook(card)
        self.tabs.pack(fill="both", expand=True)

        self.runner_tab = tk.Frame(self.tabs, bg=self._colors["panel"])
        self.library_tab = tk.Frame(self.tabs, bg=self._colors["panel"])
        self.tabs.add(self.runner_tab, text="Runner")
        self.tabs.add(self.library_tab, text="Library")

        # Runner tab
        hdr = tk.Frame(self.runner_tab, bg=self._colors["panel"])
        hdr.pack(fill="x", pady=(4, 8))
        self.selected_name_var = tk.StringVar(value="Logs")
        tk.Label(
            hdr,
            textvariable=self.selected_name_var,
            font=("-apple-system", 14, "bold"),
            fg=self._colors["text"],
            bg=self._colors["panel"],
        ).pack(side="left")
        self._mk_btn(hdr, "Clear logs", self._clear_logs).pack(side="right")

        self.log_text = tk.Text(
            self.runner_tab,
            wrap="none",
            state="disabled",
            bg=self._colors["bg"],
            fg=self._colors["text"],
            insertbackground=self._colors["text"],
        )
        self.log_text.tag_configure("ok", foreground=self._colors["ok"])
        self.log_text.tag_configure("warn", foreground=self._colors["warn"])
        self.log_text.tag_configure("err", foreground=self._colors["err"])
        self.log_text.tag_configure("info", foreground=self._colors["info"])
        self.log_text.tag_configure("muted", foreground=self._colors["muted"])
        self.log_text.pack(fill="both", expand=True)

        # Library tab
        self._build_library_tab()

        # pick first item by default
        if self.projects:
            first = self.projects[0].name
            iid = self._iid_for_project(first)
            if iid is not None:
                self.project_tree.selection_set(iid)
                self.project_tree.focus(iid)
            self._on_project_selected()
        
        # Initialize git status for all projects
        self.after(500, self._refresh_all_git_status)

    def _selected_project(self) -> Optional[Project]:
        sel = self.project_tree.selection()
        if not sel:
            return None
        iid = sel[0]
        values = self.project_tree.item(iid, "values")
        if not values:
            return None
        name = str(values[0])
        for p in self.projects:
            if p.name == name:
                return p
        return None

    def _mk_btn(self, parent: tk.Widget, text: str, cmd) -> ttk.Button:
        btn = ttk.Button(parent, text=text, command=cmd, style="Action.TButton")
        try:
            btn.configure(cursor="hand2")
        except Exception:
            pass
        return btn

    def _on_project_selected(self) -> None:
        self._render_selected_logs()
        self._refresh_status_pill()
        if hasattr(self, "items_tree"):
            self._refresh_library_for_selected_project()

    def _refresh_status_pill(self) -> None:
        p = self._selected_project()
        if not p:
            self.status_label.configure(bg=self._colors["stopped_bg"])
            return
        status = self.status_by_project.get(p.name, "stopped")
        bg = {
            "running": self._colors["running_bg"],
            "starting": self._colors["starting_bg"],
            "stopped": self._colors["stopped_bg"],
            "failed": self._colors["failed_bg"],
        }.get(status, self._colors["stopped_bg"])
        self.status_label.configure(bg=bg)

    def _iid_for_project(self, project_name: str) -> Optional[str]:
        for iid in self.project_tree.get_children(""):
            values = self.project_tree.item(iid, "values")
            if values and str(values[0]) == project_name:
                return iid
        return None

    def _set_project_status(self, project_name: str, status: str) -> None:
        self.status_by_project[project_name] = status
        iid = self._iid_for_project(project_name)
        if iid is not None:
            p = next((x for x in self.projects if x.name == project_name), None)
            port = p.port if p else ""
            git_stat = self.git_status_by_project.get(project_name, "...")
            self.project_tree.item(
                iid,
                values=(project_name, status, "" if port is None else str(port), git_stat),
                tags=(status,),
            )
        self._refresh_status_pill()

    def _append_log(self, project_name: str, line: str, tag: str = "muted") -> None:
        self.logs_by_project.setdefault(project_name, []).append((tag, line))
        selected = self._selected_project()
        if selected and selected.name == project_name:
            self._render_selected_logs(autoscroll=True)

    def _render_selected_logs(self, autoscroll: bool = False) -> None:
        p = self._selected_project()
        if not p:
            return
        self.selected_name_var.set(f"Logs — {p.name}")
        entries = self.logs_by_project.get(p.name, [])

        self.log_text.configure(state="normal")
        self.log_text.delete("1.0", "end")
        for tag, line in entries[-5000:]:
            self.log_text.insert("end", line + "\n", tag)
        self.log_text.configure(state="disabled")
        if autoscroll:
            self.log_text.see("end")

    def _set_status(self, msg: str) -> None:
        self.status_var.set(msg)
        self._refresh_status_pill()

    def _clear_logs(self) -> None:
        p = self._selected_project()
        if not p:
            return
        self.logs_by_project[p.name] = []
        self._render_selected_logs()

    def _add_project(self) -> None:
        dlg = AddProjectDialog(self, colors=getattr(self, "_colors", None))
        self.wait_window(dlg)
        if dlg.result is None:
            return

        new_project = dlg.result
        if any(p.name == new_project.name for p in self.projects):
            messagebox.showerror("Duplicate name", "Project name must be unique.")
            return

        self.projects.append(new_project)
        self.logs_by_project[new_project.name] = []
        self.status_by_project[new_project.name] = "stopped"
        self.git_status_by_project[new_project.name] = "..."
        save_projects(self.projects)
        self._rebuild_project_tree(select_name=new_project.name)
        self._refresh_git_status_for_project(new_project)
        self._set_status(f"Added {new_project.name}")

    def _remove_project(self) -> None:
        p = self._selected_project()
        if not p:
            return

        if p.name in self.handles and self.handles[p.name].popen.poll() is None:
            messagebox.showerror("Running", "Stop the project before removing it.")
            return

        if not messagebox.askyesno("Remove", f"Remove project '{p.name}'?"):
            return

        self.projects = [x for x in self.projects if x.name != p.name]
        self.logs_by_project.pop(p.name, None)
        self.handles.pop(p.name, None)
        self.status_by_project.pop(p.name, None)
        self.git_status_by_project.pop(p.name, None)
        save_projects(self.projects)

        self._rebuild_project_tree(select_first=True)
        self._render_selected_logs()
        self._set_status(f"Removed {p.name}")

    def _rebuild_project_tree(self, select_name: Optional[str] = None, select_first: bool = False) -> None:
        for iid in self.project_tree.get_children(""):
            self.project_tree.delete(iid)

        for p in self.projects:
            status = self.status_by_project.get(p.name, "stopped")
            port = "" if p.port is None else str(p.port)
            git_stat = self.git_status_by_project.get(p.name, "...")
            self.project_tree.insert("", "end", values=(p.name, status, port, git_stat), tags=(status,))

        # selection
        chosen: Optional[str] = None
        if select_name:
            chosen = self._iid_for_project(select_name)
        if chosen is None and select_first and self.projects:
            chosen = self._iid_for_project(self.projects[0].name)
        if chosen is None and self.projects:
            chosen = self._iid_for_project(self.projects[0].name)
        if chosen is not None:
            self.project_tree.selection_set(chosen)
            self.project_tree.focus(chosen)
            # Don't call _on_project_selected() here.
            # During initial UI build, runner widgets (like selected_name_var/log_text)
            # may not exist yet. The caller decides when to refresh.

    def _open_config(self) -> None:
        # Open the config in the default editor.
        try:
            subprocess.Popen(["open", str(CONFIG_PATH)])
        except Exception as e:
            messagebox.showerror("Open config", f"Failed to open config: {e}")

    def _run_all(self) -> None:
        if not self.projects:
            return
        self._set_status("Starting all projects...")

        def run_next(index: int):
            if index >= len(self.projects):
                self._set_status("Run All triggered")
                return
            self._run_project(self.projects[index])
            self.after(350, lambda: run_next(index + 1))

        run_next(0)

    def _stop_all(self) -> None:
        if not self.projects:
            return
        self._set_status("Stopping all projects...")
        for p in self.projects:
            self._stop_project(p)
        self.after(600, lambda: self._set_status("Stop All triggered"))

    # -----------------------
    # Library (notes/files)
    # -----------------------
    def _build_library_tab(self) -> None:
        top = tk.Frame(self.library_tab, bg=self._colors["panel"])
        top.pack(fill="x", pady=(6, 10))

        tk.Label(
            top,
            text="Project library",
            font=("-apple-system", 14, "bold"),
            fg=self._colors["text"],
            bg=self._colors["panel"],
        ).pack(side="left")

        actions = tk.Frame(top, bg=self._colors["panel"])
        actions.pack(side="right")
        self._mk_btn(actions, "+ Note", self._add_note_ui).pack(side="left", padx=(0, 8))
        self._mk_btn(actions, "+ File", self._add_file_ui).pack(side="left", padx=(0, 8))
        self._mk_btn(actions, "+ Image", self._add_image_ui).pack(side="left")

        filters = tk.Frame(self.library_tab, bg=self._colors["panel"])
        filters.pack(fill="x", pady=(0, 10))

        tk.Label(filters, text="Search", bg=self._colors["panel"], fg=self._colors["muted"]).pack(side="left")
        self.search_var = tk.StringVar(value="")
        search_entry = tk.Entry(
            filters,
            textvariable=self.search_var,
            width=28,
            bg=self._colors["input_bg"],
            fg=self._colors["input_fg"],
            insertbackground=self._colors["input_fg"],
            relief="flat",
            highlightthickness=1,
            highlightbackground=self._colors["panel2"],
            highlightcolor=self._colors["panel2"],
        )
        search_entry.pack(side="left", padx=(8, 14))
        search_entry.bind("<KeyRelease>", lambda _e: self._refresh_library_for_selected_project())

        tk.Label(filters, text="Category", bg=self._colors["panel"], fg=self._colors["muted"]).pack(side="left")
        self.category_var = tk.StringVar(value="All")
        self.category_combo = ttk.Combobox(filters, textvariable=self.category_var, width=16, state="readonly")
        self.category_combo.pack(side="left", padx=(8, 14))
        self.category_combo.bind("<<ComboboxSelected>>", lambda _e: self._refresh_library_for_selected_project())

        tk.Label(filters, text="Type", bg=self._colors["panel"], fg=self._colors["muted"]).pack(side="left")
        self.kind_var = tk.StringVar(value="All")
        self.kind_combo = ttk.Combobox(filters, textvariable=self.kind_var, width=10, state="readonly")
        self.kind_combo["values"] = ("All", "note", "file", "image")
        self.kind_combo.pack(side="left", padx=(8, 0))
        self.kind_combo.bind("<<ComboboxSelected>>", lambda _e: self._refresh_library_for_selected_project())

        body = tk.Frame(self.library_tab, bg=self._colors["panel"])
        body.pack(fill="both", expand=True)

        left_list = tk.Frame(body, bg=self._colors["panel"])
        left_list.pack(side="left", fill="both", expand=True)

        right_preview = tk.Frame(body, bg=self._colors["panel"], padx=10)
        right_preview.pack(side="right", fill="both", expand=True)

        self.items_tree = ttk.Treeview(left_list, columns=("title", "category", "kind", "created"), show="headings")
        self.items_tree.heading("title", text="Title")
        self.items_tree.heading("category", text="Category")
        self.items_tree.heading("kind", text="Type")
        self.items_tree.heading("created", text="Date")
        self.items_tree.column("title", width=260, anchor="w")
        self.items_tree.column("category", width=140, anchor="w")
        self.items_tree.column("kind", width=80, anchor="center")
        self.items_tree.column("created", width=110, anchor="center")
        self.items_tree.pack(fill="both", expand=True)
        self.items_tree.bind("<<TreeviewSelect>>", lambda _e: self._on_item_selected())

        self.preview_title = tk.Label(
            right_preview,
            text="Select an item",
            font=("-apple-system", 14, "bold"),
            fg=self._colors["text"],
            bg=self._colors["panel"],
            anchor="w",
        )
        self.preview_title.pack(fill="x", pady=(2, 8))

        self.preview_meta = tk.Label(
            right_preview,
            text="",
            font=("-apple-system", 11),
            fg=self._colors["muted"],
            bg=self._colors["panel"],
            anchor="w",
            justify="left",
        )
        self.preview_meta.pack(fill="x", pady=(0, 8))

        self.preview_text = tk.Text(right_preview, height=18, wrap="word")
        self.preview_text.configure(
            bg=self._colors["input_bg"],
            fg=self._colors["input_fg"],
            insertbackground=self._colors["input_fg"],
            relief="flat",
            highlightthickness=1,
            highlightbackground=self._colors["panel2"],
            highlightcolor=self._colors["panel2"],
        )
        self.preview_text.pack(fill="both", expand=True)

        preview_actions = tk.Frame(right_preview, bg=self._colors["panel"])
        preview_actions.pack(fill="x", pady=(10, 0))
        self._mk_btn(preview_actions, "Open", self._open_selected_item).pack(side="left", padx=(0, 8))
        self._mk_btn(preview_actions, "Delete", self._delete_selected_item).pack(side="left")

        self._refresh_library_for_selected_project()

    def _refresh_library_for_selected_project(self) -> None:
        p = self._selected_project()
        if not p:
            return

        cats = ["All"] + list_categories(p.name)
        self.category_combo["values"] = tuple(cats)
        if self.category_var.get() not in cats:
            self.category_var.set("All")

        for iid in self.items_tree.get_children(""):
            self.items_tree.delete(iid)

        items = list_items(
            project=p.name,
            search=self.search_var.get().strip(),
            category=self.category_var.get(),
            kind=self.kind_var.get(),
        )
        for it in items:
            created = time.strftime("%Y-%m-%d", time.localtime(it.created_at))
            self.items_tree.insert("", "end", iid=str(it.id), values=(it.title, it.category, it.kind, created))

        self._selected_item_id = None
        self._render_item_preview(None)

    def _on_item_selected(self) -> None:
        sel = self.items_tree.selection()
        if not sel:
            return
        try:
            item_id = int(sel[0])
        except ValueError:
            return
        self._selected_item_id = item_id
        self._render_item_preview(item_id)

    def _render_item_preview(self, item_id: Optional[int]) -> None:
        self.preview_text.configure(state="normal")
        self.preview_text.delete("1.0", "end")

        if item_id is None:
            self.preview_title.configure(text="Select an item")
            self.preview_meta.configure(text="")
            self.preview_text.insert("end", "Choose a note/file/image from the list.")
            self.preview_text.configure(state="disabled")
            return

        it = get_item(item_id)
        if not it:
            self.preview_title.configure(text="Not found")
            self.preview_meta.configure(text="")
            self.preview_text.insert("end", "Item was deleted.")
            self.preview_text.configure(state="disabled")
            return

        created = time.strftime("%Y-%m-%d %H:%M", time.localtime(it.created_at))
        self.preview_title.configure(text=it.title)
        self.preview_meta.configure(text=f"{it.kind} • {it.category} • {created}")

        if it.kind == "note":
            self.preview_text.insert("end", it.body or "")
        else:
            self.preview_text.insert("end", it.file_path or "")
            self.preview_text.insert("end", "\n\nTip: click Open to view it.")

        self.preview_text.configure(state="disabled")

    def _add_note_ui(self) -> None:
        p = self._selected_project()
        if not p:
            return

        win = tk.Toplevel(self)
        win.title("Add Note")
        win.configure(bg=self._colors["panel"])
        win.resizable(False, False)

        title_var = tk.StringVar(value="")
        cat_var = tk.StringVar(value="General")

        tk.Label(win, text="Title", bg=self._colors["panel"], fg=self._colors["muted"]).grid(row=0, column=0, sticky="w", padx=12, pady=(12, 4))
        tk.Entry(
            win,
            textvariable=title_var,
            width=50,
            bg=self._colors["input_bg"],
            fg=self._colors["input_fg"],
            insertbackground=self._colors["input_fg"],
            relief="flat",
            highlightthickness=1,
            highlightbackground=self._colors["panel2"],
            highlightcolor=self._colors["panel2"],
        ).grid(row=0, column=1, padx=12, pady=(12, 4))

        tk.Label(win, text="Category", bg=self._colors["panel"], fg=self._colors["muted"]).grid(row=1, column=0, sticky="w", padx=12, pady=4)
        tk.Entry(
            win,
            textvariable=cat_var,
            width=30,
            bg=self._colors["input_bg"],
            fg=self._colors["input_fg"],
            insertbackground=self._colors["input_fg"],
            relief="flat",
            highlightthickness=1,
            highlightbackground=self._colors["panel2"],
            highlightcolor=self._colors["panel2"],
        ).grid(row=1, column=1, sticky="w", padx=12, pady=4)

        tk.Label(win, text="Body", bg=self._colors["panel"], fg=self._colors["muted"]).grid(row=2, column=0, sticky="nw", padx=12, pady=4)
        body = tk.Text(win, width=60, height=12, wrap="word")
        body.configure(
            bg=self._colors["input_bg"],
            fg=self._colors["input_fg"],
            insertbackground=self._colors["input_fg"],
            relief="flat",
            highlightthickness=1,
            highlightbackground=self._colors["panel2"],
            highlightcolor=self._colors["panel2"],
        )
        body.grid(row=2, column=1, padx=12, pady=4)

        def save():
            t = title_var.get().strip() or "Untitled"
            c = cat_var.get().strip() or "General"
            b = body.get("1.0", "end").rstrip("\n")
            add_note(p.name, c, t, b)
            win.destroy()
            self._refresh_library_for_selected_project()

        btns = tk.Frame(win, bg=self._colors["panel"])
        btns.grid(row=3, column=0, columnspan=2, sticky="e", padx=12, pady=12)
        self._mk_btn(btns, "Cancel", win.destroy).pack(side="left", padx=(0, 8))
        self._mk_btn(btns, "Save", save).pack(side="left")

        win.grab_set()

    def _add_file_ui(self) -> None:
        self._add_file_like(kind="file")

    def _add_image_ui(self) -> None:
        self._add_file_like(kind="image")

    def _add_file_like(self, kind: str) -> None:
        p = self._selected_project()
        if not p:
            return

        path = filedialog.askopenfilename(title=f"Select {kind}")
        if not path:
            return

        win = tk.Toplevel(self)
        win.title(f"Add {kind.title()}")
        win.configure(bg=self._colors["panel"])
        win.resizable(False, False)

        title_var = tk.StringVar(value=Path(path).name)
        cat_var = tk.StringVar(value="General")

        tk.Label(win, text="Title", bg=self._colors["panel"], fg=self._colors["muted"]).grid(row=0, column=0, sticky="w", padx=12, pady=(12, 4))
        tk.Entry(
            win,
            textvariable=title_var,
            width=50,
            bg=self._colors["input_bg"],
            fg=self._colors["input_fg"],
            insertbackground=self._colors["input_fg"],
            relief="flat",
            highlightthickness=1,
            highlightbackground=self._colors["panel2"],
            highlightcolor=self._colors["panel2"],
        ).grid(row=0, column=1, padx=12, pady=(12, 4))

        tk.Label(win, text="Category", bg=self._colors["panel"], fg=self._colors["muted"]).grid(row=1, column=0, sticky="w", padx=12, pady=4)
        tk.Entry(
            win,
            textvariable=cat_var,
            width=30,
            bg=self._colors["input_bg"],
            fg=self._colors["input_fg"],
            insertbackground=self._colors["input_fg"],
            relief="flat",
            highlightthickness=1,
            highlightbackground=self._colors["panel2"],
            highlightcolor=self._colors["panel2"],
        ).grid(row=1, column=1, sticky="w", padx=12, pady=4)

        tk.Label(win, text="Path", bg=self._colors["panel"], fg=self._colors["muted"]).grid(row=2, column=0, sticky="nw", padx=12, pady=4)
        tk.Message(win, text=path, width=420, bg=self._colors["panel"], fg=self._colors["text"]).grid(row=2, column=1, sticky="w", padx=12, pady=4)

        def save():
            t = title_var.get().strip() or Path(path).name
            c = cat_var.get().strip() or "General"
            try:
                add_file(p.name, c, t, path, kind=kind)
            except Exception as e:
                messagebox.showerror("Add", str(e))
                return
            win.destroy()
            self._refresh_library_for_selected_project()

        btns = tk.Frame(win, bg=self._colors["panel"])
        btns.grid(row=3, column=0, columnspan=2, sticky="e", padx=12, pady=12)
        self._mk_btn(btns, "Cancel", win.destroy).pack(side="left", padx=(0, 8))
        self._mk_btn(btns, "Save", save).pack(side="left")

        win.grab_set()

    def _open_selected_item(self) -> None:
        if self._selected_item_id is None:
            return
        it = get_item(self._selected_item_id)
        if not it or it.kind == "note":
            return
        if it.file_path:
            try:
                subprocess.Popen(["open", it.file_path])
            except Exception as e:
                messagebox.showerror("Open", str(e))

    def _delete_selected_item(self) -> None:
        if self._selected_item_id is None:
            return
        if not messagebox.askyesno("Delete", "Delete this item?"):
            return
        delete_item(self._selected_item_id)
        self._selected_item_id = None
        self._refresh_library_for_selected_project()

    # -----------------------
    # Git operations
    # -----------------------
    def _refresh_git_status_for_project(self, project: Project) -> None:
        """Refresh git status for a single project."""
        status_label, detail = get_git_status(project.working_dir)
        
        if status_label == "clean":
            display = "✓ Clean"
        elif status_label == "modified":
            display = "● Modified"
        elif status_label == "no-git":
            display = "—"
        else:
            display = "✗ Error"
        
        self.git_status_by_project[project.name] = display
        
        # Update tree row
        iid = self._iid_for_project(project.name)
        if iid is not None:
            run_status = self.status_by_project.get(project.name, "stopped")
            port = "" if project.port is None else str(project.port)
            self.project_tree.item(
                iid,
                values=(project.name, run_status, port, display),
                tags=(run_status,),
            )
    
    def _refresh_all_git_status(self) -> None:
        """Refresh git status for all projects."""
        self._set_status("Refreshing git status...")
        for p in self.projects:
            self._refresh_git_status_for_project(p)
        self._set_status("Git status refreshed")
    
    def _git_update_selected(self) -> None:
        """Git update (add, commit, push) for selected project."""
        p = self._selected_project()
        if not p:
            messagebox.showwarning("Git Update", "Select a project first.")
            return
        
        if not is_git_repo(p.working_dir):
            messagebox.showerror("Git Update", f"{p.name} is not a git repository.")
            return
        
        # Show commit dialog
        dlg = GitCommitDialog(self, p.name, colors=getattr(self, "_colors", None))
        self.wait_window(dlg)
        
        if dlg.result is None:
            return
        
        commit_msg = dlg.result
        self._set_status(f"Updating {p.name}...")
        self._append_log(p.name, f"[git] Starting git update...", tag="info")
        
        success, message = run_git_update(p.working_dir, commit_msg)
        
        if success:
            self._append_log(p.name, f"[git] {message}", tag="ok")
            self._set_status(f"{p.name}: Updated successfully")
        else:
            self._append_log(p.name, f"[git] ERROR: {message}", tag="err")
            self._set_status(f"{p.name}: Update failed")
        
        # Refresh git status
        self._refresh_git_status_for_project(p)
    
    def _git_update_all(self) -> None:
        """Git update all projects with a single commit message."""
        git_projects = [p for p in self.projects if is_git_repo(p.working_dir)]
        
        if not git_projects:
            messagebox.showwarning("Git Update All", "No projects are git repositories.")
            return
        
        # Show commit dialog
        dlg = GitCommitDialog(self, "All Projects", colors=getattr(self, "_colors", None))
        self.wait_window(dlg)
        
        if dlg.result is None:
            return
        
        commit_msg = dlg.result
        self._set_status("Updating all projects...")
        
        results: List[Tuple[str, bool, str]] = []
        
        for p in git_projects:
            self._append_log(p.name, f"[git] Starting git update...", tag="info")
            success, message = run_git_update(p.working_dir, commit_msg)
            results.append((p.name, success, message))
            
            if success:
                self._append_log(p.name, f"[git] {message}", tag="ok")
            else:
                self._append_log(p.name, f"[git] ERROR: {message}", tag="err")
            
            self._refresh_git_status_for_project(p)
        
        # Summary
        success_count = sum(1 for _, ok, _ in results if ok)
        fail_count = len(results) - success_count
        
        if fail_count == 0:
            self._set_status(f"All {success_count} projects updated successfully")
        else:
            self._set_status(f"{success_count} updated, {fail_count} failed")

    def _run_selected(self) -> None:
        p = self._selected_project()
        if not p:
            return
        self._run_project(p)

    def _restart_selected(self) -> None:
        p = self._selected_project()
        if not p:
            return
        self._stop_project(p)
        self.after(800, lambda: self._run_project(p))

    def _stop_selected(self) -> None:
        p = self._selected_project()
        if not p:
            return
        self._stop_project(p)

    def _run_project(self, p: Project) -> None:
        # validate
        if not Path(p.working_dir).exists():
            self._append_log(p.name, f"[error] working_dir does not exist: {p.working_dir}", tag="err")
            self._set_project_status(p.name, "failed")
            self._set_status("Failed: invalid working directory")
            return

        existing = self.handles.get(p.name)
        if existing and existing.popen.poll() is None:
            self._set_status("Already running")
            return

        self._set_project_status(p.name, "starting")
        self._append_log(p.name, f"[info] starting: {p.start_command}", tag="info")

        if p.port and p.kill_port_before_start:
            ok, msg = kill_port(p.port)
            if msg:
                self._append_log(p.name, f"[info] {msg}", tag="info")

        env = os.environ.copy()
        env.update(self._login_shell_env)
        env.update({k: str(v) for k, v in (p.env or {}).items()})
        # Try to resolve the leading command token (e.g. `python3`, `npm`) using
        # the user's login shell so the same interpreter/tools used in Terminal
        # will be used when launching subprocesses from the GUI.
        try:
            m = re.match(r"^\s*([^\s]+)", p.start_command)
            if m:
                cmd0 = m.group(1)
                # if command isn't a path and not already absolute, resolve it
                if "/" not in cmd0:
                    # If command is python/python3, prefer a suitable newer interpreter
                    if cmd0 in ("python3", "python"):
                        candidate = find_suitable_python()
                        if candidate:
                            p_start = re.sub(r"^\s*" + re.escape(cmd0), candidate, p.start_command, count=1)
                        else:
                            # fall back to login-shell resolution
                            found = resolve_in_login_shell(cmd0)
                            p_start = re.sub(r"^\s*" + re.escape(cmd0), found or cmd0, p.start_command, count=1)
                    else:
                        found = resolve_in_login_shell(cmd0)
                        if found:
                            # replace only the first occurrence of the token
                            p_start = re.sub(r"^\s*" + re.escape(cmd0), found, p.start_command, count=1)
                        else:
                            p_start = p.start_command
                else:
                    p_start = p.start_command
            else:
                p_start = p.start_command

            popen = subprocess.Popen(
                ["/bin/zsh", "-lc", p_start],
                shell=False,
                cwd=p.working_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                preexec_fn=os.setsid,
            )
        except Exception as e:
            self._append_log(p.name, f"[error] failed to spawn process: {e}", tag="err")
            self._set_project_status(p.name, "failed")
            self._set_status("Failed to start")
            return

        handle = ProcessHandle(popen=popen, project=p)
        handle.start_readers()
        self.handles[p.name] = handle

        self._set_status("Starting...")
        self.after(800, lambda: self._post_start_check(p))

    def _post_start_check(self, p: Project) -> None:
        h = self.handles.get(p.name)
        if not h:
            return

        code = h.popen.poll()
        if code is not None:
            self._append_log(p.name, f"[error] exited immediately with code {code}", tag="err")
            self._set_project_status(p.name, "failed")
            self._set_status("Failed: process exited")
            return

        if p.port:
            for _ in range(10):
                listening, detail = is_port_listening(p.port)
                if listening:
                    self._append_log(p.name, f"[ok] port {p.port} is listening", tag="ok")
                    self._set_project_status(p.name, "running")
                    self._set_status(f"Running (port {p.port} OK)")
                    return
                time.sleep(0.25)
            self._append_log(p.name, f"[warn] process running but port {p.port} not listening yet", tag="warn")
            self._set_project_status(p.name, "starting")
            self._set_status("Running (waiting for port)")
        else:
            self._set_project_status(p.name, "running")
            self._set_status("Running")

    def _stop_project(self, p: Project) -> None:
        h = self.handles.get(p.name)
        if not h:
            self._set_status("Not running")
            return

        proc = h.popen
        if proc.poll() is not None:
            self._set_project_status(p.name, "stopped")
            self._set_status("Already stopped")
            return

        self._set_project_status(p.name, "stopped")
        self._append_log(p.name, "[info] stopping...", tag="info")
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        except Exception as e:
            self._append_log(p.name, f"[warn] SIGTERM failed: {e}", tag="warn")

        # wait briefly, then force kill
        def finalize():
            if proc.poll() is None:
                try:
                    os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                    self._append_log(p.name, "[info] force killed", tag="info")
                except Exception as e:
                    self._append_log(p.name, f"[error] SIGKILL failed: {e}", tag="err")
            self._set_status("Stopped")

        self.after(800, finalize)

    def _poll_logs(self) -> None:
        for name, handle in list(self.handles.items()):
            while True:
                try:
                    stream_name, line = handle.log_queue.get_nowait()
                except queue.Empty:
                    break
                if stream_name == "stdout":
                    self._append_log(name, f"[stdout] {line}", tag="muted")
                else:
                    self._append_log(name, f"[stderr] {line}", tag="err")

            # show exit event
            code = handle.popen.poll()
            if code is not None:
                # only log once
                if handle.popen.pid not in self._exit_logged_pids:
                    self._exit_logged_pids.add(handle.popen.pid)
                    tag = "ok" if code == 0 else "err"
                    self._append_log(name, f"[info] process exited with code {code}", tag=tag)
                    # set final status
                    self._set_project_status(name, "stopped" if code == 0 else "failed")

        self.after(200, self._poll_logs)


def main() -> None:
    try:
        app = DevRunnerApp()
    except Exception as e:
        messagebox.showerror("Dev Runner", f"Failed to start app: {e}")
        raise
    app.mainloop()


if __name__ == "__main__":
    main()
