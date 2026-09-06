import sqlite3

import pytest

from app.db import UsernameTakenError, create_user, get_password_hash, init_db


def test_init_db_creates_users_table(tmp_path):
    db_path = tmp_path / "test.db"

    init_db(db_path)

    assert db_path.exists()
    conn = sqlite3.connect(db_path)
    try:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
    finally:
        conn.close()
    assert columns == {"id", "username", "password_hash", "created_at"}


def test_init_db_resets_existing_data(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES ('alice', 'x')"
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


def test_create_and_look_up_user(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)

    create_user("alice", "hashed-password", db_path)

    assert get_password_hash("alice", db_path) == "hashed-password"


def test_get_password_hash_for_unknown_user(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)

    assert get_password_hash("nobody", db_path) is None


def test_create_user_rejects_duplicate_username(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)
    create_user("alice", "hashed-password", db_path)

    with pytest.raises(UsernameTakenError):
        create_user("alice", "another-hash", db_path)
