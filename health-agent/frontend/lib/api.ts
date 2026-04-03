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
const demoRuns = new Map<string, StreamEvent[]>();

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
    weightTrend: "近 14 天体重下降 1.1 kg",
    weeklyCompletionRate: "本周计划完成率 75%",
    todayFocus: "恢复一般，优先保证步数、补水和睡眠，不要为了完成计划而硬加训练量。",
    recoveryStatus: "恢复状态中等，可做轻到中等强度训练"
  });
}

export async function getCurrentPlan(): Promise<WorkoutPlanDay[]> {
  return safeJson(`${backendBaseUrl}/plans/current`, undefined, [
    {
      dayLabel: "周一",
      focus: "上肢力量与核心稳定",
      duration: "55 分钟",
      exercises: ["卧推 4x8", "高位下拉 4x10", "哑铃划船 3x10", "Dead bug 3 组"],
      recoveryTip: "训练后补水，并安排 8 分钟拉伸。"
    },
    {
      dayLabel: "周三",
      focus: "低冲击下肢与恢复有氧",
      duration: "35 分钟",
      exercises: ["快走 35 分钟", "臀桥 3x15"],
      recoveryTip: "今晚尽量保证 7 小时以上睡眠。"
    },
    {
      dayLabel: "周五",
      focus: "全身循环训练与步数补齐",
      duration: "45 分钟",
      exercises: ["高脚杯深蹲 4x10", "俯卧撑 3x12", "壶铃硬拉 3x12", "坡度步行 12 分钟"],
      recoveryTip: "如果疲劳偏高，可先下调一档重量。"
    },
    {
      dayLabel: "周日",
      focus: "主动恢复与灵活性整理",
      duration: "30 分钟",
      exercises: ["动态拉伸 10 分钟", "低强度单车 15 分钟", "呼吸与放松 5 分钟"],
      recoveryTip: "把这天当作下一周执行率的启动器。"
    }
  ]);
}

export async function getExercises(): Promise<ExerciseItem[]> {
  return safeJson(`${backendBaseUrl}/exercises`, undefined, [
    {
      id: "goblet-squat",
      name: "高脚杯深蹲",
      targetMuscles: ["股四头肌", "臀部", "核心"],
      equipment: "哑铃或壶铃",
      level: "新手友好",
      notes: [
        "先稳住躯干，再下蹲",
        "膝盖方向尽量跟脚尖一致",
        "如果膝部不适，可以改成箱式深蹲"
      ]
    },
    {
      id: "lat-pulldown",
      name: "高位下拉",
      targetMuscles: ["背阔肌", "上背部"],
      equipment: "拉力器",
      level: "新手到初中级",
      notes: ["先沉肩再发力", "避免耸肩代偿", "把横杆拉向上胸位置"]
    }
  ]);
}

