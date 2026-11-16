"""The Copilot's routes. Confirm is the only one that performs a write."""

from typing import Any, Literal

import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from accountable import api
from accountable.copilot.loop import Turn, run_turn
from accountable.copilot.model import CANNOT, FAILURE, AnthropicModel, MissingTokenModel, StubModel, using_stub
from accountable.copilot.tools import Api, find

router = APIRouter(prefix="/copilot")


class Message(api.Request):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)


class Ask(api.Request):
    question: str = Field(min_length=1, max_length=2000)
    messages: list[Message] = Field(default_factory=list, max_length=40)


class Call(api.Request):
    name: str = Field(min_length=1, max_length=80)
    input: dict[str, Any] = Field(default_factory=dict)


class PendingBody(BaseModel):
    line: str
    call: Call


class Reply(BaseModel):
    tools: list[str]
    answer: str = ""
    pending: PendingBody | None = None
    sentence: str | None = None


class Done(BaseModel):
    done: bool
    sentence: str | None = None


def model_for(request: Request) -> AnthropicModel | MissingTokenModel | StubModel:
    """The stand-in only when the test server asks for it. A header cannot turn it on in production."""
    mode = request.headers.get("x-accountable-copilot-mode", "")
    if using_stub() and mode == "no-token":
        return MissingTokenModel()
    if using_stub():
        return StubModel()
    return AnthropicModel()


@router.post("")
async def ask(body: Ask, request: Request) -> Reply:
    history = [message.model_dump() for message in body.messages]
    async with _client(request) as http:
        turn = await run_turn(body.question, history, model_for(request), Api(http, _authorization(request)))
    return _reply(turn)


@router.post("/confirm")
async def confirm(body: Call, request: Request) -> Done:
    tool = find(body.name)
    if tool is None or not tool.write:
        return Done(done=False, sentence=CANNOT)
    try:
        async with _client(request) as http:
            outcome = await Api(http, _authorization(request)).run(tool, body.input)
    except httpx.HTTPError:
        return Done(done=False, sentence=FAILURE)
    if outcome.status >= 400:
        return Done(done=False, sentence=FAILURE)
    return Done(done=True)


@router.post("/cancel")
async def cancel(body: Call) -> Done:
    """Drops the write. The call is accepted so the client can name it, and nothing is performed."""
    return Done(done=False)


def _client(request: Request) -> httpx.AsyncClient:
    # The inner call has to look like it came from this computer, or local sign-in rejects it.
    transport = httpx.ASGITransport(app=request.app, client=("127.0.0.1", 50000))
    return httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1", timeout=30)


def _authorization(request: Request) -> str:
    return request.headers.get("authorization", "")


def _reply(turn: Turn) -> Reply:
    pending = None
    if turn.pending is not None:
        pending = PendingBody(line=turn.pending.line, call=Call(**turn.pending.call))
    return Reply(tools=turn.tools, answer=turn.answer, pending=pending, sentence=turn.sentence)
