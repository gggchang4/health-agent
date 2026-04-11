from __future__ import annotations

import asyncio
import logging
import math
from typing import Any, Awaitable, Callable

import httpx

from .config import settings
from .models import ToolResponse

ToolHandler = Callable[..., Awaitable[ToolResponse]]
logger = logging.getLogger("health_agent.tools")


class ToolGateway:
    def __init__(self) -> None:
        self._tools: dict[str, ToolHandler] = {
            "get_user_profile": self.get_user_profile,
            "query_recent_health_data": self.query_recent_health_data,
            "load_current_plan": self.load_current_plan,
            "get_exercise_catalog": self.get_exercise_catalog,
            "get_recovery_guidance": self.get_recovery_guidance,
            "geocode_location": self.geocode_location,
            "reverse_geocode": self.reverse_geocode,
            "search_nearby_places": self.search_nearby_places,
        }

    async def invoke(self, tool_name: str, **kwargs: Any) -> ToolResponse:
        handler = self._tools[tool_name]
        return await handler(**kwargs)

    @staticmethod
    def _backend_headers(user_id: str | None) -> dict[str, str]:
        return {"x-user-id": user_id} if user_id else {}

    @staticmethod
    def _backend_failure(action: str, exc: Exception) -> ToolResponse:
        if isinstance(exc, httpx.HTTPStatusError):
            status = exc.response.status_code
            return ToolResponse(
                ok=False,
                data={"status_code": status},
                human_readable=f"Backend request failed while trying to {action} (HTTP {status}).",
                source="backend",
                error_code="backend_request_failed",
                retryable=status >= 500,
            )

        return ToolResponse(
            ok=False,
            data={},
            human_readable=f"Unable to reach the backend while trying to {action}.",
            source="backend",
            error_code="backend_unavailable",
            retryable=True,
        )

    @staticmethod
    def _amap_not_configured(action: str) -> ToolResponse:
        return ToolResponse(
            ok=False,
            data={},
            human_readable=f"AMap is not configured, so the service cannot {action}.",
            source="amap",
            error_code="amap_not_configured",
            retryable=False,
        )

    @staticmethod
    def _amap_failure(action: str, exc: Exception) -> ToolResponse:
        if isinstance(exc, httpx.HTTPStatusError):
            status = exc.response.status_code
            return ToolResponse(
                ok=False,
                data={"status_code": status},
                human_readable=f"AMap request failed while trying to {action} (HTTP {status}).",
                source="amap",
                error_code="amap_request_failed",
                retryable=status >= 500,
            )

        return ToolResponse(
            ok=False,
            data={},
            human_readable=f"Unable to reach AMap while trying to {action}.",
            source="amap",
            error_code="amap_unavailable",
            retryable=True,
        )

    async def get_user_profile(self, user_id: str | None = None) -> ToolResponse:
        try:
            logger.info("[TOOLS] Requesting user profile from backend user_id=%s", user_id or "default")
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{settings.backend_base_url}/me",
                    headers=self._backend_headers(user_id),
                )
                response.raise_for_status()
                logger.info("[TOOLS] Backend user profile loaded successfully from PostgreSQL-backed API.")
                return ToolResponse(
                    ok=True,
                    data=response.json(),
                    human_readable="Loaded user profile from backend.",
                    source="backend",
                )
        except Exception as exc:
            return self._backend_failure("load the user profile", exc)

    async def query_recent_health_data(self, user_id: str | None = None) -> ToolResponse:
        try:
            logger.info("[TOOLS] Requesting recent health data from backend user_id=%s", user_id or "default")
            async with httpx.AsyncClient(timeout=10) as client:
                metrics, checkins, workouts = await asyncio.gather(
                    client.get(
                        f"{settings.backend_base_url}/logs/body-metrics",
                        headers=self._backend_headers(user_id),
                    ),
                    client.get(
                        f"{settings.backend_base_url}/logs/daily-checkins",
                        headers=self._backend_headers(user_id),
                    ),
                    client.get(
                        f"{settings.backend_base_url}/logs/workouts",
                        headers=self._backend_headers(user_id),
                    ),
                )
                for response in [metrics, checkins, workouts]:
                    response.raise_for_status()
                logger.info("[TOOLS] Recent health data loaded successfully from PostgreSQL-backed API.")
                return ToolResponse(
                    ok=True,
                    data={
                        "body_metrics": metrics.json(),
                        "daily_checkins": checkins.json(),
                        "workout_logs": workouts.json(),
                    },
                    human_readable="Loaded recent health data from backend.",
                    source="backend",
                )
        except Exception as exc:
            return self._backend_failure("load recent health data", exc)

    async def load_current_plan(self, user_id: str | None = None) -> ToolResponse:
        try:
            logger.info("[TOOLS] Requesting current plan from backend user_id=%s", user_id or "default")
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{settings.backend_base_url}/plans/current",
                    headers=self._backend_headers(user_id),
                )
                response.raise_for_status()
                logger.info("[TOOLS] Current plan loaded successfully from PostgreSQL-backed API.")
                return ToolResponse(
                    ok=True,
                    data={"days": response.json()},
                    human_readable="Loaded the current training plan from backend.",
                    source="backend",
                )
        except Exception as exc:
            return self._backend_failure("load the current plan", exc)

    async def get_exercise_catalog(self) -> ToolResponse:
        try:
            logger.info("[TOOLS] Requesting exercise catalog from backend.")
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{settings.backend_base_url}/exercises")
                response.raise_for_status()
                logger.info("[TOOLS] Exercise catalog loaded successfully from PostgreSQL-backed API.")
                return ToolResponse(
                    ok=True,
                    data={"items": response.json()},
                    human_readable="Loaded the exercise catalog from backend.",
                    source="backend",
                )
        except Exception as exc:
            return self._backend_failure("load the exercise catalog", exc)

    async def get_recovery_guidance(self, fatigue_level: str = "moderate") -> ToolResponse:
        guidance_map = {
            "high": ["Reduce total volume", "Prioritize sleep", "Do low-intensity activity only"],
            "moderate": ["Control training intensity", "Add 8-10 minutes of stretching"],
            "low": ["You can keep the plan as-is", "Keep steps and hydration on target"],
        }
        bullets = guidance_map.get(fatigue_level, guidance_map["moderate"])
        return ToolResponse(
            ok=True,
            data={"fatigue_level": fatigue_level, "guidance": bullets},
            human_readable="Generated recovery guidance.",
            source="internal",
        )

    async def geocode_location(self, location: str) -> ToolResponse:
        if not settings.amap_api_key:
            logger.warning("[TOOLS] Geocode request skipped because AMap is not configured.")
            return self._amap_not_configured("resolve a location")

        try:
            logger.info("[TOOLS] Sending geocode request to AMap for location=%s", location)
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    "https://restapi.amap.com/v3/geocode/geo",
                    params={"key": settings.amap_api_key, "address": location},
                )
                response.raise_for_status()
                payload = response.json()
                geocodes = payload.get("geocodes", [])
                if not geocodes:
                    logger.warning("[TOOLS] AMap returned no geocode result for location=%s", location)
                    return ToolResponse(
                        ok=False,
                        data={},
                        human_readable="Location not found in AMap.",
                        source="amap",
                        error_code="location_not_found",
                        retryable=False,
                    )
                lng, lat = geocodes[0]["location"].split(",")
                logger.info("[TOOLS] AMap geocode response received for location=%s", location)
                return ToolResponse(
                    ok=True,
                    data={"location": location, "longitude": float(lng), "latitude": float(lat)},
                    human_readable="Geocoded location via AMap.",
                    source="amap",
                )
        except Exception as exc:
            return self._amap_failure("resolve a location", exc)

    async def reverse_geocode(self, latitude: float, longitude: float) -> ToolResponse:
        if not settings.amap_api_key:
            logger.warning("[TOOLS] Reverse geocode request skipped because AMap is not configured.")
            return self._amap_not_configured("reverse geocode coordinates")

        try:
            logger.info("[TOOLS] Sending reverse geocode request to AMap lat=%s lng=%s", latitude, longitude)
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    "https://restapi.amap.com/v3/geocode/regeo",
                    params={"key": settings.amap_api_key, "location": f"{longitude},{latitude}"},
                )
                response.raise_for_status()
                payload = response.json()
                logger.info("[TOOLS] AMap reverse geocode response received.")
                return ToolResponse(
                    ok=True,
                    data={"formatted_address": payload.get("regeocode", {}).get("formatted_address", "")},
                    human_readable="Reverse geocoded coordinates via AMap.",
                    source="amap",
                )
        except Exception as exc:
            return self._amap_failure("reverse geocode coordinates", exc)

    async def search_nearby_places(
        self,
        keyword: str = "gym",
        latitude: float | None = None,
        longitude: float | None = None,
        location_hint: str | None = None,
    ) -> ToolResponse:
        if not settings.amap_api_key:
            logger.warning("[TOOLS] Nearby place search skipped because AMap is not configured.")
            return self._amap_not_configured("search nearby places")

        if latitude is None or longitude is None:
            logger.warning("[TOOLS] Nearby place search skipped because coordinates were missing.")
            return ToolResponse(
                ok=False,
                data={"location_hint": location_hint or ""},
                human_readable="Coordinates are required before searching nearby places.",
                source="amap",
                error_code="missing_coordinates",
                retryable=False,
            )

        try:
            logger.info(
                "[TOOLS] Sending nearby place search to AMap keyword=%s lat=%s lng=%s",
                keyword,
                latitude,
                longitude,
            )
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    "https://restapi.amap.com/v3/place/around",
                    params={
                        "key": settings.amap_api_key,
                        "location": f"{longitude},{latitude}",
                        "keywords": keyword,
                        "radius": 3000,
                        "offset": 5,
                        "extensions": "all",
                    },
                )
                response.raise_for_status()
                payload = response.json()
                pois = payload.get("pois", [])
                logger.info("[TOOLS] AMap nearby place search returned %s place(s).", len(pois))
                places = [
                    {
                        "name": poi.get("name"),
                        "distance_m": int(poi.get("distance", "0") or 0),
                        "address": poi.get("address", ""),
                        "business_hours": poi.get("business_area", ""),
                        "tags": [keyword],
                        "reason": "Close enough for regular training",
                    }
                    for poi in pois
                ]
                return ToolResponse(
                    ok=True,
                    data={"places": places},
                    human_readable="Searched nearby places via AMap.",
                    source="amap",
                )
        except Exception as exc:
            return self._amap_failure("search nearby places", exc)


def distance_score(distance_m: int) -> float:
    return max(0.0, 1 - distance_m / 3000)


def compute_place_rank(place: dict[str, Any]) -> float:
    score = distance_score(int(place.get("distance_m", 3000)))
    tags = place.get("tags", [])
    if any(tag in ["strength", "beginner_friendly", "private_coaching"] for tag in tags):
        score += 0.2
    if "24h" in place.get("business_hours", ""):
        score += 0.1
    return math.floor(score * 100) / 100
