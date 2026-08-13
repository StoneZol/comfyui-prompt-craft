"""SQLite library: layout presets (empty slots) and category shelves."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from typing import Dict, List, Tuple

_lock = threading.Lock()


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


def init_db() -> None:
    with _lock:
        conn = _connect()
        try:
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

                CREATE TABLE IF NOT EXISTS layouts (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL COLLATE NOCASE,
                    description TEXT NOT NULL DEFAULT '',
                    slots TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                    UNIQUE(name)
                );
                """
            )
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
    return {
        "id": int(row["id"]),
        "name": row["name"],
        "description": row["description"] or "",
        "slots": _parse_slots(row["slots"]),
    }


def save_layout(name: str, description: str, slots: List, overwrite: bool = False) -> Dict:
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
                    SET description = ?, slots = ?, updated_at = datetime('now')
                    WHERE id = ?
                    """,
                    (note, payload, int(existing["id"])),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO layouts (name, description, slots)
                    VALUES (?, ?, ?)
                    """,
                    (title, note, payload),
                )
            conn.commit()
            return {
                "ok": True,
                "name": title,
                "slots": slot_names,
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
                SELECT id, name, description, slots
                FROM layouts
                ORDER BY name COLLATE NOCASE
                """
            ).fetchall()
            return {"ok": True, "layouts": [_layout_row(row) for row in rows]}
        finally:
            conn.close()
