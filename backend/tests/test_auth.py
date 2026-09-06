from fastapi.testclient import TestClient

from app.main import app


def test_signup_then_login():
    with TestClient(app) as client:
        signup = client.post("/api/auth/signup", json={"username": "alice", "password": "secret123"})
        assert signup.status_code == 201
        assert signup.json() == {"username": "alice"}

        login = client.post("/api/auth/login", json={"username": "alice", "password": "secret123"})
        assert login.status_code == 200
        assert login.json() == {"username": "alice"}


def test_signup_rejects_duplicate_username():
    with TestClient(app) as client:
        client.post("/api/auth/signup", json={"username": "alice", "password": "secret123"})
        response = client.post("/api/auth/signup", json={"username": "alice", "password": "other-pass"})

    assert response.status_code == 409


def test_login_rejects_wrong_password():
    with TestClient(app) as client:
        client.post("/api/auth/signup", json={"username": "alice", "password": "secret123"})
        response = client.post("/api/auth/login", json={"username": "alice", "password": "wrong"})

    assert response.status_code == 401


def test_login_rejects_unknown_username():
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={"username": "nobody", "password": "secret123"})

    assert response.status_code == 401
