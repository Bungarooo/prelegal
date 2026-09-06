import json
from typing import Literal

from fastapi import APIRouter
from litellm import completion
from pydantic import BaseModel

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

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
information, extract it into the `fields` output, leaving anything not mentioned as null.
Keep replies brief and friendly."""


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


class ChatTurnResult(BaseModel):
    reply: str
    fields: NdaFieldsUpdate


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    fields: dict


@router.post("")
def chat(request: ChatRequest) -> ChatTurnResult:
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nAlready known: {json.dumps(request.fields)}"},
        *[{"role": m.role, "content": m.content} for m in request.messages],
    ]
    response = completion(
        model=MODEL,
        messages=messages,
        response_format=ChatTurnResult,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return ChatTurnResult.model_validate_json(response.choices[0].message.content)
