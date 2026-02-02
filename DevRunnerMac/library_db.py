from __future__ import annotations

import shutil
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path


APP_NAME = "DevRunner"


def app_data_dir() -> Path:
    base = Path.home() / "Library" / "Application Support" / APP_NAME
    base.mkdir(parents=True, exist_ok=True)
    return base


def db_path() -> Path:
    return app_data_dir() / "library.sqlite3"


def storage_dir() -> Path:
    d = app_data_dir() / "storage"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project TEXT NOT NULL,
              category TEXT NOT NULL,
              kind TEXT NOT NULL,           -- note | file | image
              title TEXT NOT NULL,
              body TEXT,
              file_path TEXT,
              created_at INTEGER NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_items_project ON items(project)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_items_kind ON items(kind)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)")


@dataclass
class Item:
    id: int
    project: str
    category: str
    kind: str
    title: str
    body: str | None
    file_path: str | None
    created_at: int


def list_categories(project: str) -> list[str]:
    init_db()
    with _conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT category FROM items WHERE project=? ORDER BY category COLLATE NOCASE",
            (project,),
        ).fetchall()
    return [r["category"] for r in rows]


def list_items(
    project: str,
    search: str = "",
    category: str = "",
    kind: str = "",
) -> list[Item]:
    init_db()
    q = "SELECT * FROM items WHERE project=?"
    args: list[object] = [project]

    if category and category != "All":
        q += " AND category=?"
        args.append(category)

    if kind and kind != "All":
        q += " AND kind=?"
        args.append(kind)

    if search:
        q += " AND (title LIKE ? OR body LIKE ? OR category LIKE ?)"
        like = f"%{search}%"
        args.extend([like, like, like])

    q += " ORDER BY created_at DESC"

    with _conn() as conn:
        rows = conn.execute(q, tuple(args)).fetchall()

    return [
        Item(
            id=int(r["id"]),
            project=str(r["project"]),
            category=str(r["category"]),
            kind=str(r["kind"]),
            title=str(r["title"]),
            body=(None if r["body"] is None else str(r["body"])),
            file_path=(None if r["file_path"] is None else str(r["file_path"])),
            created_at=int(r["created_at"]),
        )
        for r in rows
    ]


def get_item(item_id: int) -> Item | None:
    init_db()
    with _conn() as conn:
        r = conn.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone()
        if not r:
            return None
        return Item(
            id=int(r["id"]),
            project=str(r["project"]),
            category=str(r["category"]),
            kind=str(r["kind"]),
            title=str(r["title"]),
            body=(None if r["body"] is None else str(r["body"])),
            file_path=(None if r["file_path"] is None else str(r["file_path"])),
            created_at=int(r["created_at"]),
        )


def add_note(project: str, category: str, title: str, body: str) -> int:
    init_db()
    now = int(time.time())
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO items(project, category, kind, title, body, file_path, created_at) VALUES(?,?,?,?,?,?,?)",
            (project, category, "note", title, body, None, now),
        )
        return int(cur.lastrowid)


def add_file(project: str, category: str, title: str, source_path: str, kind: str) -> int:
    init_db()
    if kind not in {"file", "image"}:
        raise ValueError("kind must be 'file' or 'image'")

    src = Path(source_path)
    if not src.exists():
        raise FileNotFoundError(source_path)

    now = int(time.time())
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO items(project, category, kind, title, body, file_path, created_at) VALUES(?,?,?,?,?,?,?)",
            (project, category, kind, title, None, "", now),
        )
        item_id = int(cur.lastrowid)

        ext = src.suffix
        safe_project = "".join(ch for ch in project if ch.isalnum() or ch in "-_ ").strip() or "Project"
        dest_dir = storage_dir() / safe_project
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{item_id}{ext}"
        shutil.copy2(src, dest)

        conn.execute("UPDATE items SET file_path=? WHERE id=?", (str(dest), item_id))

    return item_id


def delete_item(item_id: int) -> None:
    init_db()
    item = get_item(item_id)
    if item and item.file_path:
        try:
            Path(item.file_path).unlink(missing_ok=True)
        except Exception:
            pass

    with _conn() as conn:
        conn.execute("DELETE FROM items WHERE id=?", (item_id,))