function buildDemoResponse(text: string): RawPostMessageResponse {
  const input = text.toLowerCase();
  const runId = `run-demo-${Date.now()}`;

  if (
    input.includes("健身房") ||
    input.includes("附近") ||
    input.includes("gym") ||
    input.includes("around me")
  ) {
    const response: RawPostMessageResponse = {
      id: `assistant-demo-${Date.now()}`,
      role: "assistant",
      content:
        "你附近更适合新手力量训练的选择，优先看器械完整度、晚高峰拥挤程度和是否有自由重量区。根据当前偏恢复优先的状态，建议先选距离近、上手成本低的场馆。",
      reasoning_summary: "识别为位置检索请求，优先查询附近场馆并按新手友好程度排序。",
      cards: [
        {
          type: "place_result_card",
          title: "附近健身房推荐",
          description: "优先选择 10-15 分钟内可达、器械完整、动线清晰的场馆。",
          bullets: ["A 场馆：自由重量区完整", "B 场馆：晚高峰较少", "C 场馆：适合新手入门"]
        }
      ],
      run_id: runId,
      tool_events: [
        {
          event: "tool_call_started",
          tool_name: "search_nearby_places",
          summary: "正在检索附近健身房。"
        },
        {
          event: "tool_call_completed",
          tool_name: "search_nearby_places",
          summary: "已返回附近场馆结果，并按适配程度整理。"
        }
      ],
      next_actions: ["查看地图距离", "筛选营业时间", "加入收藏"],
      risk_level: "low"
    };

    demoRuns.set(runId, buildDemoEvents(response));
    return response;
  }

  if (
    input.includes("计划") ||
    input.includes("安排") ||
    input.includes("4天") ||
    input.includes("plan")
  ) {
    const response: RawPostMessageResponse = {
      id: `assistant-demo-${Date.now()}`,
      role: "assistant",
      content:
        "已经按照 4 天减脂训练的目标，为你安排了更容易执行的周结构：上肢力量、低冲击下肢、全身循环和主动恢复。周三晚不可训练的限制已经避开。",
      reasoning_summary: "识别为训练计划请求，结合训练频次与时间限制，先保证连续性，再安排训练量。",
      cards: [
        {
          type: "workout_plan_card",
          title: "本周 4 天训练框架",
          description: "围绕减脂执行率和恢复节奏设计，避免把所有训练堆在前半周。",
          bullets: ["周一：上肢力量", "周二：休息或步数补齐", "周四：低冲击下肢", "周六：全身循环"]
        },
        {
          type: "recovery_card",
          title: "恢复提醒",
          description: "如果睡眠继续偏低，优先下调训练密度，而不是勉强完成全部动作。",
          bullets: ["连续 2 天睡眠不足时下调重量", "把步行当作恢复的一部分"]
        }
      ],
      run_id: runId,
      tool_events: [
        {
          event: "tool_call_started",
          tool_name: "get_user_profile",
          summary: "正在读取档案和可训练频次。"
        },
        {
          event: "tool_call_completed",
          tool_name: "load_current_plan",
          summary: "已完成计划重排并生成新结构。"
        }
      ],
      next_actions: ["确认时间安排", "替换不适动作", "保存当前版本"],
      risk_level: "low"
    };

    demoRuns.set(runId, buildDemoEvents(response));
    return response;
  }

  const response: RawPostMessageResponse = {
    id: `assistant-demo-${Date.now()}`,
    role: "assistant",
    content:
      "从你描述的状态看，今天更适合做轻到中等强度训练，或者直接转为恢复优先。睡眠不足叠加腿部酸痛时，不建议再追求高强度下肢刺激。",
    reasoning_summary: "识别为恢复建议请求，优先参考睡眠、疲劳和疼痛线索，给出保守决策。",
    cards: [
      {
        type: "health_advice_card",
        title: "今晚怎么练更稳妥",
        description: "如果一定要练，优先选择上肢、核心或低冲击有氧，不要继续做高负荷腿部训练。",
        bullets: ["主训练量下调 20%-30%", "避免爆发跳跃与重深蹲", "结束后补水并提早睡眠"]
      },
      {
        type: "reasoning_summary_card",
        title: "为什么这样判断",
        description: "睡眠不足会拉低恢复质量，腿部仍酸说明局部恢复也未完成。",
        bullets: ["短睡眠降低训练准备度", "局部酸痛提示负荷残留"]
      }
    ],
    run_id: runId,
    tool_events: [
      {
        event: "tool_call_started",
        tool_name: "query_recent_health_data",
        summary: "正在读取最近睡眠、步数和训练日志。"
      },
      {
        event: "tool_call_completed",
        tool_name: "query_recent_health_data",
        summary: "已完成近期状态整理，并进入建议生成。"
      }
    ],
    next_actions: ["改为恢复日", "查询替代动作", "让系统下调本周计划"],
    risk_level: "low"
  };

  demoRuns.set(runId, buildDemoEvents(response));
  return response;
}

function buildDemoEvents(response: RawPostMessageResponse): StreamEvent[] {
  const now = new Date().toISOString();
  const steps: StreamEvent[] = [
    {
      event: "thinking_summary",
      data: {
        id: `${response.run_id}-thinking`,
        step_type: "thinking_summary",
        title: "识别用户意图",
        payload: {
          summary: response.reasoning_summary
        },
        created_at: now
      }
    }
  ];

  response.tool_events.forEach((event, index) => {
    steps.push({
      event: event.event,
      data: {
        id: `${response.run_id}-tool-${index}`,
        step_type: event.event,
        title: event.tool_name,
        payload: {
          summary: event.summary
        },
        created_at: now
      }
    });
  });

  response.cards.forEach((card, index) => {
    steps.push({
      event: "card_render",
      data: {
        id: `${response.run_id}-card-${index}`,
        step_type: "card_render",
        title: card.title,
        payload: {
          type: card.type,
          title: card.title,
          description: card.description,
          bullets: card.bullets ?? []
        },
        created_at: now
      }
    });
  });

  steps.push({
    event: "final_message",
    data: {
      id: `${response.run_id}-final`,
      step_type: "final_message",
      title: "生成最终回复",
      payload: {
        content: response.content
      },
      created_at: now
    }
  });

  return steps;
}

async function playDemoRun(runId: string, onEvent: (event: StreamEvent) => void): Promise<void> {
  const events = demoRuns.get(runId) ?? [];
  for (const event of events) {
    await new Promise((resolve) => setTimeout(resolve, event.event === "final_message" ? 260 : 180));
    onEvent(event);
  }
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
  try {
    const result = await safeJson<RawPostMessageResponse>(
      `${agentBaseUrl}/agent/threads/${threadId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      }
    );

    return mapPostMessageResponse(result);
  } catch {
    return mapPostMessageResponse(buildDemoResponse(text));
  }
}

export async function streamRun(
  runId: string,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  try {
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
  } catch {
    await playDemoRun(runId, onEvent);
  }
}
