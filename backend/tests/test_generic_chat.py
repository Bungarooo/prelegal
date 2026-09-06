from types import SimpleNamespace

from fastapi.testclient import TestClient

from app import documents, generic_chat as generic_chat_module
from app.main import app

SLUG = "pilot-agreement"


def fake_completion(payload_json: str):
    def _fake_completion(**kwargs):
        _fake_completion.last_kwargs = kwargs
        message = SimpleNamespace(content=payload_json)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    return _fake_completion


def _extraction_json(reply: str, fields: dict) -> str:
    import json

    return json.dumps({"reply": reply, "fields": fields})


def test_list_documents_covers_full_catalog_once():
    with TestClient(app) as client:
        response = client.get("/api/documents")

    assert response.status_code == 200
    slugs = [doc["slug"] for doc in response.json()]
    assert slugs.count("mutual-nda") == 1
    assert "cloud-service-agreement" in slugs


def test_render_document_returns_a_blank_preview_with_no_fields():
    with TestClient(app) as client:
        response = client.post(f"/api/documents/{SLUG}/render", json={})

    assert response.status_code == 200
    body = response.json()
    assert "[Customer]" in body["markdown"]
    assert "## Order Form" in body["markdown"]


def test_render_document_fills_in_given_fields():
    spec = documents.get_document_spec(SLUG)
    key_map = documents.field_key_map(spec.terms)
    customer_key = next(k for k, term in key_map.items() if term == "Customer")

    with TestClient(app) as client:
        response = client.post(
            f"/api/documents/{SLUG}/render", json={"fields": {customer_key: "Acme, Inc."}}
        )

    assert "Acme, Inc." in response.json()["markdown"]


def test_render_document_rejects_the_nda_slug():
    with TestClient(app) as client:
        response = client.post("/api/documents/mutual-nda/render", json={})
    assert response.status_code == 404


def test_render_document_rejects_unknown_slug():
    with TestClient(app) as client:
        response = client.post("/api/documents/not-a-document/render", json={})
    assert response.status_code == 404


def test_generic_chat_rejects_the_nda_slug():
    with TestClient(app) as client:
        response = client.post(
            "/api/documents/mutual-nda/chat", json={"messages": [], "fields": {}}
        )
    assert response.status_code == 404


def test_generic_chat_rejects_unknown_slug():
    with TestClient(app) as client:
        response = client.post(
            "/api/documents/not-a-document/chat", json={"messages": [], "fields": {}}
        )
    assert response.status_code == 404


def test_generic_chat_extracts_mentioned_field_and_stays_incomplete(monkeypatch):
    spec = documents.get_document_spec(SLUG)
    key_map = documents.field_key_map(spec.terms)
    customer_key = next(k for k, term in key_map.items() if term == "Customer")

    monkeypatch.setattr(
        generic_chat_module,
        "completion",
        fake_completion(_extraction_json("Nice to meet you!", {customer_key: "Acme, Inc."})),
    )

    with TestClient(app) as client:
        response = client.post(
            f"/api/documents/{SLUG}/chat",
            json={"messages": [{"role": "user", "content": "The customer is Acme, Inc."}], "fields": {}},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["fields"][customer_key] == "Acme, Inc."
    assert body["complete"] is False
    assert "Acme, Inc." in body["markdown"]


def test_generic_chat_merges_onto_existing_fields(monkeypatch):
    spec = documents.get_document_spec(SLUG)
    key_map = documents.field_key_map(spec.terms)
    customer_key = next(k for k, term in key_map.items() if term == "Customer")
    provider_key = next(k for k, term in key_map.items() if term == "Provider")

    monkeypatch.setattr(
        generic_chat_module,
        "completion",
        fake_completion(_extraction_json("Got it.", {provider_key: "Globex"})),
    )

    with TestClient(app) as client:
        response = client.post(
            f"/api/documents/{SLUG}/chat",
            json={"messages": [], "fields": {customer_key: "Acme, Inc."}},
        )

    body = response.json()
    assert body["fields"][customer_key] == "Acme, Inc."
    assert body["fields"][provider_key] == "Globex"


def test_generic_chat_reports_complete_once_every_field_is_known(monkeypatch):
    spec = documents.get_document_spec(SLUG)
    key_map = documents.field_key_map(spec.terms)
    all_filled = {key: f"value-{key}" for key in key_map}

    monkeypatch.setattr(
        generic_chat_module, "completion", fake_completion(_extraction_json("Got it.", {}))
    )

    with TestClient(app) as client:
        response = client.post(
            f"/api/documents/{SLUG}/chat", json={"messages": [], "fields": all_filled}
        )

    body = response.json()
    assert body["complete"] is True
    assert "ready to download" in body["reply"]
    for term in key_map.values():
        assert f"[{term}]" not in body["markdown"]


def test_generic_chat_appends_a_question_when_incomplete(monkeypatch):
    monkeypatch.setattr(
        generic_chat_module, "completion", fake_completion(_extraction_json("Got it, thanks!", {}))
    )

    with TestClient(app) as client:
        response = client.post(f"/api/documents/{SLUG}/chat", json={"messages": [], "fields": {}})

    body = response.json()
    assert body["complete"] is False
    assert body["reply"].startswith("Got it, thanks!")
    assert body["reply"].endswith("?")


def test_route_document_returns_matched_slug(monkeypatch):
    payload = {
        "matched_slug": "cloud-service-agreement",
        "suggested_slug": "cloud-service-agreement",
        "reply": "Let's set up your Cloud Service Agreement.",
    }
    import json

    monkeypatch.setattr(
        generic_chat_module, "completion", fake_completion(json.dumps(payload))
    )

    with TestClient(app) as client:
        response = client.post("/api/documents/route", json={"message": "I need a SaaS agreement"})

    assert response.status_code == 200
    body = response.json()
    assert body["matched_slug"] == "cloud-service-agreement"


def test_route_document_clamps_invalid_slugs_from_the_model(monkeypatch):
    payload = {
        "matched_slug": "employment-agreement",  # not in our catalog
        "suggested_slug": "not-a-real-slug",
        "reply": "We can't generate an employment agreement.",
    }
    import json

    monkeypatch.setattr(
        generic_chat_module, "completion", fake_completion(json.dumps(payload))
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/documents/route", json={"message": "I need an employment agreement"}
        )

    body = response.json()
    assert body["matched_slug"] is None
    assert body["suggested_slug"] == generic_chat_module.load_document_specs()[0].slug
