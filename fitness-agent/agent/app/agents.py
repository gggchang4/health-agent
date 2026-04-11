from __future__ import annotations

import asyncio
import json
import logging
import uuid

from .config import settings
from .llm import OpenAICompatibleLLMClient
from .models import Card, MessageRecord, PostMessageRequest, PostMessageResponse, RunRecord, RunStep, ToolEvent
from .session_store import SessionStore
from .tool_gateway import ToolGateway, compute_place_rank
from .trace_logger import TraceLogger


logger = logging.getLogger("health_agent.runtime")


class HealthAgentRuntime:
    LOCATION_KEYWORDS = (
        "\u5065\u8eab\u623f",
        "\u9644\u8fd1",
        "\u5468\u56f4",
        "\u516c\u56ed",
        "\u6b65\u9053",
        "\u6e38\u6cf3\u9986",
    )
    PLAN_KEYWORDS = (
        "\u8ba1\u5212",
        "\u5b89\u6392",
        "\u8fd9\u5468",
        "\u91cd\u6392",
        "\u6539\u65f6\u95f4",
        "\u8bfe\u8868",
    )
    EXERCISE_KEYWORDS = (
        "\u52a8\u4f5c",
        "\u66ff\u4ee3",
        "\u6df1\u8e72",
        "\u5367\u63a8",
        "\u8bad\u7ec3\u52a8\u4f5c",
    )
    HIGH_RISK_KEYWORDS = (
        "\u80f8\u75db",
        "\u660f\u5385",
        "\u6781\u7aef\u51cf\u80a5",
        "\u7981\u98df",
        "\u836f",
        "\u5904\u65b9",
    )
    MEDIUM_RISK_KEYWORDS = (
        "\u75bc",
        "\u5934\u6655",
        "\u5f02\u5e38",
    )

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
    def _tool_payload(tool_response) -> dict:
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

    async def _render_with_llm(
        self,
        mode: str,
        user_text: str,
        context: dict,
        fallback_content: str,
        fallback_reasoning: str,
        fallback_next_actions: list[str],
        fallback_card_title: str,
        fallback_card_description: str,
        fallback_card_bullets: list[str],
    ) -> dict:
        if not self.llm.is_enabled():
            logger.warning(
                "[AGENT] LLM disabled for mode=%s. Returning fallback response.",
                mode,
            )
            return {
                "content": "The LLM is not configured, so the agent could not generate a model-backed response.",
                "reasoning_summary": "The agent stopped because no LLM API key or client is configured.",
                "next_actions": [
                    "Add a valid LLM API key",
                    "Restart the agent service",
                    "Try the same request again",
                ],
                "card_title": "LLM unavailable",
                "card_description": "No model request was sent because the LLM client is not configured.",
                "card_bullets": [
                    "Reason: missing API key or invalid client setup",
                    f"Mode: {mode}",
                    "No fallback coaching content was used",
                ],
                "llm_ok": False,
            }

        system_prompt = (
            "You are Health Agent, a non-medical health and fitness coach. "
            f"Reply in {self._detect_reply_language(user_text)}. "
            "Do not switch to any third language. "
            "Never provide diagnosis, prescriptions, or extreme weight-loss advice. "
            "Return JSON only with keys: content, reasoning_summary, next_actions, "
            "card_title, card_description, card_bullets. "
            "reasoning_summary must be short, user-safe, and must not reveal hidden chain-of-thought."
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
        except Exception as exc:
            self.trace.log(mode=mode, llm_error=str(exc), llm_used=False)
            logger.warning(
                "[AGENT] LLM request failed for mode=%s. Returning explicit error response. Error=%s",
                mode,
                exc,
            )
            return {
                "content": "The LLM request failed, so the agent could not generate a model-backed response.",
                "reasoning_summary": "The agent stopped because the model provider did not return a usable response.",
                "next_actions": [
                    "Check the agent terminal for the exact provider error",
                    "Retry after the network or provider recovers",
                    "Switch to another model if the current one is rate-limited",
                ],
                "card_title": "LLM request failed",
                "card_description": f"Reason: {type(exc).__name__}: {exc}",
                "card_bullets": [
                    f"Mode: {mode}",
                    "No fallback coaching content was used",
                    "The response shown is an error state, not a real coaching answer",
                ],
                "llm_ok": False,
            }

        content = str(result.get("content") or fallback_content)
        reasoning_summary = str(result.get("reasoning_summary") or fallback_reasoning)
        next_actions = result.get("next_actions") or fallback_next_actions
        card_title = str(result.get("card_title") or fallback_card_title)
        card_description = str(result.get("card_description") or fallback_card_description)
        card_bullets = result.get("card_bullets") or fallback_card_bullets

        if not isinstance(next_actions, list):
            next_actions = fallback_next_actions
        else:
            next_actions = [str(item) for item in next_actions[:3]]

        if not isinstance(card_bullets, list):
            card_bullets = fallback_card_bullets
        else:
            card_bullets = [str(item) for item in card_bullets[:5]]

        self.trace.log(mode=mode, llm_used=True)
        logger.info("[AGENT] LLM response accepted for mode=%s.", mode)
        return {
            "content": content,
            "reasoning_summary": reasoning_summary,
            "next_actions": next_actions,
            "card_title": card_title,
            "card_description": card_description,
            "card_bullets": card_bullets,
            "llm_ok": True,
        }

    async def process_message(self, thread_id: str, request: PostMessageRequest) -> PostMessageResponse:
        logger.info(
            "[AGENT] Frontend message received thread_id=%s chars=%s location_hint=%s",
            thread_id,
            len(request.text),
            request.location_hint or "",
        )
        self.store.append_message(
            thread_id,
            MessageRecord(id=f"msg_{uuid.uuid4().hex[:10]}", role="user", content=request.text),
        )

        intent = self._detect_intent(request.text, request.location_hint)
        risk_level = self._detect_risk_level(request.text)
        tool_events: list[ToolEvent] = []
        cards: list[Card] = []
        next_actions: list[str] = []
        reasoning_summary = ""
        content = ""

        if risk_level == "high":
            reasoning_summary = "The input crossed a safety boundary, so the system stopped proactive training advice."
            content = (
                "This request looks high risk. I cannot continue with aggressive training or weight-loss advice. "
                "Pause high-intensity work and consult a doctor or an in-person professional."
            )
            cards.append(
                Card(
                    type="recovery_card",
                    title="Safety reminder",
                    description="High-risk inputs switch the system into conservative mode.",
                    bullets=["Stop adding load", "Avoid training through pain", "Escalate offline if needed"],
                )
            )
        elif intent == "location":
            content, reasoning_summary, cards, next_actions, tool_events = await self._handle_location(request)
        elif intent == "plan":
            content, reasoning_summary, cards, next_actions, tool_events = await self._handle_plan(request)
        elif intent == "exercise":
            content, reasoning_summary, cards, next_actions, tool_events = await self._handle_exercise(request)
        else:
            content, reasoning_summary, cards, next_actions, tool_events = await self._handle_health(request)

        run_steps = [
            RunStep(
                id=f"step_{uuid.uuid4().hex[:10]}",
                step_type="thinking_summary",
                title="Reasoning summary",
                payload={"summary": reasoning_summary},
            )
        ]
        for event in tool_events:
            run_steps.append(
                RunStep(
                    id=f"step_{uuid.uuid4().hex[:10]}",
                    step_type=event.event,
                    title=event.tool_name,
                    payload={"summary": event.summary, **event.payload},
                )
            )
        for card in cards:
            run_steps.append(
                RunStep(
                    id=f"step_{uuid.uuid4().hex[:10]}",
                    step_type="card_render",
                    title=card.title,
                    payload=card.model_dump(),
                )
            )
        run_steps.append(
            RunStep(
                id=f"step_{uuid.uuid4().hex[:10]}",
                step_type="final_message",
                title="Assistant final message",
                payload={"content": content},
            )
        )

        run = RunRecord(
            id=f"run_{uuid.uuid4().hex[:10]}",
            thread_id=thread_id,
            risk_level=risk_level,
            steps=run_steps,
        )
        self.store.save_run(run)

        message = MessageRecord(
            id=f"msg_{uuid.uuid4().hex[:10]}",
            role="assistant",
            content=content,
            reasoning_summary=reasoning_summary,
            cards=cards,
        )
        self.store.append_message(thread_id, message)
        self.trace.log(thread_id=thread_id, intent=intent, risk_level=risk_level, input=request.text)
        logger.info(
            "[AGENT] Completed request thread_id=%s intent=%s risk=%s next_actions=%s",
            thread_id,
            intent,
            risk_level,
            len(next_actions),
        )

        return PostMessageResponse(
            id=message.id,
            content=content,
            reasoning_summary=reasoning_summary,
            cards=cards,
            run_id=run.id,
            tool_events=tool_events,
            next_actions=next_actions,
            risk_level=risk_level,
        )

    async def _handle_health(
        self, request: PostMessageRequest
    ) -> tuple[str, str, list[Card], list[str], list[ToolEvent]]:
        tool_events = [
            ToolEvent(
                event="tool_call_started",
                tool_name="query_recent_health_data",
                summary="Loading recent health records",
            )
        ]
        health_data = await self.tools.invoke("query_recent_health_data")
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
                    content="I could not load your recent health records from the backend, so I cannot give a grounded training recommendation right now.",
                    reasoning_summary="The system stopped before coaching because recent health records were unavailable.",
                    title="Health data unavailable",
                    description=health_data.human_readable,
                    bullets=[
                        "Make sure the backend API is running.",
                        "Confirm the database contains recent logs.",
                        "Retry once the health-data endpoints respond normally.",
                    ],
                    next_actions=[
                        "Retry after the backend recovers",
                        "Open the dashboard to confirm your logs exist",
                        "Ask me again once health data is available",
                    ],
                ),
                tool_events,
            )
        fatigue = (
            health_data.data.get("daily_checkins", [{}])[0].get("fatigueLevel")
            or health_data.data.get("daily_checkins", [{}])[0].get("fatigue_level")
            or "moderate"
        )
        recovery = await self.tools.invoke("get_recovery_guidance", fatigue_level=fatigue)
        tool_events.append(
            ToolEvent(
                event="tool_call_completed",
                tool_name="get_recovery_guidance",
                summary=recovery.human_readable,
                payload=self._tool_payload(recovery),
            )
        )

        fallback_reasoning = (
            "I combined recent sleep, fatigue, and workout data before deciding whether today should bias toward recovery."
        )
        fallback_content = (
            "Based on your recent status, today should stay controlled. Handle recovery and basic activity first, "
            "then decide whether extra training is still worth it."
        )
        fallback_next_actions = [
            "Log today's sleep and steps",
            "Tell me whether you still have a 40-minute training window tonight",
            "Ask me to re-balance this week's plan",
        ]
        rendered = await self._render_with_llm(
            mode="health",
            user_text=request.text,
            context={
                "health_data": health_data.data,
                "recovery_guidance": recovery.data,
            },
            fallback_content=fallback_content,
            fallback_reasoning=fallback_reasoning,
            fallback_next_actions=fallback_next_actions,
            fallback_card_title="Today",
            fallback_card_description="Recent fatigue signals suggest protecting consistency instead of adding more load.",
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
        self, request: PostMessageRequest
    ) -> tuple[str, str, list[Card], list[str], list[ToolEvent]]:
        tool_events = [
            ToolEvent(event="tool_call_started", tool_name="get_user_profile", summary="Loading training profile")
        ]
        profile = await self.tools.invoke("get_user_profile")
        tool_events.append(
            ToolEvent(
                event="tool_call_completed",
                tool_name="get_user_profile",
                summary=profile.human_readable,
                payload=self._tool_payload(profile),
            )
        )
        if not profile.ok:
            return (
                *self._tool_failure_reply(
                    content="I could not load your training profile from the backend, so I cannot build a personalized plan yet.",
                    reasoning_summary="The system stopped before plan guidance because the training profile was unavailable.",
                    title="Profile unavailable",
                    description=profile.human_readable,
                    bullets=[
                        "Make sure the backend API is running.",
                        "Check that a user profile exists in the database.",
                        "Retry after the profile endpoint responds normally.",
                    ],
                    next_actions=[
                        "Open profile and confirm your data is saved",
                        "Retry once the backend responds",
                        "Ask me to build the plan again after that",
                    ],
                ),
                tool_events,
            )
        plan = await self.tools.invoke("load_current_plan")
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
                    content="I could not load the current plan from the backend, so I cannot safely adjust or summarize it.",
                    reasoning_summary="The system stopped before plan advice because the current plan was unavailable.",
                    title="Plan unavailable",
                    description=plan.human_readable,
                    bullets=[
                        "Make sure an active plan exists in the database.",
                        "Check that the plan endpoint is returning data.",
                        "Retry after the backend responds normally.",
                    ],
                    next_actions=[
                        "Generate a plan in the app first",
                        "Retry after the backend responds",
                        "Ask me to summarize the plan again",
                    ],
                ),
                tool_events,
            )

        fallback_reasoning = (
            "I loaded your training experience, equipment constraints, and the current plan before deciding whether to reuse or rework the week."
        )
        fallback_content = (
            "I assembled a weekly fat-loss training outline that keeps four training windows and treats knee discomfort conservatively."
        )
        fallback_next_actions = [
            "Turn Wednesday into a recovery day",
            "Tell me how many days you can train this week",
            "Switch the plan to a home-training version",
        ]
        days = plan.data.get("days", [])
        rendered = await self._render_with_llm(
            mode="plan",
            user_text=request.text,
            context={
                "profile": profile.data,
                "plan_days": days,
            },
            fallback_content=fallback_content,
            fallback_reasoning=fallback_reasoning,
            fallback_next_actions=fallback_next_actions,
            fallback_card_title="This week",
            fallback_card_description="The schedule balances strength work and low-intensity cardio while protecting recovery.",
            fallback_card_bullets=[
                f"{day.get('dayLabel')} - {day.get('focus')} - {day.get('duration')}"
                for day in days[:4]
            ],
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
        self, request: PostMessageRequest
    ) -> tuple[str, str, list[Card], list[str], list[ToolEvent]]:
        tool_events = [
            ToolEvent(event="tool_call_started", tool_name="get_exercise_catalog", summary="Loading exercise catalog")
        ]
        catalog = await self.tools.invoke("get_exercise_catalog")
        tool_events.append(
            ToolEvent(
                event="tool_call_completed",
                tool_name="get_exercise_catalog",
                summary=catalog.human_readable,
                payload=self._tool_payload(catalog),
            )
        )
        if not catalog.ok:
            return (
                *self._tool_failure_reply(
                    content="I could not load the exercise catalog from the backend, so I cannot recommend a grounded substitution right now.",
                    reasoning_summary="The system stopped before exercise advice because the exercise catalog was unavailable.",
                    title="Exercise catalog unavailable",
                    description=catalog.human_readable,
                    bullets=[
                        "Make sure the backend API is running.",
                        "Check that exercises are seeded in the database.",
                        "Retry after the exercise endpoint responds normally.",
                    ],
                    next_actions=[
                        "Retry after the backend recovers",
                        "Open the exercise library to confirm data exists",
                        "Ask again once the catalog is available",
                    ],
                ),
                tool_events,
            )

        exercise = catalog.data.get("items", [{}])[0]
        reasoning_summary = (
            "I pulled the answer from structured exercise content first so the model is not inventing technique or substitutions."
        )
        content = (
            "If knee discomfort is part of the picture, I would bias toward knee-friendly lower-body choices while keeping enough glute and leg stimulus."
        )
        cards = [
            Card(
                type="exercise_card",
                title=str(exercise.get("name", "Exercise recommendation")),
                description=f"Equipment: {exercise.get('equipment', 'unknown')}.",
                bullets=exercise.get("notes", ["Use a box squat or glute bridge if needed."]),
            )
        ]
        next_actions = [
            "Give me a home variation",
            "Show me a same-muscle alternative",
            "Explain why this fits a fat-loss phase",
        ]
        return content, reasoning_summary, cards, next_actions, tool_events

    async def _handle_location(
        self, request: PostMessageRequest
    ) -> tuple[str, str, list[Card], list[str], list[ToolEvent]]:
        tool_events: list[ToolEvent] = []
        location_hint = request.location_hint

        if request.latitude is None or request.longitude is None:
            if not location_hint:
                return (
                    *self._tool_failure_reply(
                        content="I need a city, district, or live coordinates before I can search for nearby gyms.",
                        reasoning_summary="The system did not run location search because no usable location was provided.",
                        title="Location required",
                        description="Nearby place search now requires a real location instead of a built-in default area.",
                        bullets=[
                            "Provide a city or district name.",
                            "Or send latitude and longitude.",
                            "Then ask for nearby gyms again.",
                        ],
                        next_actions=[
                            "Tell me your city or district",
                            "Share your coordinates",
                            "Ask for non-location fitness advice instead",
                        ],
                    ),
                    tool_events,
                )
            tool_events.append(
                ToolEvent(event="tool_call_started", tool_name="geocode_location", summary="Resolving search area")
            )
            geocoded = await self.tools.invoke("geocode_location", location=location_hint)
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
                        content="I could not resolve that location, so I cannot search for nearby gyms honestly.",
                        reasoning_summary="The system stopped before location advice because geocoding did not return a usable search area.",
                        title="Location lookup unavailable",
                        description=geocoded.human_readable,
                        bullets=[
                            "Check whether AMap is configured.",
                            "Try a more specific location name.",
                            "Retry once location lookup is available.",
                        ],
                        next_actions=[
                            "Provide a more specific location",
                            "Configure AMap if you need nearby place search",
                            "Ask again after location lookup works",
                        ],
                    ),
                    tool_events,
                )
            latitude = geocoded.data.get("latitude")
            longitude = geocoded.data.get("longitude")
        else:
            latitude = request.latitude
            longitude = request.longitude

        tool_events.append(
            ToolEvent(event="tool_call_started", tool_name="search_nearby_places", summary="Searching nearby gyms")
        )
        places_result = await self.tools.invoke(
            "search_nearby_places",
            keyword="gym",
            latitude=latitude,
            longitude=longitude,
            location_hint=location_hint,
        )
        tool_events.append(
            ToolEvent(
                event="tool_call_completed",
                tool_name="search_nearby_places",
                summary=places_result.human_readable,
                payload=self._tool_payload(places_result),
            )
        )
        if not places_result.ok:
            return (
                *self._tool_failure_reply(
                    content="I could not search nearby gyms from live map data, so I will not fabricate place recommendations.",
                    reasoning_summary="The system stopped before location recommendations because the map-search dependency was unavailable.",
                    title="Nearby place search unavailable",
                    description=places_result.human_readable,
                    bullets=[
                        "Check whether AMap is configured.",
                        "Confirm location lookup returned valid coordinates.",
                        "Retry after the map service responds normally.",
                    ],
                    next_actions=[
                        "Retry after map search is configured",
                        "Give me a city or district instead",
                        "Ask for training advice that does not require maps",
                    ],
                ),
                tool_events,
            )
        ranked_places = sorted(
            places_result.data.get("places", []),
            key=compute_place_rank,
            reverse=True,
        )[:3]

        fallback_reasoning = (
            "I searched around the provided location and ranked nearby gyms by distance plus strength-training relevance."
        )
        fallback_content = (
            "I filtered a few nearby gyms that look better for regular strength training or fat-loss execution. "
            "I can keep narrowing them by distance, hours, or equipment."
        )
        fallback_next_actions = [
            "Only show 24h options",
            "Sort by the closest commute",
            "Find the most beginner-friendly strength gym",
        ]
        rendered = await self._render_with_llm(
            mode="location",
            user_text=request.text,
            context={
                "location_hint": location_hint,
                "places": ranked_places,
            },
            fallback_content=fallback_content,
            fallback_reasoning=fallback_reasoning,
            fallback_next_actions=fallback_next_actions,
            fallback_card_title="Nearby gyms",
            fallback_card_description="Ranked by distance and strength-training relevance.",
            fallback_card_bullets=[
                f"{place['name']} - {place['distance_m']}m - {place['business_hours']}"
                for place in ranked_places
            ],
        )
        cards = [
            Card(
                type="reasoning_summary_card",
                title=rendered["card_title"],
                description=rendered["card_description"],
                bullets=rendered["card_bullets"],
            )
        ] + [
            Card(
                type="place_result_card",
                title=place["name"],
                description=f"{place['address']} - {place['distance_m']}m - {place['business_hours']}",
                bullets=[*place.get("tags", []), place.get("reason", "")],
            )
            for place in ranked_places
        ]
        return rendered["content"], rendered["reasoning_summary"], cards, rendered["next_actions"], tool_events

    @staticmethod
    def _detect_intent(text: str, location_hint: str | None = None) -> str:
        lowered = text.lower()
        if any(keyword in text for keyword in HealthAgentRuntime.LOCATION_KEYWORDS) or any(
            keyword in lowered for keyword in ["gym", "nearby", "around me", "park", "swimming"]
        ):
            return "location"
        if location_hint and any(token in lowered for token in ["where", "around", "near"]) or (
            location_hint and "?" in text
        ):
            return "location"
        if any(keyword in text for keyword in HealthAgentRuntime.PLAN_KEYWORDS) or any(
            keyword in lowered for keyword in ["plan", "schedule", "reschedule", "this week"]
        ):
            return "plan"
        if any(keyword in text for keyword in HealthAgentRuntime.EXERCISE_KEYWORDS) or any(
            keyword in lowered for keyword in ["exercise", "swap", "squat", "bench"]
        ):
            return "exercise"
        return "health"

    @staticmethod
    def _detect_risk_level(text: str) -> str:
        lowered = text.lower()
        if any(keyword in text for keyword in HealthAgentRuntime.HIGH_RISK_KEYWORDS) or any(
            keyword in lowered for keyword in ["chest pain", "faint", "medication", "prescription"]
        ):
            return "high"
        if any(keyword in text for keyword in HealthAgentRuntime.MEDIUM_RISK_KEYWORDS) or any(
            keyword in lowered for keyword in ["pain", "dizzy", "abnormal"]
        ):
            return "medium"
        return "low"
