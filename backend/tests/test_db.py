import sqlite3

import pytest

from app.db import (
    UsernameTakenError,
    create_user,
    get_password_hash,
    init_db,
    list_document_history,
    save_document_history,
)


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


def test_init_db_creates_document_history_table(tmp_path):
    db_path = tmp_path / "test.db"

    init_db(db_path)

    conn = sqlite3.connect(db_path)
    try:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(document_history)")}
    finally:
        conn.close()
    assert columns == {"id", "username", "slug", "name", "fields_json", "markdown", "updated_at"}


def test_save_document_history_then_list(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)

    save_document_history(
        "alice", "pilot-agreement", "Pilot Agreement", {"customer": "Acme"}, "md v1", db_path
    )

    entries = list_document_history("alice", db_path)

    assert len(entries) == 1
    assert entries[0]["slug"] == "pilot-agreement"
    assert entries[0]["name"] == "Pilot Agreement"
    assert entries[0]["fields"] == {"customer": "Acme"}
    assert entries[0]["markdown"] == "md v1"


def test_save_document_history_upserts_by_username_and_slug(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)

    save_document_history(
        "alice", "pilot-agreement", "Pilot Agreement", {"customer": "Acme"}, "md v1", db_path
    )
    save_document_history(
        "alice",
        "pilot-agreement",
        "Pilot Agreement",
        {"customer": "Acme", "provider": "Globex"},
        "md v2",
        db_path,
    )

    entries = list_document_history("alice", db_path)

    assert len(entries) == 1
    assert entries[0]["fields"] == {"customer": "Acme", "provider": "Globex"}
    assert entries[0]["markdown"] == "md v2"


def test_list_document_history_is_scoped_to_username(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)

    save_document_history("alice", "pilot-agreement", "Pilot Agreement", {}, db_path=db_path)
    save_document_history("bob", "pilot-agreement", "Pilot Agreement", {}, db_path=db_path)

    assert len(list_document_history("alice", db_path)) == 1
    assert len(list_document_history("bob", db_path)) == 1


def test_list_document_history_for_unknown_user_is_empty(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)

    assert list_document_history("nobody", db_path) == []
