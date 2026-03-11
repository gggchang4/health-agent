from __future__ import annotations

import uuid
from typing import Any

from .models import MessageRecord, RunRecord, ThreadRecord


class SessionStore:
    def __init__(self) -> None:
        self._threads: dict[str, ThreadRecord] = {}
        self._runs: dict[str, RunRecord] = {}
        self._feedback: dict[str, list[dict[str, Any]]] = {}

    def create_thread(self, title: str | None = None) -> ThreadRecord:
        thread = ThreadRecord(id=f"thread_{uuid.uuid4().hex[:10]}", title=title or "Health Agent Chat")
        self._threads[thread.id] = thread
        return thread

    def get_thread(self, thread_id: str) -> ThreadRecord:
        return self._threads.setdefault(thread_id, ThreadRecord(id=thread_id))

    def append_message(self, thread_id: str, message: MessageRecord) -> MessageRecord:
        thread = self.get_thread(thread_id)
        thread.messages.append(message)
        return message

    def list_messages(self, thread_id: str) -> list[MessageRecord]:
        return self.get_thread(thread_id).messages

    def save_run(self, run: RunRecord) -> RunRecord:
        self._runs[run.id] = run
        return run

    def get_run(self, run_id: str) -> RunRecord:
        return self._runs[run_id]

    def add_feedback(self, run_id: str, feedback: dict[str, Any]) -> None:
        self._feedback.setdefault(run_id, []).append(feedback)

