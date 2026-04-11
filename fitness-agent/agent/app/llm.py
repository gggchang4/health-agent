from __future__ import annotations

import json
import logging
from typing import Any

from openai import OpenAI

from .config import settings


logger = logging.getLogger("health_agent.llm")


def _extract_json_object(text: str) -> str:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].lstrip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end >= start:
        return cleaned[start : end + 1]
    return cleaned


class OpenAICompatibleLLMClient:
    def __init__(self) -> None:
        self._enabled = bool(settings.llm_api_key)
        self._client = (
            OpenAI(
                api_key=settings.llm_api_key,
                base_url=settings.llm_base_url,
                timeout=settings.llm_timeout,
            )
            if self._enabled
            else None
        )

    def supports_tool_calling(self) -> bool:
        return True

    def supports_json_output(self) -> bool:
        return True

    def is_enabled(self) -> bool:
        return self._enabled and self._client is not None

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        if not self._enabled or self._client is None:
            logger.warning("[LLM] Request skipped because no API key/client is configured.")
            return user_prompt

        logger.info(
            "[LLM] Sending chat completion request to %s with model=%s user_chars=%s",
            settings.llm_base_url,
            settings.llm_model_id,
            len(user_prompt),
        )
        try:
            response = self._client.chat.completions.create(
                model=settings.llm_model_id,
                temperature=settings.llm_temperature,
                max_tokens=settings.llm_max_tokens,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
        except Exception:
            logger.exception("[LLM] Request failed before a response was returned.")
            raise

        output = response.choices[0].message.content or ""
        logger.info(
            "[LLM] Response received from model=%s output_chars=%s",
            settings.llm_model_id,
            len(output),
        )
        return output

    def generate_structured(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not self._enabled or self._client is None:
            logger.warning("[LLM] Structured request skipped because no API key/client is configured.")
            return {}

        logger.info(
            "[LLM] Sending structured request to %s with model=%s user_chars=%s",
            settings.llm_base_url,
            settings.llm_model_id,
            len(user_prompt),
        )
        try:
            response = self._client.chat.completions.create(
                model=settings.llm_model_id,
                temperature=settings.llm_temperature,
                max_tokens=settings.llm_max_tokens,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
        except Exception:
            logger.exception("[LLM] Structured request failed before a response was returned.")
            raise
        text = response.choices[0].message.content or "{}"
        logger.info(
            "[LLM] Structured response received from model=%s output_chars=%s",
            settings.llm_model_id,
            len(text),
        )
        return json.loads(_extract_json_object(text))
