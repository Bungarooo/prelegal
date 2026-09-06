import sqlite3

from app.db import init_db


def test_init_db_creates_users_table(tmp_path):
    db_path = tmp_path / "test.db"

    init_db(db_path)

    assert db_path.exists()
    conn = sqlite3.connect(db_path)
    try:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
    finally:
        conn.close()
    assert columns == {"id", "email", "password_hash", "created_at"}


def test_init_db_resets_existing_data(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "INSERT INTO users (email, password_hash) VALUES ('a@example.com', 'x')"
        )
        conn.commit()
    finally:
        conn.close()

    init_db(db_path)

    conn = sqlite3.connect(db_path)
    try:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    finally:
        conn.close()
    assert count == 0
