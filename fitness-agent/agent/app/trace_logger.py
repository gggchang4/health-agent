from __future__ import annotations

from typing import Any


class TraceLogger:
    def __init__(self) -> None:
        self._records: list[dict[str, Any]] = []

    def log(self, **payload: Any) -> None:
        self._records.append(payload)

    def list_records(self) -> list[dict[str, Any]]:
        return self._records

