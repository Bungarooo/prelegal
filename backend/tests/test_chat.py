from types import SimpleNamespace

from fastapi.testclient import TestClient

from app import chat as chat_module
from app.main import app

COMPLETE_FIELDS = {
    "party1": {"name": "Alice", "title": "CEO", "company": "Acme", "noticeAddress": "alice@acme.com"},
    "party2": {"name": "Bob", "title": "CTO", "company": "Globex", "noticeAddress": "bob@globex.com"},
    "governingLaw": "Delaware",
    "jurisdiction": "New Castle, DE",
}


def fake_completion(extraction: chat_module.ChatExtraction):
    def _fake_completion(**kwargs):
        _fake_completion.last_kwargs = kwargs
        message = SimpleNamespace(content=extraction.model_dump_json())
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    return _fake_completion


def test_chat_extracts_mentioned_fields(monkeypatch):
    extraction = chat_module.ChatExtraction(
        reply="Nice to meet you, Alice!",
        fields=chat_module.NdaFieldsUpdate(party1=chat_module.PartyFields(name="Alice")),
    )
    monkeypatch.setattr(chat_module, "completion", fake_completion(extraction))

    with TestClient(app) as client:
        response = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "My name is Alice"}],
                "fields": {},
                "username": "alice",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["fields"]["party1"]["name"] == "Alice"
    assert body["fields"]["party2"] is None
    assert body["fields"]["purpose"] is None
    assert body["complete"] is False


def test_chat_leaves_fields_null_when_nothing_mentioned(monkeypatch):
    extraction = chat_module.ChatExtraction(
        reply="Hi! Let's get started.", fields=chat_module.NdaFieldsUpdate()
    )
    monkeypatch.setattr(chat_module, "completion", fake_completion(extraction))

    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "fields": {}, "username": "alice"})

    body = response.json()
    assert all(value is None for value in body["fields"].values())


def test_chat_includes_known_fields_in_the_prompt(monkeypatch):
    extraction = chat_module.ChatExtraction(reply="ok", fields=chat_module.NdaFieldsUpdate())
    fake = fake_completion(extraction)
    monkeypatch.setattr(chat_module, "completion", fake)

    with TestClient(app) as client:
        client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "fields": {"purpose": "testing"},
                "username": "alice",
            },
        )

    system_message = fake.last_kwargs["messages"][0]
    assert system_message["role"] == "system"
    assert "testing" in system_message["content"]


def test_chat_appends_a_question_when_the_ai_forgets_to_ask_one(monkeypatch):
    extraction = chat_module.ChatExtraction(
        reply="Got it, thanks!", fields=chat_module.NdaFieldsUpdate()
    )
    monkeypatch.setattr(chat_module, "completion", fake_completion(extraction))

    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "fields": {}, "username": "alice"})

    body = response.json()
    assert body["complete"] is False
    assert body["reply"].startswith("Got it, thanks!")
    assert body["reply"].endswith("?")


def test_chat_does_not_duplicate_a_question_the_ai_already_asked(monkeypatch):
    extraction = chat_module.ChatExtraction(
        reply="Got it! What's Party 2's company?", fields=chat_module.NdaFieldsUpdate()
    )
    monkeypatch.setattr(chat_module, "completion", fake_completion(extraction))

    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [], "fields": {}, "username": "alice"})

    body = response.json()
    assert body["reply"] == "Got it! What's Party 2's company?"


def test_chat_reports_complete_once_every_required_field_is_known(monkeypatch):
    extraction = chat_module.ChatExtraction(
        reply="Got it, thanks!", fields=chat_module.NdaFieldsUpdate()
    )
    monkeypatch.setattr(chat_module, "completion", fake_completion(extraction))

    with TestClient(app) as client:
        response = client.post(
            "/api/chat", json={"messages": [], "fields": COMPLETE_FIELDS, "username": "alice"}
        )

    body = response.json()
    assert body["complete"] is True
    assert "ready to download" in body["reply"]
    assert "sign" in body["reply"].lower()


def test_chat_considers_fields_extracted_this_turn_towards_completeness(monkeypatch):
    # Only jurisdiction is missing from COMPLETE_FIELDS; the AI extracting it this turn
    # should be enough to flip complete to True, even though the request fields don't have it yet.
    fields_missing_jurisdiction = {k: v for k, v in COMPLETE_FIELDS.items() if k != "jurisdiction"}
    extraction = chat_module.ChatExtraction(
        reply="Got it, thanks!",
        fields=chat_module.NdaFieldsUpdate(jurisdiction="New Castle, DE"),
    )
    monkeypatch.setattr(chat_module, "completion", fake_completion(extraction))

    with TestClient(app) as client:
        response = client.post(
            "/api/chat",
            json={"messages": [], "fields": fields_missing_jurisdiction, "username": "alice"},
        )

    assert response.json()["complete"] is True


def test_chat_saves_merged_fields_to_document_history(monkeypatch):
    extraction = chat_module.ChatExtraction(
        reply="Nice to meet you, Alice!",
        fields=chat_module.NdaFieldsUpdate(party1=chat_module.PartyFields(name="Alice")),
    )
    monkeypatch.setattr(chat_module, "completion", fake_completion(extraction))

    with TestClient(app) as client:
        client.post(
            "/api/chat",
            json={"messages": [], "fields": {"purpose": "testing"}, "username": "alice"},
        )

        history = chat_module.db.list_document_history("alice")

    assert len(history) == 1
    assert history[0]["slug"] == "mutual-nda"
    assert history[0]["fields"]["party1"]["name"] == "Alice"
    assert history[0]["fields"]["purpose"] == "testing"


def test_merge_fields_merges_nested_party_dicts():
    current = {"party1": {"name": "Alice", "title": "CEO"}, "purpose": "testing"}
    update = chat_module.NdaFieldsUpdate(party1=chat_module.PartyFields(company="Acme"))

    merged = chat_module.merge_fields(current, update)

    assert merged == {"party1": {"name": "Alice", "title": "CEO", "company": "Acme"}, "purpose": "testing"}
