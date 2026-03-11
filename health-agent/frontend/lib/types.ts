export type CardType =
  | "health_advice_card"
  | "workout_plan_card"
  | "exercise_card"
  | "recovery_card"
  | "place_result_card"
  | "reasoning_summary_card"
  | "tool_activity_card";

export type RunStepType =
  | "thinking_summary"
  | "tool_call_started"
  | "tool_call_completed"
  | "card_render"
  | "final_message";

export interface AgentCard {
  type: CardType;
  title: string;
  description: string;
  bullets?: string[];
}

export interface ToolEvent {
  event: "tool_call_started" | "tool_call_completed";
  tool_name: string;
  summary: string;
  payload?: Record<string, unknown>;
  created_at?: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoningSummary?: string;
  cards?: AgentCard[];
}

export interface CreateThreadResponse {
  threadId: string;
}

export interface PostMessageResponse {
  id: string;
  role: "assistant";
  content: string;
  reasoningSummary: string;
  cards: AgentCard[];
  runId: string;
  toolEvents: ToolEvent[];
  nextActions: string[];
  riskLevel: "low" | "medium" | "high";
}

export interface RunStepEventPayload {
  id: string;
  step_type: RunStepType;
  title: string;
  payload: Record<string, unknown>;
  created_at?: string;
}

export interface StreamEvent {
  event: RunStepType;
  data: RunStepEventPayload;
}

export interface DashboardSnapshot {
  weightTrend: string;
  weeklyCompletionRate: string;
  todayFocus: string;
  recoveryStatus: string;
}

export interface WorkoutPlanDay {
  dayLabel: string;
  focus: string;
  duration: string;
  exercises: string[];
  recoveryTip: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  targetMuscles: string[];
  equipment: string;
  level: string;
  notes: string[];
}
