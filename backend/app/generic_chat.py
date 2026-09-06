"""Chat + routing endpoints for the 11 catalog document types that use the
generic term-extraction engine in `app/documents.py` (the Mutual NDA keeps its
own hand-built flow in `app/chat.py`)."""

import json
from typing import Literal

from fastapi import APIRouter, HTTPException
from litellm import completion
from pydantic import BaseModel, create_model

from app.documents import (
    NDA_SLUG,
    DocumentSpec,
    field_key_map,
    get_document_spec,
    load_document_specs,
    render_document_markdown,
)

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

router = APIRouter(prefix="/api/documents")

COMPLETION_NOTICE = (
    "The document is complete and ready to download! A couple of things I can't do for you: "
    "the parties still need to sign it by hand, and you may want a lawyer to review the "
    "document before signing."
)


class DocumentSummary(BaseModel):
    slug: str
    name: str
    description: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class GenericChatRequest(BaseModel):
    messages: list[ChatMessage]
    fields: dict[str, str | None] = {}


class GenericChatResult(BaseModel):
    reply: str
    fields: dict[str, str | None]
    complete: bool
    markdown: str


class RenderRequest(BaseModel):
    fields: dict[str, str | None] = {}


class RenderResult(BaseModel):
    markdown: str


class RouteRequest(BaseModel):
    message: str


class RouteResult(BaseModel):
    matched_slug: str | None
    suggested_slug: str
    reply: str


@router.get("")
def list_documents() -> list[DocumentSummary]:
    return [
        DocumentSummary(slug=spec.slug, name=spec.name, description=spec.description)
        for spec in load_document_specs()
    ]


def _build_extraction_model(key_map: dict[str, str]) -> type[BaseModel]:
    fields_model = create_model(
        "GenericFieldsUpdate", **{key: (str | None, None) for key in key_map}
    )
    return create_model("GenericChatExtraction", reply=(str, ...), fields=(fields_model, ...))


def _system_prompt(spec: DocumentSpec, key_map: dict[str, str], known: dict[str, str | None]) -> str:
    field_list = "\n".join(f"- {term}" for term in key_map.values())
    return (
        f"You are helping a user fill in a {spec.name} through conversation.\n\n"
        f"The {spec.name} has these fields:\n{field_list}\n\n"
        "Ask about one or two related fields at a time, in a natural, conversational way. "
        "Don't ask about fields that are already filled in unless the user brings them up. "
        "When the user gives you information, extract it into the `fields` output, leaving "
        "anything not mentioned as null. Keep replies brief and friendly, acknowledging what "
        f"the user just said.\n\nAlready known: {json.dumps(known)}"
    )


def _next_missing_field(key_map: dict[str, str], values: dict[str, str | None]) -> str | None:
    for key, term in key_map.items():
        value = values.get(key)
        if not (isinstance(value, str) and value.strip()):
            return term
    return None


@router.post("/{slug}/chat")
def generic_chat(slug: str, request: GenericChatRequest) -> GenericChatResult:
    if slug == NDA_SLUG:
        raise HTTPException(status_code=404, detail="Use /api/chat for the Mutual NDA")
    spec = get_document_spec(slug)
    if spec is None:
        raise HTTPException(status_code=404, detail="Unknown document type")

    key_map = field_key_map(spec.terms)
    extraction_model = _build_extraction_model(key_map)

    messages = [
        {"role": "system", "content": _system_prompt(spec, key_map, request.fields)},
        *[{"role": m.role, "content": m.content} for m in request.messages],
    ]
    response = completion(
        model=MODEL,
        messages=messages,
        response_format=extraction_model,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    extraction = extraction_model.model_validate_json(response.choices[0].message.content)
    extracted_fields: dict[str, str | None] = extraction.fields.model_dump()

    merged = {**request.fields, **{k: v for k, v in extracted_fields.items() if v is not None}}
    missing_term = _next_missing_field(key_map, merged)

    reply = extraction.reply.strip()
    if missing_term is None:
        reply = f"{reply}\n\n{COMPLETION_NOTICE}"
    elif not reply.endswith("?"):
        reply = f"{reply} What's the value for {missing_term}?"

    return GenericChatResult(
        reply=reply,
        fields=merged,
        complete=missing_term is None,
        markdown=render_document_markdown(spec, merged),
    )


@router.post("/{slug}/render")
def render_document(slug: str, request: RenderRequest) -> RenderResult:
    """Renders a document with no LLM call, e.g. to show a blank preview before chatting."""
    if slug == NDA_SLUG:
        raise HTTPException(status_code=404, detail="Use lib/nda.ts for the Mutual NDA")
    spec = get_document_spec(slug)
    if spec is None:
        raise HTTPException(status_code=404, detail="Unknown document type")
    return RenderResult(markdown=render_document_markdown(spec, request.fields))


@router.post("/route")
def route_document(request: RouteRequest) -> RouteResult:
    specs = load_document_specs()
    valid_slugs = {spec.slug for spec in specs}
    catalog_text = "\n".join(f"- {spec.slug}: {spec.name} — {spec.description}" for spec in specs)

    system_prompt = (
        "You route a user's request to the closest matching template in a fixed legal "
        f"document catalog. The catalog has exactly these {len(specs)} entries (use the "
        "slug on the left):\n"
        f"{catalog_text}\n\n"
        "Decide: matched_slug is the catalog slug that genuinely satisfies what the user "
        "asked for, or null if none of the catalog documents are a real match. "
        "suggested_slug is always a valid catalog slug: the same as matched_slug when there "
        "is a match, otherwise the closest available alternative. reply is a short, friendly "
        "message — if matched, confirm what you're starting; if not matched, say plainly that "
        "we can't generate that document, then recommend the suggested alternative by name "
        "and briefly explain why it's the closest fit."
    )
    response = completion(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": request.message},
        ],
        response_format=RouteResult,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    result = RouteResult.model_validate_json(response.choices[0].message.content)

    if result.matched_slug not in valid_slugs:
        result.matched_slug = None
    if result.suggested_slug not in valid_slugs:
        result.suggested_slug = result.matched_slug or specs[0].slug
    return result
