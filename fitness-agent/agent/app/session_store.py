from __future__ import annotations

from typing import Any

import httpx

from .config import settings
from .models import MessageRecord, RunRecord, ThreadRecord


class SessionStore:
    def __init__(self) -> None:
        self._feedback: dict[str, list[dict[str, Any]]] = {}

    @staticmethod
    def _headers(user_id: str | None) -> dict[str, str]:
        return {"x-user-id": user_id} if user_id else {}

    async def create_thread(self, title: str | None = None, user_id: str | None = None) -> ThreadRecord:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.backend_base_url}/agent/state/threads",
                headers=self._headers(user_id),
                json={"title": title},
            )
            response.raise_for_status()
            payload = response.json()
            return ThreadRecord(
                id=payload["id"],
                title=payload.get("title") or title or "Health Agent Chat",
            )

    async def append_message(
        self,
        thread_id: str,
        message: MessageRecord,
        user_id: str | None = None,
    ) -> MessageRecord:
        body = {
            "role": message.role,
            "content": message.content,
            "reasoning": message.reasoning_summary,
            "cards": [card.model_dump(mode="json") for card in message.cards],
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.backend_base_url}/agent/state/threads/{thread_id}/messages",
                headers=self._headers(user_id),
                json=body,
            )
            response.raise_for_status()
            payload = response.json()
            return MessageRecord(
                id=payload["id"],
                role=payload["role"],
                content=payload["content"],
                reasoning_summary=payload.get("reasoning_summary"),
                cards=message.cards,
            )

    async def list_messages(self, thread_id: str, user_id: str | None = None) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{settings.backend_base_url}/agent/state/threads/{thread_id}/messages",
                headers=self._headers(user_id),
            )
            response.raise_for_status()
            return response.json()

    async def save_run(self, run: RunRecord, user_id: str | None = None) -> RunRecord:
        body = {
            "id": run.id,
            "status": run.status,
            "risk_level": run.risk_level,
            "steps": [
                {
                    "id": step.id,
                    "step_type": step.step_type,
                    "title": step.title,
                    "payload": step.payload,
                }
                for step in run.steps
            ],
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.backend_base_url}/agent/state/threads/{run.thread_id}/runs",
                headers=self._headers(user_id),
                json=body,
            )
            response.raise_for_status()
        return run

    async def get_run(self, run_id: str, user_id: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{settings.backend_base_url}/agent/state/runs/{run_id}",
                headers=self._headers(user_id),
            )
            response.raise_for_status()
            return response.json()

    async def create_proposals(
        self,
        thread_id: str,
        run_id: str,
        proposals: list[dict[str, Any]],
        user_id: str | None = None,
    ) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.backend_base_url}/agent/state/threads/{thread_id}/proposals",
                headers=self._headers(user_id),
                json={"runId": run_id, "proposals": proposals},
            )
            response.raise_for_status()
            return response.json()

    async def list_proposals(self, thread_id: str, user_id: str | None = None) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{settings.backend_base_url}/agent/state/threads/{thread_id}/proposals",
                headers=self._headers(user_id),
            )
            response.raise_for_status()
            return response.json()

    async def get_proposal(self, proposal_id: str, user_id: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{settings.backend_base_url}/agent/state/proposals/{proposal_id}",
                headers=self._headers(user_id),
            )
            response.raise_for_status()
            return response.json()

    async def approve_proposal(self, proposal_id: str, user_id: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.backend_base_url}/agent/state/proposals/{proposal_id}/approve",
                headers=self._headers(user_id),
                json={"proposalId": proposal_id},
            )
            response.raise_for_status()
            return response.json()

    async def reject_proposal(self, proposal_id: str, user_id: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.backend_base_url}/agent/state/proposals/{proposal_id}/reject",
                headers=self._headers(user_id),
                json={"proposalId": proposal_id},
            )
            response.raise_for_status()
            return response.json()

    def add_feedback(self, run_id: str, feedback: dict[str, Any]) -> None:
        self._feedback.setdefault(run_id, []).append(feedback)
