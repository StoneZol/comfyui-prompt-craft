"""SQLite library: layout presets (empty slots) and category shelves."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from typing import Dict, List, Optional, Tuple

_lock = threading.Lock()

UNCATEGORISED_NAME = "Uncategorised"


def _db_path() -> str:
    directory = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(directory, exist_ok=True)
    return os.path.join(directory, "presets.sqlite")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def _table_columns(conn: sqlite3.Connection, table: str) -> set:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}


def _migrate(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL COLLATE NOCASE,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(name)
        );

        CREATE TABLE IF NOT EXISTS presets (
            id INTEGER PRIMARY KEY,
            category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            title TEXT NOT NULL COLLATE NOCASE,
            description TEXT NOT NULL DEFAULT '',
            positive TEXT NOT NULL DEFAULT '',
            negative TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(category_id, title)
        );

        CREATE TABLE IF NOT EXISTS layout_folders (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL COLLATE NOCASE,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(name)
        );

        CREATE TABLE IF NOT EXISTS layouts (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL COLLATE NOCASE,
            description TEXT NOT NULL DEFAULT '',
            slots TEXT NOT NULL,
            folder_id INTEGER REFERENCES layout_folders(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(name)
        );
        """
    )
    cols = _table_columns(conn, "layouts")
    if "folder_id" not in cols:
        conn.execute(
            "ALTER TABLE layouts ADD COLUMN folder_id INTEGER REFERENCES layout_folders(id) ON DELETE SET NULL"
        )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_layouts_folder_id ON layouts(folder_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_layouts_name ON layouts(name)")


def init_db() -> None:
    with _lock:
        conn = _connect()
        try:
            _migrate(conn)
            conn.commit()
        finally:
            conn.close()


def _get_or_create_category(conn: sqlite3.Connection, name: str) -> Tuple[int, bool]:
    row = conn.execute(
        "SELECT id FROM categories WHERE name = ? COLLATE NOCASE",
        (name,),
    ).fetchone()
    if row:
        return int(row["id"]), False
    cur = conn.execute("INSERT INTO categories (name) VALUES (?)", (name,))
    return int(cur.lastrowid), True


def _normalize_folder_name(name: str) -> str:
    return (name or "").strip()


def _is_uncategorised(name: str) -> bool:
    return not name or name.casefold() == UNCATEGORISED_NAME.casefold()


def _get_or_create_folder(conn: sqlite3.Connection, name: str) -> Optional[int]:
    title = _normalize_folder_name(name)
    if _is_uncategorised(title):
        return None
    row = conn.execute(
        "SELECT id FROM layout_folders WHERE name = ? COLLATE NOCASE",
        (title,),
    ).fetchone()
    if row:
        return int(row["id"])
    cur = conn.execute("INSERT INTO layout_folders (name) VALUES (?)", (title,))
    return int(cur.lastrowid)


def _parse_slots(raw) -> List[str]:
    if isinstance(raw, list):
        data = raw
    else:
        try:
            data = json.loads(raw or "[]")
        except Exception:
            return []
    slots = []
    seen = set()
    for item in data if isinstance(data, list) else []:
        name = str(item).strip()
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        slots.append(name)
    return slots


def _layout_row(row: sqlite3.Row) -> Dict:
    folder = row["folder"] if "folder" in row.keys() else None
    return {
        "id": int(row["id"]),
        "name": row["name"],
        "description": row["description"] or "",
        "slots": _parse_slots(row["slots"]),
        "folder": folder or "",
    }


def save_layout(
    name: str,
    description: str,
    slots: List,
    overwrite: bool = False,
    folder: str = "",
) -> Dict:
    title = (name or "").strip()
    slot_names = _parse_slots(slots)
    if not title:
        return {"ok": False, "error": "Name is required"}
    if not slot_names:
        return {"ok": False, "error": "Add a group first"}

    with _lock:
        conn = _connect()
        try:
            conn.execute("BEGIN")
            created_categories = []
            for slot in slot_names:
                _cat_id, created = _get_or_create_category(conn, slot)
                if created:
                    created_categories.append(slot)

            folder_id = _get_or_create_folder(conn, folder)
            folder_name = ""
            if folder_id:
                folder_row = conn.execute(
                    "SELECT name FROM layout_folders WHERE id = ?",
                    (folder_id,),
                ).fetchone()
                folder_name = folder_row["name"] if folder_row else _normalize_folder_name(folder)

            existing = conn.execute(
                "SELECT id FROM layouts WHERE name = ? COLLATE NOCASE",
                (title,),
            ).fetchone()
            if existing and not overwrite:
                conn.rollback()
                return {"ok": False, "conflicts": [{"name": title}]}

            payload = json.dumps(slot_names, ensure_ascii=False)
            note = (description or "").strip()
            if existing:
                conn.execute(
                    """
                    UPDATE layouts
                    SET description = ?, slots = ?, folder_id = ?, updated_at = datetime('now')
                    WHERE id = ?
                    """,
                    (note, payload, folder_id, int(existing["id"])),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO layouts (name, description, slots, folder_id)
                    VALUES (?, ?, ?, ?)
                    """,
                    (title, note, payload, folder_id),
                )
            conn.commit()
            return {
                "ok": True,
                "name": title,
                "slots": slot_names,
                "folder": folder_name,
                "created_categories": created_categories,
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def list_layouts() -> Dict:
    with _lock:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT
                    layouts.id,
                    layouts.name,
                    layouts.description,
                    layouts.slots,
                    layout_folders.name AS folder
                FROM layouts
                LEFT JOIN layout_folders ON layout_folders.id = layouts.folder_id
                ORDER BY
                    CASE WHEN layout_folders.name IS NULL THEN 0 ELSE 1 END,
                    layout_folders.name COLLATE NOCASE,
                    layouts.name COLLATE NOCASE
                """
            ).fetchall()
            return {"ok": True, "layouts": [_layout_row(row) for row in rows]}
        finally:
            conn.close()


def list_layout_folders() -> Dict:
    with _lock:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT name
                FROM layout_folders
                ORDER BY name COLLATE NOCASE
                """
            ).fetchall()
            return {
                "ok": True,
                "folders": [row["name"] for row in rows],
                "uncategorised": UNCATEGORISED_NAME,
            }
        finally:
            conn.close()
