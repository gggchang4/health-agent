from __future__ import annotations

import asyncio
import json
import logging
import re
import uuid
from typing import Any

from .config import settings
from .llm import OpenAICompatibleLLMClient
from .models import Card, MessageRecord, PostMessageRequest, PostMessageResponse, ProposalDecisionResponse, RunRecord, RunStep, ToolEvent
from .session_store import SessionStore
from .tool_gateway import ToolGateway, compute_place_rank
from .trace_logger import TraceLogger


logger = logging.getLogger("health_agent.runtime")


class HealthAgentRuntime:
    LOCATION_KEYWORDS = ("附近", "周围", "公园", "步道", "游泳", "健身房", "gym", "park")
    PLAN_KEYWORDS = ("计划", "安排", "本周", "下周", "todo", "待办", "训练日", "plan")
    EXERCISE_KEYWORDS = ("动作", "替代", "深蹲", "卧推", "拉伸", "exercise")
    WRITE_VERBS = ("修改", "调整", "删除", "删掉", "生成", "创建", "新增", "添加", "记录", "录入", "标记", "完成", "替换")
    HIGH_RISK_KEYWORDS = ("胸痛", "晕厥", "禁食", "处方", "药", "极端减肥")
    ACTION_TYPES = {
        "generate_plan",
        "adjust_plan",
        "create_plan_day",
        "update_plan_day",
        "delete_plan_day",
        "complete_plan_day",
        "create_body_metric",
        "create_daily_checkin",
        "create_workout_log",
    }

    def __init__(
        self,
        store: SessionStore,
        tool_gateway: ToolGateway,
        trace_logger: TraceLogger,
        llm: OpenAICompatibleLLMClient,
    ) -> None:
        self.store = store
        self.tools = tool_gateway
        self.trace = trace_logger
        self.llm = llm

    @staticmethod
    def _detect_reply_language(user_text: str) -> str:
        if any("\u4e00" <= char <= "\u9fff" for char in user_text):
            return "Simplified Chinese"
        return "English"

    @staticmethod
    def _tool_payload(tool_response) -> dict[str, Any]:
        payload = dict(tool_response.data)
        if not tool_response.ok:
            if tool_response.error_code:
                payload["error_code"] = tool_response.error_code
            payload["retryable"] = tool_response.retryable
        return payload

    @staticmethod
    def _tool_failure_reply(
        content: str,
        reasoning_summary: str,
        title: str,
        description: str,
        bullets: list[str],
        next_actions: list[str],
        card_type: str = "tool_activity_card",
    ) -> tuple[str, str, list[Card], list[str]]:
        return (
            content,
            reasoning_summary,
            [Card(type=card_type, title=title, description=description, bullets=bullets)],
            next_actions,
        )

    @staticmethod
    def _preview_to_bullets(preview: dict[str, Any]) -> list[str]:
        bullets: list[str] = []
        for key, value in preview.items():
            label = str(key)
            if isinstance(value, list):
                rendered = " / ".join(str(item) for item in value[:4])
            elif isinstance(value, dict):
                rendered = ", ".join(f"{sub_key}: {sub_value}" for sub_key, sub_value in list(value.items())[:4])
            else:
                rendered = str(value)
            bullets.append(f"{label}: {rendered}")
        return bullets[:5]

    @staticmethod
    def _coerce_text_list(value: Any, fallback: list[str]) -> list[str]:
        if not isinstance(value, list):
            return fallback
        items = [str(item).strip() for item in value if str(item).strip()]
        return items[:3] or fallback

    @staticmethod
    def _extract_number(patterns: list[str], text: str) -> float | None:
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    return None
        return None

    @staticmethod
    def _extract_day_label(text: str, plan_days: list[dict[str, Any]]) -> dict[str, Any] | None:
        lowered = text.lower()
        for day in plan_days:
            day_label = str(day.get("dayLabel") or day.get("day_label") or "").strip()
            focus = str(day.get("focus") or "").strip()
            if day_label and day_label in text:
                return day
            if day_label and day_label.lower() in lowered:
                return day
            if focus and focus in text:
                return day
        return None

    def _risk_for_action(self, action_type: str) -> str:
        if action_type in {"generate_plan", "adjust_plan", "delete_plan_day"}:
            return "high"
        if action_type in {"update_plan_day", "create_workout_log"}:
            return "medium"
        return "low"

    @staticmethod
    def _max_risk_level(levels: list[str]) -> str:
        ranking = {"low": 0, "medium": 1, "high": 2}
        return max(levels, key=lambda level: ranking.get(level, 0), default="low")

    def _proposal_title(self, action_type: str) -> str:
        title_map = {
            "generate_plan": "生成新训练计划",
            "adjust_plan": "调整当前训练计划",
            "create_plan_day": "新增训练计划项",
            "update_plan_day": "更新训练计划项",
            "delete_plan_day": "删除训练计划项",
            "complete_plan_day": "更新计划完成状态",
            "create_body_metric": "记录身体指标",
            "create_daily_checkin": "记录每日打卡",
            "create_workout_log": "记录训练日志",
        }
        return title_map.get(action_type, "待确认操作")

    def _build_proposal_card(self, proposal: dict[str, Any]) -> Card:
        preview = proposal.get("preview")
        preview_dict = preview if isinstance(preview, dict) else {}
        bullets = self._preview_to_bullets(preview_dict) or [proposal.get("summary", "Ready for confirmation.")]
        return Card(
            type="action_proposal_card",
            title=proposal.get("title", "Pending action"),
            description=proposal.get("summary", ""),
            bullets=bullets,
            data={
                "proposalId": proposal.get("id"),
                "actionType": proposal.get("action_type"),
                "entityType": proposal.get("entity_type"),
                "entityId": proposal.get("entity_id"),
                "riskLevel": proposal.get("risk_level"),
                "status": proposal.get("status"),
                "preview": preview_dict,
                "requiresConfirmation": proposal.get("requires_confirmation", True),
            },
        )

    def _build_result_card(
        self,
        proposal_id: str,
        title: str,
        description: str,
        result_payload: Any,
        status: str,
    ) -> Card:
        result_dict = result_payload if isinstance(result_payload, dict) else {"result": result_payload}
        bullets = self._preview_to_bullets(result_dict) or [description]
        return Card(
            type="action_result_card",
            title=title,
            description=description,
            bullets=bullets,
            data={"proposalId": proposal_id, "status": status, "result": result_dict},
        )

    def _is_location_query(self, text: str) -> bool:
        lowered = text.lower()
        return any(keyword in text for keyword in self.LOCATION_KEYWORDS) or any(
            keyword in lowered for keyword in ("nearby", "location", "where can i train")
        )

    def _is_exercise_query(self, text: str) -> bool:
        lowered = text.lower()
        return any(keyword in text for keyword in self.EXERCISE_KEYWORDS) or "exercise" in lowered

    def _is_plan_query(self, text: str) -> bool:
        lowered = text.lower()
        return any(keyword in text for keyword in self.PLAN_KEYWORDS) or "plan" in lowered

    def _detect_write_domain(self, text: str) -> str | None:
        lowered = text.lower()
        if any(keyword in text for keyword in self.HIGH_RISK_KEYWORDS):
            return None
        if any(keyword in text for keyword in ("体重", "体脂", "腰围", "weight", "body fat")) and any(
            char.isdigit() for char in text
        ):
            return "body_metric"
        if any(keyword in text for keyword in ("睡", "步", "喝水", "疲劳", "打卡")) and any(
            verb in text for verb in self.WRITE_VERBS
        ):
            return "daily_checkin"
        if any(keyword in text for keyword in ("训练了", "练了", "workout", "训练日志", "锻炼")) and any(
            verb in text for verb in self.WRITE_VERBS
        ):
            return "workout_log"
        if any(keyword in text for keyword in self.PLAN_KEYWORDS) and any(verb in text for verb in self.WRITE_VERBS):
            return "plan"
        if any(keyword in lowered for keyword in ("record weight", "log sleep", "mark complete", "delete plan")):
            return "plan" if "plan" in lowered else "daily_checkin"
        return None

    async def _render_with_llm(
        self,
        mode: str,
        user_text: str,
        context: dict[str, Any],
        fallback_content: str,
        fallback_reasoning: str,
        fallback_next_actions: list[str],
        fallback_card_title: str,
        fallback_card_description: str,
        fallback_card_bullets: list[str],
    ) -> dict[str, Any]:
        if not self.llm.is_enabled():
            return {
                "content": fallback_content,
                "reasoning_summary": fallback_reasoning,
                "next_actions": fallback_next_actions,
                "card_title": fallback_card_title,
                "card_description": fallback_card_description,
                "card_bullets": fallback_card_bullets,
            }

        system_prompt = (
            "You are Health Agent, a non-medical fitness coach. "
            f"Reply in {self._detect_reply_language(user_text)}. "
            "Return JSON only with keys: content, reasoning_summary, next_actions, card_title, card_description, card_bullets. "
            "Keep advice safe, concise, and grounded in the provided context."
        )
        user_prompt = json.dumps(
            {
                "mode": mode,
                "user_text": user_text,
                "context": context,
                "fallback": {
                    "content": fallback_content,
                    "reasoning_summary": fallback_reasoning,
                    "next_actions": fallback_next_actions,
                    "card_title": fallback_card_title,
                    "card_description": fallback_card_description,
                    "card_bullets": fallback_card_bullets,
                },
            },
            ensure_ascii=False,
        )
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self.llm.generate_structured, system_prompt, user_prompt),
                timeout=settings.llm_timeout + 5,
            )
            return {
                "content": str(result.get("content") or fallback_content),
                "reasoning_summary": str(result.get("reasoning_summary") or fallback_reasoning),
                "next_actions": self._coerce_text_list(result.get("next_actions"), fallback_next_actions),
                "card_title": str(result.get("card_title") or fallback_card_title),
                "card_description": str(result.get("card_description") or fallback_card_description),
                "card_bullets": self._coerce_text_list(result.get("card_bullets"), fallback_card_bullets),
            }
        except Exception as exc:
            self.trace.log(mode=mode, llm_error=str(exc), llm_used=False)
            logger.warning("LLM rendering failed in mode=%s: %s", mode, exc)
            return {
                "content": fallback_content,
                "reasoning_summary": fallback_reasoning,
                "next_actions": fallback_next_actions,
                "card_title": fallback_card_title,
                "card_description": fallback_card_description,
                "card_bullets": fallback_card_bullets,
            }

    async def _render_write_proposals(self, domain: str, user_text: str, context: dict[str, Any]) -> dict[str, Any]:
        fallback = self._heuristic_write_render(domain, user_text, context)
        if not self.llm.is_enabled():
            return fallback

        system_prompt = (
            "You are Health Agent generating structured action proposals. "
            f"Reply in {self._detect_reply_language(user_text)}. "
            "Return JSON only with keys: assistant_message, reasoning_summary, next_actions, proposals. "
            "Each proposal must use ONLY these action types: "
            "generate_plan, adjust_plan, create_plan_day, update_plan_day, delete_plan_day, complete_plan_day, "
            "create_body_metric, create_daily_checkin, create_workout_log. "
            "Each proposal object must contain: action_type, entity_type, entity_id, title, summary, payload, preview, risk_level, requires_confirmation."
        )
        user_prompt = json.dumps(
            {"domain": domain, "user_text": user_text, "context": context, "fallback": fallback},
            ensure_ascii=False,
        )
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self.llm.generate_structured, system_prompt, user_prompt),
                timeout=settings.llm_timeout + 5,
            )
            proposals = result.get("proposals")
            if not isinstance(proposals, list):
                return fallback
            return {
                "assistant_message": str(result.get("assistant_message") or fallback["assistant_message"]),
                "reasoning_summary": str(result.get("reasoning_summary") or fallback["reasoning_summary"]),
                "next_actions": self._coerce_text_list(result.get("next_actions"), fallback["next_actions"]),
                "proposals": proposals,
            }
        except Exception as exc:
            self.trace.log(mode="write_proposal", llm_error=str(exc), llm_used=False)
            logger.warning("LLM proposal generation failed for domain=%s: %s", domain, exc)
            return fallback

    def _heuristic_write_render(self, domain: str, user_text: str, context: dict[str, Any]) -> dict[str, Any]:
        proposals = self._heuristic_write_proposals(domain, user_text, context)
        if proposals:
            return {
                "assistant_message": f"我先把这次请求整理成了 {len(proposals)} 条待确认提案，你确认后我再写入数据库。",
                "reasoning_summary": "这次请求涉及写入操作，所以我先生成结构化提案，避免直接修改数据。",
                "next_actions": ["检查提案内容", "确认执行或拒绝", "执行后刷新相关页面查看结果"],
                "proposals": proposals,
            }
        return {
            "assistant_message": "我理解到你想修改数据，但当前信息还不足以生成安全提案。",
            "reasoning_summary": "我没有拿到足够的目标信息，所以先不执行写入。",
            "next_actions": ["补充更具体的目标对象", "说明你想新增、修改还是删除", "如果是计划项，请告诉我对应训练日"],
            "proposals": [],
        }

    def _heuristic_write_proposals(self, domain: str, user_text: str, context: dict[str, Any]) -> list[dict[str, Any]]:
        proposals: list[dict[str, Any]] = []
        plan_days = context.get("current_plan", {}).get("days", []) if isinstance(context.get("current_plan"), dict) else []
        matched_day = self._extract_day_label(user_text, plan_days if isinstance(plan_days, list) else [])
        lowered = user_text.lower()

        if domain == "body_metric":
            weight = self._extract_number(
                [r"体重[^\d]*(\d+(?:\.\d+)?)", r"(\d+(?:\.\d+)?)\s*(?:kg|公斤)", r"weight[^\d]*(\d+(?:\.\d+)?)"],
                user_text,
            )
            body_fat = self._extract_number([r"体脂[^\d]*(\d+(?:\.\d+)?)", r"body fat[^\d]*(\d+(?:\.\d+)?)"], user_text)
            waist = self._extract_number([r"腰围[^\d]*(\d+(?:\.\d+)?)", r"waist[^\d]*(\d+(?:\.\d+)?)"], user_text)
            if weight is not None:
                proposals.append(
                    self._draft_proposal(
                        action_type="create_body_metric",
                        entity_type="body_metric",
                        title=self._proposal_title("create_body_metric"),
                        summary=f"记录最新身体指标，体重 {weight} kg。",
                        payload={"weightKg": weight, **({"bodyFatPct": body_fat} if body_fat is not None else {}), **({"waistCm": waist} if waist is not None else {})},
                        preview={"体重(kg)": weight, **({"体脂(%)": body_fat} if body_fat is not None else {}), **({"腰围(cm)": waist} if waist is not None else {})},
                    )
                )

        if domain == "daily_checkin":
            sleep = self._extract_number([r"睡[^\d]*(\d+(?:\.\d+)?)\s*(?:小时|h|hour)", r"sleep[^\d]*(\d+(?:\.\d+)?)"], user_text)
            steps = self._extract_number([r"(\d+)\s*步", r"(\d+)\s*steps?"], user_text)
            water = self._extract_number([r"喝水[^\d]*(\d+)", r"(\d+)\s*ml", r"water[^\d]*(\d+)"], user_text)
            fatigue = "high" if "很累" in user_text or "疲劳" in user_text else None
            payload: dict[str, Any] = {}
            preview: dict[str, Any] = {}
            if sleep is not None:
                payload["sleepHours"] = sleep
                preview["睡眠(小时)"] = sleep
            if steps is not None:
                payload["steps"] = int(steps)
                preview["步数"] = int(steps)
            if water is not None:
                payload["waterMl"] = int(water)
                preview["饮水(ml)"] = int(water)
            if fatigue:
                payload["fatigueLevel"] = fatigue
                preview["疲劳等级"] = fatigue
            if payload:
                proposals.append(
                    self._draft_proposal(
                        action_type="create_daily_checkin",
                        entity_type="daily_checkin",
                        title=self._proposal_title("create_daily_checkin"),
                        summary="记录今天的每日打卡数据。",
                        payload=payload,
                        preview=preview,
                    )
                )

        if domain == "workout_log":
            duration = self._extract_number([r"(\d+)\s*分钟", r"(\d+)\s*min"], user_text)
            workout_type = "strength" if any(token in lowered for token in ("力量", "strength")) else "general_workout"
            intensity = "high" if "高强度" in user_text else "moderate"
            if duration is not None or "训练" in user_text or "workout" in lowered:
                proposals.append(
                    self._draft_proposal(
                        action_type="create_workout_log",
                        entity_type="workout_log",
                        title=self._proposal_title("create_workout_log"),
                        summary="记录一次训练日志。",
                        payload={
                            "workoutType": workout_type,
                            "durationMin": int(duration or 0),
                            "intensity": intensity,
                            "exerciseNote": user_text[:120],
                        },
                        preview={"类型": workout_type, "时长(分钟)": int(duration or 0), "强度": intensity},
                    )
                )

        if domain == "plan":
            if any(token in user_text for token in ("生成", "生成新", "重做", "重新安排")) and any(
                token in user_text for token in ("计划", "本周", "下周")
            ):
                proposals.append(
                    self._draft_proposal(
                        action_type="generate_plan",
                        entity_type="workout_plan",
                        title=self._proposal_title("generate_plan"),
                        summary="生成一份新的训练计划。",
                        payload={"goal": "fat_loss"},
                        preview={"操作": "生成新计划", "目标": "fat_loss"},
                    )
                )
            elif any(token in user_text for token in ("删除", "删掉")) and matched_day:
                proposals.append(
                    self._draft_proposal(
                        action_type="delete_plan_day",
                        entity_type="workout_plan_day",
                        entity_id=str(matched_day.get("id") or ""),
                        title=self._proposal_title("delete_plan_day"),
                        summary=f"删除计划项 {matched_day.get('dayLabel') or matched_day.get('day_label')}",
                        payload={"dayId": matched_day.get("id")},
                        preview={
                            "训练日": matched_day.get("dayLabel") or matched_day.get("day_label"),
                            "训练重点": matched_day.get("focus"),
                        },
                    )
                )
            elif any(token in user_text for token in ("完成", "标记完成")) and matched_day:
                proposals.append(
                    self._draft_proposal(
                        action_type="complete_plan_day",
                        entity_type="workout_plan_day",
                        entity_id=str(matched_day.get("id") or ""),
                        title=self._proposal_title("complete_plan_day"),
                        summary=f"更新 {matched_day.get('dayLabel') or matched_day.get('day_label')} 的完成状态。",
                        payload={"dayId": matched_day.get("id"), "isCompleted": True},
                        preview={"训练日": matched_day.get("dayLabel") or matched_day.get("day_label"), "完成状态": "已完成"},
                    )
                )
            elif any(token in user_text for token in ("新增", "添加", "创建")):
                duration = self._extract_number([r"(\d+)\s*分钟", r"(\d+)\s*min"], user_text)
                new_label = matched_day.get("dayLabel") if matched_day else "新增训练日"
                proposals.append(
                    self._draft_proposal(
                        action_type="create_plan_day",
                        entity_type="workout_plan_day",
                        title=self._proposal_title("create_plan_day"),
                        summary="为当前 active 计划新增一条训练项。",
                        payload={
                            "dayLabel": new_label,
                            "focus": "Agent planned session",
                            "duration": f"{int(duration or 45)} min",
                            "exercises": [],
                            "recoveryTip": "训练后做拉伸并注意恢复。",
                        },
                        preview={"训练日": new_label, "时长": f"{int(duration or 45)} min"},
                    )
                )
            elif matched_day:
                duration = self._extract_number([r"(\d+)\s*分钟", r"(\d+)\s*min"], user_text)
                payload: dict[str, Any] = {"dayId": matched_day.get("id")}
                preview: dict[str, Any] = {"训练日": matched_day.get("dayLabel") or matched_day.get("day_label")}
                if duration is not None:
                    payload["duration"] = f"{int(duration)} min"
                    preview["时长"] = f"{int(duration)} min"
                if "恢复" in user_text:
                    payload["focus"] = "Recovery session"
                    preview["训练重点"] = "Recovery session"
                if not payload.get("duration") and not payload.get("focus"):
                    payload["focus"] = "Adjusted via agent"
                    preview["训练重点"] = "Adjusted via agent"
                proposals.append(
                    self._draft_proposal(
                        action_type="update_plan_day",
                        entity_type="workout_plan_day",
                        entity_id=str(matched_day.get("id") or ""),
                        title=self._proposal_title("update_plan_day"),
                        summary=f"调整计划项 {matched_day.get('dayLabel') or matched_day.get('day_label')}",
                        payload=payload,
                        preview=preview,
                    )
                )
            else:
                proposals.append(
                    self._draft_proposal(
                        action_type="adjust_plan",
                        entity_type="workout_plan",
                        title=self._proposal_title("adjust_plan"),
                        summary="对当前训练计划做一次整体调整。",
                        payload={"note": user_text[:160]},
                        preview={"调整说明": user_text[:80]},
                    )
                )

        return proposals[:3]

    def _draft_proposal(
        self,
        action_type: str,
        entity_type: str,
        title: str,
        summary: str,
        payload: dict[str, Any],
        preview: dict[str, Any],
        entity_id: str | None = None,
    ) -> dict[str, Any]:
        return {
            "actionType": action_type,
            "entityType": entity_type,
            "entityId": entity_id,
            "title": title,
            "summary": summary,
            "payload": payload,
            "preview": preview,
            "riskLevel": self._risk_for_action(action_type),
            "requiresConfirmation": True,
        }

    def _validate_proposals(
        self,
        raw_proposals: list[dict[str, Any]],
        context: dict[str, Any],
    ) -> tuple[list[dict[str, Any]], list[str]]:
        validated: list[dict[str, Any]] = []
        warnings: list[str] = []
        for proposal in raw_proposals:
            action_type = proposal.get("actionType") or proposal.get("action_type")
            entity_type = proposal.get("entityType") or proposal.get("entity_type")
            entity_id = proposal.get("entityId") or proposal.get("entity_id")
            title = str(proposal.get("title") or self._proposal_title(str(action_type or ""))).strip()
            summary = str(proposal.get("summary") or "待确认操作").strip()
            payload = proposal.get("payload") if isinstance(proposal.get("payload"), dict) else {}
            preview = proposal.get("preview") if isinstance(proposal.get("preview"), dict) else {}
            risk_level = str(proposal.get("riskLevel") or proposal.get("risk_level") or self._risk_for_action(str(action_type or "")))
            requires_confirmation = bool(proposal.get("requiresConfirmation", proposal.get("requires_confirmation", True)))

            if action_type not in self.ACTION_TYPES:
                warnings.append(f"已忽略不受支持的动作类型: {action_type}")
                continue
            if not entity_type:
                warnings.append(f"{title} 缺少 entityType，已跳过。")
                continue

            if action_type in {"update_plan_day", "delete_plan_day", "complete_plan_day"} and not (
                isinstance(payload.get("dayId"), str) or isinstance(payload.get("dayLabel"), str)
            ):
                warnings.append(f"{title} 缺少目标计划项，已跳过。")
                continue
            if action_type == "create_body_metric" and not isinstance(payload.get("weightKg"), (int, float)):
                warnings.append("身体指标提案缺少体重，已跳过。")
                continue
            if action_type == "create_daily_checkin" and not payload:
                warnings.append("每日打卡提案没有有效字段，已跳过。")
                continue
            if action_type == "create_workout_log" and not payload:
                warnings.append("训练日志提案没有有效字段，已跳过。")
                continue

            validated.append(
                {
                    "actionType": action_type,
                    "entityType": entity_type,
                    "entityId": entity_id,
                    "title": title,
                    "summary": summary,
                    "payload": payload,
                    "preview": preview or payload,
                    "riskLevel": risk_level if risk_level in {"low", "medium", "high"} else self._risk_for_action(action_type),
                    "requiresConfirmation": requires_confirmation,
                }
            )

        if not validated and context.get("current_plan") == {"days": []}:
            warnings.append("当前没有 active plan，可先让 agent 生成本周计划。")
        return validated, warnings[:3]

    def _build_run(
        self,
        thread_id: str,
        risk_level: str,
        tool_events: list[ToolEvent],
        cards: list[Card],
        content: str,
        reasoning_summary: str,
    ) -> RunRecord:
        steps: list[RunStep] = [
            RunStep(id=str(uuid.uuid4()), step_type="thinking_summary", title="Reasoning summary", payload={"summary": reasoning_summary})
        ]
        for event in tool_events:
            steps.append(
                RunStep(
                    id=str(uuid.uuid4()),
                    step_type=event.event,
                    title=event.tool_name,
                    payload={"summary": event.summary, **event.payload},
                )
            )
        if cards:
            steps.append(
                RunStep(
                    id=str(uuid.uuid4()),
                    step_type="card_render",
                    title="Rendered cards",
                    payload={"count": len(cards), "types": [card.type for card in cards]},
                )
            )
        steps.append(
            RunStep(id=str(uuid.uuid4()), step_type="final_message", title="Final response", payload={"content": content})
        )
        return RunRecord(id=str(uuid.uuid4()), thread_id=thread_id, status="completed", risk_level=risk_level, steps=steps)

    async def _append_assistant_message(
        self,
        thread_id: str,
        content: str,
        reasoning_summary: str,
        cards: list[Card],
        user_id: str | None,
    ) -> MessageRecord:
        return await self.store.append_message(
            thread_id,
            MessageRecord(
                id=str(uuid.uuid4()),
                role="assistant",
                content=content,
                reasoning_summary=reasoning_summary,
                cards=cards,
            ),
            user_id,
        )

    async def _load_write_context(self, domain: str, user_id: str | None) -> tuple[dict[str, Any], list[ToolEvent]]:
        context: dict[str, Any] = {}
        tool_events: list[ToolEvent] = []

        async def load_tool(tool_name: str, loader, context_key: str) -> None:
            tool_events.append(ToolEvent(event="tool_call_started", tool_name=tool_name, summary=f"Loading {context_key}"))
            result = await loader
            tool_events.append(
                ToolEvent(
                    event="tool_call_completed",
                    tool_name=tool_name,
                    summary=result.human_readable,
                    payload=self._tool_payload(result),
                )
            )
            context[context_key] = result.data if result.ok else {}

        if domain == "plan":
            await load_tool("get_user_profile", self.tools.get_user_profile(user_id), "profile")
            await load_tool("load_current_plan", self.tools.load_current_plan(user_id), "current_plan")
        elif domain in {"daily_checkin", "body_metric", "workout_log"}:
            await load_tool("query_recent_health_data", self.tools.query_recent_health_data(user_id), "recent_health")
            await load_tool("load_current_plan", self.tools.load_current_plan(user_id), "current_plan")

        return context, tool_events

    async def _handle_health(
        self,
        request: PostMessageRequest,
        user_id: str | None,
    ) -> tuple[str, str, list[Card], list[str], list[ToolEvent]]:
        tool_events = [ToolEvent(event="tool_call_started", tool_name="query_recent_health_data", summary="Loading recent health records")]
        health_data = await self.tools.query_recent_health_data(user_id)
        tool_events.append(
            ToolEvent(
                event="tool_call_completed",
                tool_name="query_recent_health_data",
                summary=health_data.human_readable,
                payload=self._tool_payload(health_data),
            )
        )
        if not health_data.ok:
            return (
                *self._tool_failure_reply(
                    content="我现在无法从后端读取你的近期健康数据，所以这次没法给出有依据的训练建议。",
                    reasoning_summary="我在生成建议前停下来了，因为近期健康数据当前不可用。",
                    title="健康数据不可用",
                    description=health_data.human_readable,
                    bullets=["确认 backend 正在运行", "确认数据库里有近期日志", "恢复后再试一次"],
                    next_actions=["稍后重试", "先去 dashboard 确认日志是否存在", "等健康数据恢复后再问我"],
                ),
                tool_events,
            )

        latest_checkin = {}
        if isinstance(health_data.data.get("daily_checkins"), list) and health_data.data["daily_checkins"]:
            latest_checkin = health_data.data["daily_checkins"][0]
        fatigue = str(latest_checkin.get("fatigueLevel") or latest_checkin.get("fatigue_level") or "moderate")
        recovery = await self.tools.get_recovery_guidance(fatigue_level=fatigue)
        tool_events.append(
            ToolEvent(
                event="tool_call_completed",
                tool_name="get_recovery_guidance",
                summary=recovery.human_readable,
                payload=self._tool_payload(recovery),
            )
        )

        rendered = await self._render_with_llm(
            mode="health",
            user_text=request.text,
            context={"health_data": health_data.data, "recovery_guidance": recovery.data},
            fallback_content="从你最近的状态看，今天更适合控制负荷，先把恢复和基础活动做好，再判断要不要加训练量。",
            fallback_reasoning="我先看了最近睡眠、疲劳和训练记录，再决定今天是否更应该偏向恢复。",
            fallback_next_actions=["记录今天的睡眠和步数", "告诉我今晚还有没有 40 分钟训练窗口", "让我帮你微调这周计划"],
            fallback_card_title="今日建议",
            fallback_card_description="近期疲劳信号提示你先保护恢复，再考虑加量。",
            fallback_card_bullets=recovery.data.get("guidance", []),
        )
        cards = [
            Card(
                type="health_advice_card",
                title=rendered["card_title"],
                description=rendered["card_description"],
                bullets=rendered["card_bullets"],
            )
        ]
        return rendered["content"], rendered["reasoning_summary"], cards, rendered["next_actions"], tool_events

    async def _handle_plan(
        self,
        request: PostMessageRequest,
        user_id: str | None,
    ) -> tuple[str, str, list[Card], list[str], list[ToolEvent]]:
        tool_events = [ToolEvent(event="tool_call_started", tool_name="load_current_plan", summary="Loading current plan")]
        plan = await self.tools.load_current_plan(user_id)
        tool_events.append(
            ToolEvent(
                event="tool_call_completed",
                tool_name="load_current_plan",
                summary=plan.human_readable,
                payload=self._tool_payload(plan),
            )
        )
        if not plan.ok:
            return (
                *self._tool_failure_reply(
                    content="我现在拿不到当前训练计划，所以没法基于真实数据回答。",
                    reasoning_summary="当前计划读取失败，所以我先不做计划判断。",
                    title="训练计划不可用",
                    description=plan.human_readable,
                    bullets=["确认 backend 正在运行", "确认当前用户已经生成 active plan", "恢复后再试一次"],
                    next_actions=["去 dashboard 检查计划是否存在", "让我帮你生成新计划", "稍后重试"],
                ),
                tool_events,
            )

        days = plan.data.get("days", [])
        rendered = await self._render_with_llm(
            mode="plan",
            user_text=request.text,
            context={"current_plan": days},
            fallback_content="我已经看过当前 active plan 了。如果你愿意，我可以继续帮你把某一天改成恢复训练、补一条训练项，或整理成待确认提案。",
            fallback_reasoning="我先读取了当前 active plan，再给出基于真实计划的建议。",
            fallback_next_actions=["指定想调整的训练日", "告诉我目标是减量、恢复还是补练", "直接让我生成待确认提案"],
            fallback_card_title="当前计划概览",
            fallback_card_description="这里展示的是数据库中的 active 训练计划。",
            fallback_card_bullets=[
                f"{day.get('dayLabel') or day.get('day_label')}: {day.get('focus') or '未设置重点'}"
                for day in days[:4]
            ]
            or ["当前计划为空"],
        )
        cards = [
            Card(
                type="workout_plan_card",
                title=rendered["card_title"],
                description=rendered["card_description"],
                bullets=rendered["card_bullets"],
            )
        ]
        return rendered["content"], rendered["reasoning_summary"], cards, rendered["next_actions"], tool_events

    async def _handle_exercise(
        self,
        request: PostMessageRequest,
        user_id: str | None,
    ) -> tuple[str, str, list[Card], list[str], list[ToolEvent]]:
        del user_id
        tool_events = [ToolEvent(event="tool_call_started", tool_name="get_exercise_catalog", summary="Loading exercise catalog")]
        exercises = await self.tools.get_exercise_catalog()
        tool_events.append(
            ToolEvent(
                event="tool_call_completed",
                tool_name="get_exercise_catalog",
                summary=exercises.human_readable,
                payload=self._tool_payload(exercises),
            )
        )
        if not exercises.ok:
            return (
                *self._tool_failure_reply(
                    content="我现在拿不到动作库，所以没法基于数据库给你推荐动作替代。",
                    reasoning_summary="动作库读取失败，我先不编造练习建议。",
                    title="动作库不可用",
                    description=exercises.human_readable,
                    bullets=["确认 exercises 接口可用", "稍后重试", "也可以先描述你想替代的动作"],
                    next_actions=["告诉我你想替代哪个动作", "去 exercises 页面确认数据", "稍后重试"],
                ),
                tool_events,
            )

        items = exercises.data.get("items", [])
        rendered = await self._render_with_llm(
            mode="exercise",
            user_text=request.text,
            context={"exercise_catalog": items[:20]},
            fallback_content="我已经读取了动作库。你可以继续告诉我想替代哪个动作、器械限制是什么，或者让我按照你的目标推荐几个可选动作。",
            fallback_reasoning="我先检查了动作库，再给出替代建议会更稳妥。",
            fallback_next_actions=["告诉我你的目标肌群", "说明是否有器械限制", "直接问我某个动作的替代方案"],
            fallback_card_title="动作建议",
            fallback_card_description="这里是结合当前动作库整理出的可选方向。",
            fallback_card_bullets=[str(item.get("name") or "Unnamed exercise") for item in items[:5]] or ["动作库为空"],
        )
        cards = [
            Card(
                type="exercise_card",
                title=rendered["card_title"],
                description=rendered["card_description"],
                bullets=rendered["card_bullets"],
            )
        ]
        return rendered["content"], rendered["reasoning_summary"], cards, rendered["next_actions"], tool_events

    async def _handle_location(
        self,
        request: PostMessageRequest,
        user_id: str | None,
    ) -> tuple[str, str, list[Card], list[str], list[ToolEvent]]:
        del user_id
        tool_events: list[ToolEvent] = []
        latitude = request.latitude
        longitude = request.longitude
        if latitude is None or longitude is None:
            if not request.location_hint:
                return (
                    "如果你想让我找附近的健身房、公园或步道，请直接带上地点名，或者从前端把经纬度一并传过来。",
                    "位置检索需要一个明确地点，否则我无法调用地图搜索。",
                    [
                        Card(
                            type="place_result_card",
                            title="需要地点信息",
                            description="给我一个地点名或经纬度，我就可以帮你查附近训练地点。",
                            bullets=["例如：上海浦东张江", "或直接把前端定位打开"],
                        )
                    ],
                    ["补充地点名", "允许前端传定位", "告诉我你要找的是健身房还是公园"],
                    tool_events,
                )
            tool_events.append(ToolEvent(event="tool_call_started", tool_name="geocode_location", summary="Geocoding location"))
            geocoded = await self.tools.geocode_location(request.location_hint)
            tool_events.append(
                ToolEvent(
                    event="tool_call_completed",
                    tool_name="geocode_location",
                    summary=geocoded.human_readable,
                    payload=self._tool_payload(geocoded),
                )
            )
            if not geocoded.ok:
                return (
                    *self._tool_failure_reply(
                        content="我没能把这个地点解析成坐标，所以暂时不能继续搜索附近地点。",
                        reasoning_summary="附近地点搜索依赖坐标，这一步失败后我就先停下来了。",
                        title="地点解析失败",
                        description=geocoded.human_readable,
                        bullets=["检查地点名是否足够具体", "稍后重试", "也可以直接提供经纬度"],
                        next_actions=["换一个更具体的地点名", "直接发送定位", "稍后重试"],
                    ),
                    tool_events,
                )
            latitude = float(geocoded.data["latitude"])
            longitude = float(geocoded.data["longitude"])

        tool_events.append(ToolEvent(event="tool_call_started", tool_name="search_nearby_places", summary="Searching nearby places"))
        nearby = await self.tools.search_nearby_places(
            keyword="gym",
            latitude=latitude,
            longitude=longitude,
            location_hint=request.location_hint,
        )
        tool_events.append(
            ToolEvent(
                event="tool_call_completed",
                tool_name="search_nearby_places",
                summary=nearby.human_readable,
                payload=self._tool_payload(nearby),
            )
        )
        if not nearby.ok:
            return (
                *self._tool_failure_reply(
                    content="我没能完成附近地点搜索。",
                    reasoning_summary="地图搜索没有返回可用结果，所以先不推荐地点。",
                    title="附近地点搜索失败",
                    description=nearby.human_readable,
                    bullets=["确认 AMap 已配置", "稍后重试", "也可以先告诉我更具体的区域"],
                    next_actions=["补充更具体的位置", "稍后重试", "确认地图 API 配置"],
                ),
                tool_events,
            )

        ranked = sorted(nearby.data.get("places", []), key=compute_place_rank, reverse=True)
        top_places = ranked[:5]
        cards = [
            Card(
                type="place_result_card",
                title="附近训练地点",
                description="我按距离和可训练性做了一个简单排序。",
                bullets=[
                    f"{place.get('name')} | {place.get('distance_m')}m | {place.get('address') or '地址待确认'}"
                    for place in top_places
                ]
                or ["没有找到合适地点"],
            )
        ]
        return (
            "我已经帮你查了一轮附近可训练地点。你如果愿意，我还可以继续按力量训练、游泳或户外步道再细分推荐。",
            "我先解析了位置，再调用地图搜索，并按距离与训练适配度做了简单排序。",
            cards,
            ["告诉我你更偏好健身房还是户外", "如果要游泳场馆，我可以再筛一轮", "也可以换一个地点重新查"],
            tool_events,
        )

    async def process_message(
        self,
        thread_id: str,
        request: PostMessageRequest,
        user_id: str | None = None,
    ) -> PostMessageResponse:
        user_message = MessageRecord(id=str(uuid.uuid4()), role="user", content=request.text)
        await self.store.append_message(thread_id, user_message, user_id)

        write_domain = self._detect_write_domain(request.text)
        self.trace.log(thread_id=thread_id, user_id=user_id, text=request.text, write_domain=write_domain)

        if write_domain:
            context, tool_events = await self._load_write_context(write_domain, user_id)
            rendered = await self._render_write_proposals(write_domain, request.text, context)
            proposals, validation_warnings = self._validate_proposals(rendered["proposals"], context)
            next_actions = list(rendered["next_actions"])
            if validation_warnings:
                next_actions = [*validation_warnings, *next_actions][:3]

            run = self._build_run(
                thread_id=thread_id,
                risk_level=self._max_risk_level([proposal["riskLevel"] for proposal in proposals]) if proposals else "medium",
                tool_events=tool_events,
                cards=[],
                content=rendered["assistant_message"],
                reasoning_summary=rendered["reasoning_summary"],
            )
            await self.store.save_run(run, user_id)

            created_proposals = await self.store.create_proposals(thread_id, run.id, proposals, user_id) if proposals else []
            cards = [self._build_proposal_card(proposal) for proposal in created_proposals]
            message = await self._append_assistant_message(
                thread_id=thread_id,
                content=rendered["assistant_message"],
                reasoning_summary=rendered["reasoning_summary"],
                cards=cards,
                user_id=user_id,
            )
            return PostMessageResponse(
                id=message.id,
                content=message.content,
                reasoning_summary=message.reasoning_summary or rendered["reasoning_summary"],
                cards=cards,
                run_id=run.id,
                tool_events=tool_events,
                next_actions=next_actions,
                risk_level=run.risk_level,
            )

        if self._is_location_query(request.text):
            content, reasoning_summary, cards, next_actions, tool_events = await self._handle_location(request, user_id)
            risk_level = "low"
        elif self._is_exercise_query(request.text):
            content, reasoning_summary, cards, next_actions, tool_events = await self._handle_exercise(request, user_id)
            risk_level = "low"
        elif self._is_plan_query(request.text):
            content, reasoning_summary, cards, next_actions, tool_events = await self._handle_plan(request, user_id)
            risk_level = "medium"
        else:
            content, reasoning_summary, cards, next_actions, tool_events = await self._handle_health(request, user_id)
            risk_level = "medium"

        run = self._build_run(
            thread_id=thread_id,
            risk_level=risk_level,
            tool_events=tool_events,
            cards=cards,
            content=content,
            reasoning_summary=reasoning_summary,
        )
        await self.store.save_run(run, user_id)
        message = await self._append_assistant_message(thread_id, content, reasoning_summary, cards, user_id)

        return PostMessageResponse(
            id=message.id,
            content=message.content,
            reasoning_summary=message.reasoning_summary or reasoning_summary,
            cards=cards,
            run_id=run.id,
            tool_events=tool_events,
            next_actions=next_actions,
            risk_level=risk_level,
        )

    async def approve_proposal(self, proposal_id: str, user_id: str | None = None) -> ProposalDecisionResponse:
        proposal = await self.store.approve_proposal(proposal_id, user_id)
        execution = await self.tools.execute_agent_command(
            action_type=str(proposal["action_type"]),
            proposal_id=proposal_id,
            idempotency_key=str(uuid.uuid4()),
            user_id=user_id,
        )
        ok = execution.ok and bool(execution.data.get("ok", True))
        result_payload = execution.data.get("result") if isinstance(execution.data, dict) else execution.data
        status = str(execution.data.get("status") if isinstance(execution.data, dict) else "failed")
        description = "提案已经执行，相关数据库数据已更新。" if ok else execution.human_readable
        title = "提案已执行" if ok else "提案执行失败"
        content = (
            f"我已经执行了“{proposal['title']}”，你现在可以刷新 dashboard、计划页或日志页查看最新数据。"
            if ok
            else f"我尝试执行“{proposal['title']}”时失败了：{execution.human_readable}"
        )
        reasoning_summary = "提案已从确认态进入后端命令执行。" if ok else "后端命令执行失败，所以没有把这次动作视为成功写入。"
        cards = [self._build_result_card(proposal_id, title, description, result_payload, status)]
        message = await self._append_assistant_message(str(proposal["thread_id"]), content, reasoning_summary, cards, user_id)
        self.trace.log(proposal_id=proposal_id, action="approve", ok=ok, status=status)
        return ProposalDecisionResponse(
            id=message.id,
            content=message.content,
            reasoning_summary=reasoning_summary,
            cards=cards,
            proposal_id=proposal_id,
            status=status if ok else "failed",
        )

    async def reject_proposal(self, proposal_id: str, user_id: str | None = None) -> ProposalDecisionResponse:
        proposal = await self.store.reject_proposal(proposal_id, user_id)
        content = f"我已经拒绝了“{proposal['title']}”，数据库不会发生任何改动。"
        reasoning_summary = "这条提案被显式拒绝了，所以执行链路在审批阶段结束。"
        cards = [
            self._build_result_card(
                proposal_id=proposal_id,
                title="提案已拒绝",
                description="这次操作不会写入数据库。",
                result_payload=proposal.get("preview", {}),
                status="rejected",
            )
        ]
        message = await self._append_assistant_message(str(proposal["thread_id"]), content, reasoning_summary, cards, user_id)
        self.trace.log(proposal_id=proposal_id, action="reject", ok=True, status="rejected")
        return ProposalDecisionResponse(
            id=message.id,
            content=message.content,
            reasoning_summary=reasoning_summary,
            cards=cards,
            proposal_id=proposal_id,
            status="rejected",
        )
