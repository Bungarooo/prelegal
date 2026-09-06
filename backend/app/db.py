"""SQLite setup for the foundation database.

The database is recreated from scratch on every startup, so it holds no
persistent state between container runs.
"""

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


class UsernameTakenError(Exception):
    """Raised when signing up with a username that already exists."""


def init_db(db_path: Path = DB_PATH) -> None:
    """(Re)create the database file and its schema."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.unlink(missing_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(USERS_TABLE_SQL)
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
