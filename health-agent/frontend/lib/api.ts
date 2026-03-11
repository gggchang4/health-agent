import {
  AgentCard,
  CreateThreadResponse,
  DashboardSnapshot,
  ExerciseItem,
  PostMessageResponse,
  RunStepEventPayload,
  StreamEvent,
  ToolEvent,
  WorkoutPlanDay
} from "@/lib/types";

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

async function safeJson<T>(input: RequestInfo, init?: RequestInit, fallback?: T): Promise<T> {
  try {
    const response = await fetch(input, { ...init, cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } catch {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error("Request failed");
  }
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

export async function getDashboard(): Promise<DashboardSnapshot> {
  return safeJson(`${backendBaseUrl}/dashboard`, undefined, {
    weightTrend: "Weight is down 1.1 kg over the last 2 weeks.",
    weeklyCompletionRate: "Weekly completion rate: 75%",
    todayFocus: "Protect recovery, keep steps up, and avoid unnecessary load.",
    recoveryStatus: "Recovery status is moderate."
  });
}

export async function getCurrentPlan(): Promise<WorkoutPlanDay[]> {
  return safeJson(`${backendBaseUrl}/plans/current`, undefined, [
    {
      dayLabel: "Monday",
      focus: "Upper body strength and core",
      duration: "55 min",
      exercises: ["Bench press 4x8", "Lat pulldown 4x10", "Dumbbell row 3x10", "Dead bug 3 sets"],
      recoveryTip: "Rehydrate and add 8 minutes of stretching."
    },
    {
      dayLabel: "Wednesday",
      focus: "Low-impact lower body and recovery cardio",
      duration: "35 min",
      exercises: ["Brisk walk 35 min", "Glute bridge 3x15"],
      recoveryTip: "Try to sleep at least 7 hours tonight."
    }
  ]);
}

export async function getExercises(): Promise<ExerciseItem[]> {
  return safeJson(`${backendBaseUrl}/exercises`, undefined, [
    {
      id: "goblet-squat",
      name: "Goblet squat",
      targetMuscles: ["Quads", "Glutes", "Core"],
      equipment: "Dumbbell or kettlebell",
      level: "Beginner",
      notes: [
        "Keep your torso stable",
        "Track knees with toes",
        "Use a box squat if your knees feel uncomfortable"
      ]
    },
    {
      id: "lat-pulldown",
      name: "Lat pulldown",
      targetMuscles: ["Lats", "Upper back"],
      equipment: "Cable machine",
      level: "Beginner to novice",
      notes: ["Depress shoulders first", "Avoid shrugging", "Pull toward the upper chest"]
    }
  ]);
}

export async function createThread(): Promise<CreateThreadResponse> {
  const result = await safeJson<{ thread_id: string }>(
    `${agentBaseUrl}/agent/threads`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    },
    { thread_id: `thread-demo-${Date.now()}` }
  );

  return { threadId: result.thread_id };
}

export async function postMessage(threadId: string, text: string): Promise<PostMessageResponse> {
  const result = await safeJson<RawPostMessageResponse>(
    `${agentBaseUrl}/agent/threads/${threadId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }
  );

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
    throw new Error("Stream failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      const eventLine = lines.find((line) => line.startsWith("event:"));
      const dataLine = lines.find((line) => line.startsWith("data:"));

      if (!eventLine || !dataLine) {
        continue;
      }

      const event = eventLine.slice(6).trim() as StreamEvent["event"];
      const data = JSON.parse(dataLine.slice(5).trim()) as RunStepEventPayload;
      onEvent({ event, data });
    }
  }
}
