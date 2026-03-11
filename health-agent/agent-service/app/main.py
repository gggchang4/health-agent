from __future__ import annotations

import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .agents import HealthAgentRuntime
from .config import settings
from .llm import OpenAICompatibleLLMClient
from .models import CreateThreadRequest, CreateThreadResponse, FeedbackRequest, PostMessageRequest
from .session_store import SessionStore
from .tool_gateway import ToolGateway
from .trace_logger import TraceLogger

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
async def create_thread(payload: CreateThreadRequest) -> CreateThreadResponse:
    thread = session_store.create_thread(payload.title)
    return CreateThreadResponse(thread_id=thread.id)


@app.get("/agent/threads/{thread_id}/messages")
async def list_messages(thread_id: str):
    return session_store.list_messages(thread_id)


@app.post("/agent/threads/{thread_id}/messages")
async def post_message(thread_id: str, payload: PostMessageRequest):
    return await runtime.process_message(thread_id, payload)


@app.get("/agent/runs/{run_id}/stream")
async def stream_run(run_id: str):
    try:
        run = session_store.get_run(run_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Run not found") from exc

    async def event_generator():
        for step in run.steps:
            yield f"event: {step.step_type}\n"
            yield f"data: {json.dumps(step.model_dump(mode='json'), ensure_ascii=False)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/agent/runs/{run_id}/feedback")
async def submit_feedback(run_id: str, payload: FeedbackRequest):
    session_store.add_feedback(run_id, payload.model_dump())
    return {"ok": True}


@app.get("/agent/traces")
async def list_traces():
    return trace_logger.list_records()
