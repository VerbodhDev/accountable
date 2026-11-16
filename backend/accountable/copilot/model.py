"""The call to Anthropic, and the stand-in that answers when the tests ask it to.

The token is read here and sent only on this request. Nothing in this module logs it.
"""

import json
import os
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx

URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-sonnet-4-5"
TOKEN_NAME = "CLAUDE_CODE_OAUTH_TOKEN"
NEED_TOKEN = "The Copilot needs a token."
LIMIT = "The limit was reached."
FAILURE = "The Copilot could not answer."
CANNOT = "The Copilot cannot do that."
UNFINISHED = "The Copilot could not finish."

STAGES = ("negotiation", "qualified", "proposal", "new", "won", "lost")


class ModelError(Exception):
    """A plain sentence for the panel. The rest of the app keeps working."""

    def __init__(self, sentence: str) -> None:
        super().__init__(sentence)
        self.sentence = sentence


@dataclass
class ToolUse:
    id: str
    name: str
    input: dict[str, Any]


@dataclass
class Completion:
    text: str = ""
    tools: list[ToolUse] = field(default_factory=list)


class Model(Protocol):
    async def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]], system: str) -> Completion:
        """One reply. Tool results stay in messages. system is the fixed prompt."""


def token() -> str:
    return os.environ.get(TOKEN_NAME, "").strip()


def model_name() -> str:
    chosen = os.environ.get("COPILOT_MODEL", "").strip()
    return chosen or DEFAULT_MODEL


def using_stub() -> bool:
    return os.environ.get("ACCOUNTABLE_COPILOT") == "stub"


class AnthropicModel:
    """POST /v1/messages with the Claude Code token as a bearer, not an x-api-key."""

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]], system: str) -> Completion:
        if not token():
            raise ModelError(NEED_TOKEN)
        if self._client is not None:
            return await _post(self._client, messages, tools, system)
        async with httpx.AsyncClient(timeout=30) as client:
            return await _post(client, messages, tools, system)


class MissingTokenModel:
    """The stand-in, told that this copy has no token. It never calls out."""

    async def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]], system: str) -> Completion:
        raise ModelError(NEED_TOKEN)


class StubModel:
    """Answers from the question's words, so the end-to-end tests stay off the network."""

    async def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]], system: str) -> Completion:
        return stub_reply(messages)


def _headers() -> dict[str, str]:
    return {
        "authorization": f"Bearer {token()}",
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "oauth-2025-04-20",
    }


def _payload(messages: list[dict[str, Any]], tools: list[dict[str, Any]], system: str) -> dict[str, Any]:
    return {"model": model_name(), "max_tokens": 1024, "system": system, "tools": tools, "messages": messages}


async def _post(
    client: httpx.AsyncClient, messages: list[dict[str, Any]], tools: list[dict[str, Any]], system: str
) -> Completion:
    try:
        response = await client.post(URL, headers=_headers(), json=_payload(messages, tools, system))
    except httpx.HTTPError:
        raise ModelError(FAILURE) from None
    if response.status_code == 429:
        raise ModelError(LIMIT)
    if response.status_code >= 400:
        raise ModelError(FAILURE)
    return _completion(response.json())


def _completion(payload: object) -> Completion:
    blocks = payload.get("content") if isinstance(payload, dict) else None
    if not isinstance(blocks, list):
        raise ModelError(FAILURE)
    text: list[str] = []
    tools: list[ToolUse] = []
    for block in blocks:
        if not isinstance(block, dict):
            continue
        if block.get("type") == "text":
            text.append(str(block.get("text") or ""))
        elif block.get("type") == "tool_use":
            raw = block.get("input")
            tools.append(
                ToolUse(str(block.get("id") or ""), str(block.get("name") or ""), raw if isinstance(raw, dict) else {})
            )
    return Completion("".join(text), tools)


def stub_reply(messages: list[dict[str, Any]]) -> Completion:
    question = _question(messages)
    results = _results(messages)
    if not results:
        return _opening(question)
    if "move" in question.lower():
        return _move(question, results)
    if _about_this_month(question):
        return Completion(_deal_names(results[-1]))
    return Completion("Done.")


def _opening(question: str) -> Completion:
    lowered = question.lower()
    if "delet" in lowered:
        return _tool("delete_record", {})
    if "setting" in lowered:
        return _tool("change_settings", {})
    if "journal" in lowered:
        return _tool("post_journal", {})
    if _about_this_month(question):
        return _tool("list_deals", {"closing": "this_month"})
    if "move" in lowered:
        return _tool("list_deals", {})
    return Completion("Ask about a record the app shows.")


def _about_this_month(question: str) -> bool:
    lowered = question.lower()
    return "clos" in lowered and "month" in lowered


def _move(question: str, results: list[str]) -> Completion:
    deals = _deals(results)
    deal = _named(question, deals)
    stage = _stage(question)
    if deal is None or stage is None:
        return Completion(CANNOT)
    return _tool("move_deal", {"deal_id": deal["id"], "stage": stage})


def _tool(name: str, arguments: dict[str, Any]) -> Completion:
    return Completion(tools=[ToolUse("stub-1", name, arguments)])


def _question(messages: list[dict[str, Any]]) -> str:
    question = ""
    for message in messages:
        if message.get("role") == "user" and isinstance(message.get("content"), str):
            question = message["content"]
    return question


def _results(messages: list[dict[str, Any]]) -> list[str]:
    found: list[str] = []
    for message in messages:
        content = message.get("content")
        if not isinstance(content, list):
            continue
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_result":
                found.append(str(block.get("content") or ""))
    return found


def _deals(results: list[str]) -> list[dict[str, Any]]:
    for text in reversed(results):
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, list):
            return [deal for deal in parsed if isinstance(deal, dict)]
    return []


def _named(question: str, deals: list[dict[str, Any]]) -> dict[str, Any] | None:
    lowered = question.lower()
    matches = [deal for deal in deals if str(deal.get("name", "")).lower() in lowered]
    if not matches:
        return None
    return max(matches, key=lambda deal: len(str(deal.get("name", ""))))


def _stage(question: str) -> str | None:
    lowered = question.lower()
    return next((stage for stage in STAGES if stage in lowered), None)


def _deal_names(text: str) -> str:
    deals = _deals([text])
    names = ", ".join(str(deal.get("name", "")) for deal in deals)
    return f"These deals close this month: {names}."
