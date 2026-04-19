from __future__ import annotations

import json
import logging

import httpx
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .agents import HealthAgentRuntime
from .config import settings
from .llm import OpenAICompatibleLLMClient
from .models import (
    CreateThreadRequest,
    CreateThreadResponse,
    FeedbackRequest,
    PostMessageRequest,
    ProposalDecisionResponse,
)
from .session_store import SessionStore
from .tool_gateway import ToolGateway
from .trace_logger import TraceLogger

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_store = SessionStore()
tool_gateway = ToolGateway()
trace_logger = TraceLogger()
llm_client = OpenAICompatibleLLMClient()
runtime = HealthAgentRuntime(session_store, tool_gateway, trace_logger, llm_client)


@app.get("/healthz")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/agent/threads", response_model=CreateThreadResponse)
async def create_thread(payload: CreateThreadRequest, x_user_id: str | None = Header(default=None)) -> CreateThreadResponse:
    thread = await session_store.create_thread(payload.title, x_user_id)
    return CreateThreadResponse(thread_id=thread.id)


@app.get("/agent/threads/{thread_id}/messages")
async def list_messages(thread_id: str, x_user_id: str | None = Header(default=None)):
    return await session_store.list_messages(thread_id, x_user_id)


@app.get("/agent/threads/{thread_id}/proposals")
async def list_proposals(thread_id: str, x_user_id: str | None = Header(default=None)):
    return await session_store.list_proposals(thread_id, x_user_id)


@app.post("/agent/threads/{thread_id}/messages")
async def post_message(
    thread_id: str,
    payload: PostMessageRequest,
    x_user_id: str | None = Header(default=None),
):
    return await runtime.process_message(thread_id, payload, x_user_id)


@app.post("/agent/proposals/{proposal_id}/approve", response_model=ProposalDecisionResponse)
async def approve_proposal(proposal_id: str, x_user_id: str | None = Header(default=None)):
    return await runtime.approve_proposal(proposal_id, x_user_id)


@app.post("/agent/proposals/{proposal_id}/reject", response_model=ProposalDecisionResponse)
async def reject_proposal(proposal_id: str, x_user_id: str | None = Header(default=None)):
    return await runtime.reject_proposal(proposal_id, x_user_id)


@app.get("/agent/runs/{run_id}/stream")
async def stream_run(run_id: str, x_user_id: str | None = Header(default=None)):
    try:
        run = await session_store.get_run(run_id, x_user_id)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=404, detail="Run not found") from exc

    async def event_generator():
        for step in run["steps"]:
            yield f"event: {step['step_type']}\n"
            yield f"data: {json.dumps(step, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/agent/runs/{run_id}/feedback")
async def submit_feedback(run_id: str, payload: FeedbackRequest):
    session_store.add_feedback(run_id, payload.model_dump())
    return {"ok": True}


@app.get("/agent/traces")
async def list_traces():
    return trace_logger.list_records()
