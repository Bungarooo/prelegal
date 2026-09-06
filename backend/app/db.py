"""SQLite setup for the foundation database.

The database is recreated from scratch on every startup, so it holds no
persistent state between container runs.
"""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "app.db"

USERS_TABLE_SQL = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""

DOCUMENT_HISTORY_TABLE_SQL = """
CREATE TABLE document_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    fields_json TEXT NOT NULL,
    markdown TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (username, slug)
)
"""


class UsernameTakenError(Exception):
    """Raised when signing up with a username that already exists."""


def init_db(db_path: Path = DB_PATH) -> None:
    """(Re)create the database file and its schema."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.unlink(missing_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(USERS_TABLE_SQL)
        conn.execute(DOCUMENT_HISTORY_TABLE_SQL)
        conn.commit()
    finally:
        conn.close()


def create_user(username: str, password_hash: str, db_path: Path = DB_PATH) -> None:
    conn = sqlite3.connect(db_path)
    try:
        try:
            conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, password_hash),
            )
            conn.commit()
        except sqlite3.IntegrityError as exc:
            raise UsernameTakenError(username) from exc
    finally:
        conn.close()


def get_password_hash(username: str, db_path: Path = DB_PATH) -> str | None:
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE username = ?", (username,)
        ).fetchone()
    finally:
        conn.close()
    return row[0] if row else None


def save_document_history(
    username: str,
    slug: str,
    name: str,
    fields: dict,
    markdown: str = "",
    db_path: Path = DB_PATH,
) -> None:
    """Upserts the latest snapshot of a user's document of this type."""
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO document_history (username, slug, name, fields_json, markdown, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT (username, slug) DO UPDATE SET
                name = excluded.name,
                fields_json = excluded.fields_json,
                markdown = excluded.markdown,
                updated_at = excluded.updated_at
            """,
            (username, slug, name, json.dumps(fields), markdown),
        )
        conn.commit()
    finally:
        conn.close()


def list_document_history(username: str, db_path: Path = DB_PATH) -> list[dict]:
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute(
            """
            SELECT slug, name, fields_json, markdown, updated_at
            FROM document_history WHERE username = ? ORDER BY updated_at DESC
            """,
            (username,),
        ).fetchall()
    finally:
        conn.close()
    return [
        {
            "slug": slug,
            "name": name,
            "fields": json.loads(fields_json),
            "markdown": markdown,
            "updated_at": updated_at,
        }
        for slug, name, fields_json, markdown, updated_at in rows
    ]
