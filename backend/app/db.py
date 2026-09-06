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
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""


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
