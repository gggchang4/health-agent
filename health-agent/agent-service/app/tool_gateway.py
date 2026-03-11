from __future__ import annotations

import asyncio
import math
from typing import Any, Awaitable, Callable

import httpx

from .config import settings
from .models import ToolResponse

ToolHandler = Callable[..., Awaitable[ToolResponse]]


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

    async def get_user_profile(self, user_id: str = "user_demo") -> ToolResponse:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{settings.backend_base_url}/me", headers={"x-user-id": user_id}
                )
                response.raise_for_status()
                return ToolResponse(
                    ok=True,
                    data=response.json(),
                    human_readable="Loaded user profile from backend",
                    source="backend",
                )
        except Exception:
            return ToolResponse(
                ok=True,
                data={
                    "id": user_id,
                    "email": "demo@health-agent.local",
                    "profile": {
                        "currentWeightKg": 72.4,
                        "targetWeightKg": 67,
                        "trainingExperience": "novice",
                        "trainingDaysPerWeek": 4,
                        "equipmentAccess": "commercial_gym",
                        "limitations": "mild knee discomfort",
                    },
                },
                human_readable="Loaded fallback demo profile",
                source="fallback",
            )

    async def query_recent_health_data(self, user_id: str = "user_demo") -> ToolResponse:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                metrics, checkins, workouts = await asyncio.gather(
                    client.get(
                        f"{settings.backend_base_url}/logs/body-metrics",
                        headers={"x-user-id": user_id},
                    ),
                    client.get(
                        f"{settings.backend_base_url}/logs/daily-checkins",
                        headers={"x-user-id": user_id},
                    ),
                    client.get(
                        f"{settings.backend_base_url}/logs/workouts",
                        headers={"x-user-id": user_id},
                    ),
                )
                for response in [metrics, checkins, workouts]:
                    response.raise_for_status()
                return ToolResponse(
                    ok=True,
                    data={
                        "body_metrics": metrics.json(),
                        "daily_checkins": checkins.json(),
                        "workout_logs": workouts.json(),
                    },
                    human_readable="Loaded recent health data",
                    source="backend",
                )
        except Exception:
            return ToolResponse(
                ok=True,
                data={
                    "body_metrics": [{"weightKg": 72.4, "bodyFatPct": 18.1}],
                    "daily_checkins": [{"sleepHours": 6.2, "steps": 7250, "fatigueLevel": "moderate"}],
                    "workout_logs": [{"workoutType": "lower_body_strength", "fatigueAfter": "high"}],
                },
                human_readable="Loaded fallback demo health data",
                source="fallback",
            )

    async def load_current_plan(self, user_id: str = "user_demo") -> ToolResponse:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{settings.backend_base_url}/plans/current",
                    headers={"x-user-id": user_id},
                )
                response.raise_for_status()
                return ToolResponse(
                    ok=True,
                    data={"days": response.json()},
                    human_readable="Loaded current plan",
                    source="backend",
                )
        except Exception:
            return ToolResponse(
                ok=True,
                data={
                    "days": [
                        {"dayLabel": "Monday", "focus": "Upper body strength + core", "duration": "55 min"},
                        {"dayLabel": "Wednesday", "focus": "Knee-friendly lower body", "duration": "50 min"},
                    ]
                },
                human_readable="Loaded fallback demo plan",
                source="fallback",
            )

    async def get_exercise_catalog(self) -> ToolResponse:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{settings.backend_base_url}/exercises")
                response.raise_for_status()
                return ToolResponse(
                    ok=True,
                    data={"items": response.json()},
                    human_readable="Loaded exercise catalog",
                    source="backend",
                )
        except Exception:
            return ToolResponse(
                ok=True,
                data={
                    "items": [
                        {
                            "name": "Goblet squat",
                            "equipment": "Dumbbell / kettlebell",
                            "notes": [
                                "Keep torso stable",
                                "Track knees with toes",
                                "Switch to box squat if knees feel bad",
                            ],
                        },
                        {
                            "name": "Lat pulldown",
                            "equipment": "Cable machine",
                            "notes": [
                                "Depress shoulders first",
                                "Avoid shrugging",
                                "Pull toward upper chest",
                            ],
                        },
                    ]
                },
                human_readable="Loaded fallback exercise catalog",
                source="fallback",
            )

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
            human_readable="Generated recovery guidance",
            source="internal",
        )

    async def geocode_location(self, location: str) -> ToolResponse:
        if not settings.amap_api_key:
            return ToolResponse(
                ok=True,
                data={"location": location, "longitude": 121.4737, "latitude": 31.2304},
                human_readable="Using fallback geocode coordinates",
                source="fallback",
            )

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://restapi.amap.com/v3/geocode/geo",
                params={"key": settings.amap_api_key, "address": location},
            )
            response.raise_for_status()
            payload = response.json()
            geocodes = payload.get("geocodes", [])
            if not geocodes:
                return ToolResponse(
                    ok=False,
                    data={},
                    human_readable="Location not found",
                    source="amap",
                    error_code="location_not_found",
                )
            lng, lat = geocodes[0]["location"].split(",")
            return ToolResponse(
                ok=True,
                data={"location": location, "longitude": float(lng), "latitude": float(lat)},
                human_readable="Geocoded location via AMap",
                source="amap",
            )

    async def reverse_geocode(self, latitude: float, longitude: float) -> ToolResponse:
        if not settings.amap_api_key:
            return ToolResponse(
                ok=True,
                data={"formatted_address": "Jingan District, Shanghai"},
                human_readable="Using fallback reverse geocode",
                source="fallback",
            )

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://restapi.amap.com/v3/geocode/regeo",
                params={"key": settings.amap_api_key, "location": f"{longitude},{latitude}"},
            )
            response.raise_for_status()
            payload = response.json()
            return ToolResponse(
                ok=True,
                data={"formatted_address": payload.get("regeocode", {}).get("formatted_address", "")},
                human_readable="Reverse geocoded coordinates via AMap",
                source="amap",
            )

    async def search_nearby_places(
        self,
        keyword: str = "gym",
        latitude: float | None = None,
        longitude: float | None = None,
        location_hint: str | None = None,
    ) -> ToolResponse:
        if settings.amap_api_key and latitude is not None and longitude is not None:
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
                    human_readable="Searched nearby places via AMap",
                    source="amap",
                )

        anchor = location_hint or "Jingan District, Shanghai"
        demo_places = [
            {
                "name": "Luckeep Fitness",
                "distance_m": 650,
                "address": f"{anchor} Nanjing West Road",
                "business_hours": "24h",
                "tags": ["strength", "beginner_friendly"],
                "reason": "Best choice for a short commute",
            },
            {
                "name": "Super Monkey",
                "distance_m": 1100,
                "address": f"{anchor} Commercial Plaza",
                "business_hours": "06:00-23:00",
                "tags": ["classes", "cardio"],
                "reason": "Good option for cardio and class-based training",
            },
            {
                "name": "Personal Studio",
                "distance_m": 1600,
                "address": f"{anchor} Office Tower",
                "business_hours": "08:00-22:00",
                "tags": ["private_coaching", "strength"],
                "reason": "Useful if you want more guided strength training",
            },
        ]
        return ToolResponse(
            ok=True,
            data={"places": sorted(demo_places, key=lambda item: item["distance_m"])},
            human_readable="Loaded fallback nearby places",
            source="fallback",
        )


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
