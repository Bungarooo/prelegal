import json
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app import chat as chat_module
from app.main import app


def fake_completion(result: chat_module.ChatTurnResult):
    def _fake_completion(**kwargs):
        _fake_completion.last_kwargs = kwargs
        message = SimpleNamespace(content=result.model_dump_json())
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    return _fake_completion


def test_chat_extracts_mentioned_fields(monkeypatch):
    result = chat_module.ChatTurnResult(
        reply="Nice to meet you, Alice! What's the purpose of this NDA?",
        fields=chat_module.NdaFieldsUpdate(party1=chat_module.PartyFields(name="Alice")),
    )
    monkeypatch.setattr(chat_module, "completion", fake_completion(result))

    with TestClient(app) as client:
        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "My name is Alice"}], "fields": {}},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Nice to meet you, Alice! What's the purpose of this NDA?"
    assert body["fields"]["party1"]["name"] == "Alice"
    assert body["fields"]["party2"] is None
    assert body["fields"]["purpose"] is None


def test_chat_leaves_fields_null_when_nothing_mentioned(monkeypatch):
    result = chat_module.ChatTurnResult(
        reply="Hi! Let's get started — what's this NDA for?",
        fields=chat_module.NdaFieldsUpdate(),
    )
    monkeypatch.setattr(chat_module, "completion", fake_completion(result))

    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "fields": {}})

    body = response.json()
    assert all(value is None for value in body["fields"].values())


def test_chat_includes_known_fields_in_the_prompt(monkeypatch):
    result = chat_module.ChatTurnResult(reply="ok", fields=chat_module.NdaFieldsUpdate())
    fake = fake_completion(result)
    monkeypatch.setattr(chat_module, "completion", fake)

    with TestClient(app) as client:
        client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "fields": {"purpose": "testing"}},
        )

    system_message = fake.last_kwargs["messages"][0]
    assert system_message["role"] == "system"
    assert "testing" in system_message["content"]
