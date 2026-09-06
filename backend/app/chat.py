import json
from typing import Literal

from fastapi import APIRouter
from litellm import completion
from pydantic import BaseModel

from app import db

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

NDA_SLUG = "mutual-nda"
NDA_NAME = "Mutual Non-Disclosure Agreement"

router = APIRouter(prefix="/api/chat")

FIELD_DESCRIPTIONS = """
- party1 / party2: each has name, title, company, noticeAddress (email or postal address)
- purpose: how Confidential Information may be used
- effectiveDate: yyyy-mm-dd
- mndaTermType: "expires" or "continues"; mndaTermYears: used only when "expires"
- confidentialityTermType: "years" or "perpetuity"; confidentialityTermYears: used only when "years"
- governingLaw: a US state; jurisdiction: a city/county and state
- modifications: any changes to the MNDA standard terms
""".strip()

SYSTEM_PROMPT = f"""You are helping a user fill in a Mutual Non-Disclosure Agreement (MNDA) through conversation.

The MNDA has these fields:
{FIELD_DESCRIPTIONS}

Ask about one or two related fields at a time, in a natural, conversational way. Don't ask about
fields that are already filled in unless the user brings them up. When the user gives you
information, extract it into the `fields` output, leaving anything not mentioned as null. Keep
replies brief and friendly, acknowledging what the user just said."""

COMPLETION_NOTICE = (
    "The document is complete and ready to download! A couple of things I can't do for you: "
    "both parties still need to sign and date the Cover Page by hand, and you may want a "
    "lawyer to review the document before signing."
)

# Fields with no sensible default the user must supply before the document is usable.
# (purpose/effectiveDate/term fields already start out with reasonable defaults.)
REQUIRED_FIELD_PATHS = [
    "party1.name",
    "party1.title",
    "party1.company",
    "party1.noticeAddress",
    "party2.name",
    "party2.title",
    "party2.company",
    "party2.noticeAddress",
    "governingLaw",
    "jurisdiction",
]

FIELD_QUESTIONS = {
    "party1.name": "What's Party 1's name?",
    "party1.title": "What's Party 1's title?",
    "party1.company": "What company is Party 1 with?",
    "party1.noticeAddress": "What's the best notice address (email or postal) for Party 1?",
    "party2.name": "What's Party 2's name?",
    "party2.title": "What's Party 2's title?",
    "party2.company": "What company is Party 2 with?",
    "party2.noticeAddress": "What's the best notice address (email or postal) for Party 2?",
    "governingLaw": "What state's law should govern this agreement?",
    "jurisdiction": "What city or county and state should be the jurisdiction for any disputes?",
}


class PartyFields(BaseModel):
    name: str | None = None
    title: str | None = None
    company: str | None = None
    noticeAddress: str | None = None


class NdaFieldsUpdate(BaseModel):
    party1: PartyFields | None = None
    party2: PartyFields | None = None
    purpose: str | None = None
    effectiveDate: str | None = None
    mndaTermType: Literal["expires", "continues"] | None = None
    mndaTermYears: int | None = None
    confidentialityTermType: Literal["years", "perpetuity"] | None = None
    confidentialityTermYears: int | None = None
    governingLaw: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None


class ChatExtraction(BaseModel):
    """What the LLM produces: an acknowledgment and any fields it could extract."""

    reply: str
    fields: NdaFieldsUpdate


class ChatTurnResult(BaseModel):
    """What the API returns: the LLM's extraction, plus a deterministic completion check."""

    reply: str
    fields: NdaFieldsUpdate
    complete: bool


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    fields: dict
    username: str


def _get_path(data: dict, path: str) -> object:
    value: object = data
    for part in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def merge_fields(current: dict, update: NdaFieldsUpdate) -> dict:
    """Applies a partial field update onto a dict of already-known fields."""
    merged = dict(current)
    for key, value in update.model_dump(exclude_none=True).items():
        if key in ("party1", "party2") and isinstance(value, dict):
            merged[key] = {**(merged.get(key) or {}), **value}
        else:
            merged[key] = value
    return merged


def next_missing_field_question(fields: dict) -> str | None:
    """Returns a question for the first required field still missing, or None if complete."""
    for path in REQUIRED_FIELD_PATHS:
        value = _get_path(fields, path)
        if not (isinstance(value, str) and value.strip()):
            return FIELD_QUESTIONS[path]
    return None


@router.post("")
def chat(request: ChatRequest) -> ChatTurnResult:
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nAlready known: {json.dumps(request.fields)}"},
        *[{"role": m.role, "content": m.content} for m in request.messages],
    ]
    response = completion(
        model=MODEL,
        messages=messages,
        response_format=ChatExtraction,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    extraction = ChatExtraction.model_validate_json(response.choices[0].message.content)

    merged_fields = merge_fields(request.fields, extraction.fields)
    question = next_missing_field_question(merged_fields)

    reply = extraction.reply.strip()
    if question is None:
        reply = f"{reply}\n\n{COMPLETION_NOTICE}"
    elif not reply.endswith("?"):
        reply = f"{reply} {question}"

    db.save_document_history(request.username, NDA_SLUG, NDA_NAME, merged_fields)

    return ChatTurnResult(reply=reply, fields=extraction.fields, complete=question is None)
