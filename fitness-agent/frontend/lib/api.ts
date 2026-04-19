import type {
  AgentCard,
  BodyMetricLog,
  CreateThreadResponse,
  DashboardSnapshot,
  DailyCheckin,
  DietRecommendationSnapshot,
  ExerciseItem,
  HealthProfile,
  PostMessageResponse,
  RunStepEventPayload,
  StreamEvent,
  ToolEvent,
  UserSnapshot,
  WorkoutLog,
  WorkoutPlanDay
} from "@/lib/types";
import type { ExerciseCatalogItem } from "@/lib/exercise-catalog";
import { readAuthUserId } from "@/lib/auth";

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const agentBaseUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8000";

interface RawAgentCard {
  type: AgentCard["type"];
  title: string;
  description: string;
  bullets?: string[];
}

interface RawToolEvent {
  event: ToolEvent["event"];
  tool_name: string;
  summary: string;
  payload?: Record<string, unknown>;
  created_at?: string;
}

interface RawPostMessageResponse {
  id: string;
  role: "assistant";
  content: string;
  reasoning_summary: string;
  cards: RawAgentCard[];
  run_id: string;
  tool_events: RawToolEvent[];
  next_actions: string[];
  risk_level: "low" | "medium" | "high";
}

interface RawUserSnapshot {
  id: string;
  name: string;
  email: string;
  profile?: HealthProfile | null;
}

interface RawDatabaseExercise {
  id: string;
  name: string;
  targetMuscles: string[];
  equipment: string;
  level: string;
  steps?: string[];
  commonMistakes?: string[];
  contraindicates?: string[];
  recoveryNotes?: string[];
}

interface RequestOptions {
  userId?: string;
}

function resolveUserId(userId?: string) {
  if (userId) {
    return userId;
  }

  return readAuthUserId() ?? undefined;
}

function buildHeaders(headers?: HeadersInit, userId?: string) {
  const mergedHeaders = new Headers(headers);

  if (userId) {
    mergedHeaders.set("x-user-id", userId);
  }

  return mergedHeaders;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit, options?: RequestOptions): Promise<T> {
  let response: Response;
  const userId = resolveUserId(options?.userId);

  try {
    response = await fetch(input, {
      ...init,
      cache: "no-store",
      headers: buildHeaders(init?.headers, userId)
    });
  } catch (error) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : "";
    const serviceLabel = url.startsWith(agentBaseUrl) ? "agent service" : "backend API";
    const serviceUrl = url.startsWith(agentBaseUrl) ? agentBaseUrl : backendBaseUrl;
    const reason = error instanceof Error ? error.message : "unknown network error";

    throw new Error(
      `Unable to reach the ${serviceLabel} at ${serviceUrl}. Start that service and try again. Original error: ${reason}`
    );
  }

  if (!response.ok) {
    let detail = "";

    try {
      const rawText = await response.text();
      if (!rawText) {
        detail = "";
      } else {
        try {
          const parsed = JSON.parse(rawText) as { message?: string | string[] };
          detail = Array.isArray(parsed.message) ? parsed.message.join("; ") : parsed.message ?? rawText;
        } catch {
          detail = rawText;
        }
      }
    } catch {
      detail = "";
    }

    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function mapCard(card: RawAgentCard): AgentCard {
  return {
    type: card.type,
    title: card.title,
    description: card.description,
    bullets: card.bullets ?? []
  };
}

function mapToolEvent(event: RawToolEvent): ToolEvent {
  return {
    event: event.event,
    tool_name: event.tool_name,
    summary: event.summary,
    payload: event.payload,
    created_at: event.created_at
  };
}

function mapPostMessageResponse(response: RawPostMessageResponse): PostMessageResponse {
  return {
    id: response.id,
    role: response.role,
    content: response.content,
    reasoningSummary: response.reasoning_summary,
    cards: (response.cards ?? []).map(mapCard),
    runId: response.run_id,
    toolEvents: (response.tool_events ?? []).map(mapToolEvent),
    nextActions: response.next_actions ?? [],
    riskLevel: response.risk_level
  };
}

function mapUserSnapshot(user: RawUserSnapshot): UserSnapshot {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile ?? null
  };
}

function sanitizeEquipmentKey(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "other";
}

function derivePrimaryGroup(targetMuscles: string[]) {
  const joined = targetMuscles.join(" ").toLowerCase();

  if (joined.includes("cardio")) return "Cardio";
  if (
    joined.includes("quad") ||
    joined.includes("glute") ||
    joined.includes("hamstring") ||
    joined.includes("calf")
  ) {
    return "Legs";
  }
  if (joined.includes("core") || joined.includes("ab")) return "Core";
  if (joined.includes("lat") || joined.includes("back") || joined.includes("trap")) return "Back";
  if (joined.includes("chest") || joined.includes("pec")) return "Chest";
  if (joined.includes("shoulder") || joined.includes("delt")) return "Shoulders";
  if (joined.includes("bicep") || joined.includes("tricep") || joined.includes("forearm")) return "Arms";
  return "Full body";
}

