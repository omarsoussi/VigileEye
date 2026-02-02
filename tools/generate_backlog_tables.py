#!/usr/bin/env python3
"""Generate a short, table-only summary from JIRA_PRODUCT_BACKLOG.md.

Output is Markdown with:
- One Product Backlog table listing the 4 sprints
- One table per sprint listing tasks (title, short description, priority, type)

Type is inferred from the task title.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

SPRINT_RE = re.compile(r"^#\s+📅\s*SPRINT\s+(\d+)\s*:\s*(.+?)\s*$")
TASK_RE = re.compile(r"^###\s+([0-9]+\.[0-9]+)\s+—\s+(.+?)\s*$")
PRIO_RE = re.compile(r"^\*\*Priority\*\*:\s*(.+?)\s*$")
DESC_RE = re.compile(r"^\*\*Description\*\*:\s*(.+?)\s*$")


@dataclass
class Sprint:
    number: int
    title: str
    description: str


@dataclass
class Task:
    sprint_number: int
    code: str
    title: str
    priority: str
    description: str


def normalize_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def infer_type(title: str) -> str:
    t = title.strip()
    low = t.lower()

    if t.startswith("Frontend:") or "— Frontend:" in t or low.startswith("frontend"):
        return "Frontend"
    if "unit tests" in low or "integration tests" in low or low.startswith("tests"):
        return "Testing"
    if "documentation" in low:
        return "Documentation"
    return "Backend"


def shorten(text: str, max_words: int = 12) -> str:
    text = normalize_spaces(text)
    if not text:
        return ""
    words = text.split(" ")
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]).rstrip(".,;:") + "…"


def parse(md: str) -> Tuple[List[Sprint], Dict[int, List[Task]]]:
    lines = md.splitlines()

    # Sprint descriptions
    sprints: List[Sprint] = []
    cur_sprint: Optional[Tuple[int, str]] = None
    cur_desc: List[str] = []
    collect = False

    for line in lines:
        sm = SPRINT_RE.match(line)
        if sm:
            if cur_sprint is not None:
                sprints.append(Sprint(cur_sprint[0], cur_sprint[1], normalize_spaces(" ".join(cur_desc))))
            cur_sprint = (int(sm.group(1)), sm.group(2).strip())
            cur_desc = []
            collect = False
            continue

        if cur_sprint is None:
            continue

        if line.strip() == "## Sprint Description":
            collect = True
            continue

        if collect:
            if line.startswith("**") or line.startswith("---") or line.startswith("## "):
                collect = False
                continue
            if line.strip():
                cur_desc.append(line.strip())

    if cur_sprint is not None:
        sprints.append(Sprint(cur_sprint[0], cur_sprint[1], normalize_spaces(" ".join(cur_desc))))

    tasks_by_sprint: Dict[int, List[Task]] = {s.number: [] for s in sprints}

    cur_num: Optional[int] = None
    i = 0
    while i < len(lines):
        line = lines[i]

        sm = SPRINT_RE.match(line)
        if sm:
            cur_num = int(sm.group(1))
            i += 1
            continue

        tm = TASK_RE.match(line)
        if tm and cur_num is not None:
            code = tm.group(1)
            title = tm.group(2).strip()
            priority = ""
            desc = ""

            j = i + 1
            while j < len(lines):
                if TASK_RE.match(lines[j]) or SPRINT_RE.match(lines[j]) or lines[j].startswith("## 📈 Sprint Summary"):
                    break
                pm = PRIO_RE.match(lines[j])
                if pm:
                    priority = pm.group(1).strip()
                dm = DESC_RE.match(lines[j])
                if dm and not desc:
                    desc = dm.group(1).strip()
                j += 1

            tasks_by_sprint[cur_num].append(Task(cur_num, code, title, priority, desc))
            i = j
            continue

        i += 1

    return sprints, tasks_by_sprint


def main() -> int:
    src = Path("/Users/mac/Desktop/PFE/JIRA_PRODUCT_BACKLOG.md").read_text(encoding="utf-8")
    sprints, tasks_by_sprint = parse(src)

    out: List[str] = []
    out.append("# VigileEye — Product Backlog (Short)\n")

    out.append("## Product Backlog\n")
    out.append("| Sprint | Title | Priority | Type | Description |")
    out.append("|---|---|---|---|---|")

    for s in sorted(sprints, key=lambda x: x.number):
        sprint_priority = "Highest" if s.number in (1, 2) else "High"
        out.append(
            f"| Sprint {s.number} | {s.title} | {sprint_priority} | Sprint | {shorten(s.description, 14)} |"
        )

    for s in sorted(sprints, key=lambda x: x.number):
        out.append("\n---\n")
        out.append(f"## Sprint {s.number} — {s.title}\n")
        out.append("| Type | Title | Priority | Description |")
        out.append("|---|---|---|---|")

        for t in tasks_by_sprint.get(s.number, []):
            out.append(
                f"| {infer_type(t.title)} | {t.code} — {t.title} | {t.priority or '—'} | {shorten(t.description, 14)} |"
            )

    out.append("\n")
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