function deriveSecondaryGroup(targetMuscles: string[]) {
  const first = targetMuscles[0];
  if (!first) {
    return "General";
  }

  return first
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapDatabaseExercise(item: RawDatabaseExercise): ExerciseCatalogItem {
  const primaryGroup = derivePrimaryGroup(item.targetMuscles ?? []);
  const secondaryGroup = deriveSecondaryGroup(item.targetMuscles ?? []);
  const category = primaryGroup === "Cardio" ? "Cardio" : "Strength";
  const mechanic = (item.targetMuscles?.length ?? 0) > 1 ? "Compound" : "Isolation";
  const notes = [...(item.commonMistakes ?? []), ...(item.contraindicates ?? []), ...(item.recoveryNotes ?? [])];

  return {
    id: item.id,
    name: item.name,
    primaryGroup,
    secondaryGroup,
    targetMuscles: item.targetMuscles ?? [],
    equipment: item.equipment,
    equipmentKey: sanitizeEquipmentKey(item.equipment),
    level: item.level,
    summary: `${category} exercise for ${item.targetMuscles.join(", ")}.`,
    prescription:
      category === "Cardio"
        ? "20-40 min"
        : mechanic === "Compound"
          ? "3-5 sets x 6-10 reps"
          : "3-4 sets x 10-15 reps",
    cues: item.steps ?? [],
    notes: notes.length > 0 ? notes : ["No additional notes yet."],
    category,
    mechanic,
    force: null,
    searchText: [item.name, primaryGroup, secondaryGroup, item.equipment, item.level, ...(item.targetMuscles ?? [])]
      .join(" ")
      .toLowerCase()
  };
}

export async function getMe(userId?: string): Promise<UserSnapshot> {
  const user = await requestJson<RawUserSnapshot>(`${backendBaseUrl}/me`, undefined, { userId });
  return mapUserSnapshot(user);
}

export async function getBodyMetrics(userId?: string): Promise<BodyMetricLog[]> {
  return requestJson<BodyMetricLog[]>(`${backendBaseUrl}/logs/body-metrics`, undefined, { userId });
}

export async function getDailyCheckins(userId?: string): Promise<DailyCheckin[]> {
  return requestJson<DailyCheckin[]>(`${backendBaseUrl}/logs/daily-checkins`, undefined, { userId });
}

export async function getWorkoutLogs(userId?: string): Promise<WorkoutLog[]> {
  return requestJson<WorkoutLog[]>(`${backendBaseUrl}/logs/workouts`, undefined, { userId });
}

export async function getDashboard(userId?: string): Promise<DashboardSnapshot> {
  return requestJson<DashboardSnapshot>(`${backendBaseUrl}/dashboard`, undefined, { userId });
}

export async function getCurrentPlan(userId?: string): Promise<WorkoutPlanDay[]> {
  return requestJson<WorkoutPlanDay[]>(`${backendBaseUrl}/plans/current`, undefined, { userId });
}

type PlanDayPayload = {
  dayLabel: string;
  focus: string;
  duration: string;
  exercises: string[];
  recoveryTip: string;
};

type UpdatePlanDayPayload = Partial<PlanDayPayload> & {
  isCompleted?: boolean;
};

export async function createCurrentPlanDay(payload: PlanDayPayload, userId?: string): Promise<WorkoutPlanDay> {
  return requestJson<WorkoutPlanDay>(`${backendBaseUrl}/plans/current/day`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, { userId });
}

export async function updateCurrentPlanDay(
  dayId: string,
  payload: UpdatePlanDayPayload,
  userId?: string
): Promise<WorkoutPlanDay> {
  return requestJson<WorkoutPlanDay>(`${backendBaseUrl}/plans/current/day/${dayId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, { userId });
}

export async function deleteCurrentPlanDay(dayId: string, userId?: string): Promise<{ ok: boolean; id: string }> {
  return requestJson<{ ok: boolean; id: string }>(`${backendBaseUrl}/plans/current/day/${dayId}`, {
    method: "DELETE"
  }, { userId });
}

export async function getTodayDietRecommendation(userId?: string): Promise<DietRecommendationSnapshot> {
  return requestJson<DietRecommendationSnapshot>(`${backendBaseUrl}/diet-recommendation/today`, undefined, {
    userId
  });
}

export async function getExercises(): Promise<ExerciseItem[]> {
  return getExerciseCatalog();
}

export async function getExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
  const items = await requestJson<RawDatabaseExercise[]>(`${backendBaseUrl}/exercises`);
  return items.map(mapDatabaseExercise);
}

export async function createThread(): Promise<CreateThreadResponse> {
  const result = await requestJson<{ thread_id: string }>(`${agentBaseUrl}/agent/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  return { threadId: result.thread_id };
}

export async function postMessage(threadId: string, text: string): Promise<PostMessageResponse> {
  const result = await requestJson<RawPostMessageResponse>(`${agentBaseUrl}/agent/threads/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  return mapPostMessageResponse(result);
}

export async function streamRun(
  runId: string,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const response = await fetch(`${agentBaseUrl}/agent/runs/${runId}/stream`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawFinalMessage = false;

  const processChunk = (chunk: string) => {
    const lines = chunk.split("\n");
    const eventLine = lines.find((line) => line.startsWith("event:"));
    const dataLine = lines.find((line) => line.startsWith("data:"));

    if (!eventLine || !dataLine) {
      return;
    }

    const event = eventLine.slice(6).trim() as StreamEvent["event"];
    const data = JSON.parse(dataLine.slice(5).trim()) as RunStepEventPayload;
    onEvent({ event, data });

    if (event === "final_message") {
      sawFinalMessage = true;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      processChunk(chunk);

      if (sawFinalMessage) {
        await reader.cancel();
        return;
      }
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    processChunk(trailing);
  }
}
