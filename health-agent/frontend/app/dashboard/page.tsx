import { getDashboard, getCurrentPlan } from "@/lib/api";
import { InfoCard } from "@/components/cards";

export default async function DashboardPage() {
  const [snapshot, plan] = await Promise.all([getDashboard(), getCurrentPlan()]);

  return (
    <div className="page">
      <section className="hero">
        <h2>仪表盘</h2>
        <p>围绕减脂执行率、恢复状态和本周训练节奏展示可行动信息。</p>
      </section>

      <section className="grid three">
        <div className="card stat">
          <span className="muted">体重趋势</span>
          <strong>{snapshot.weightTrend}</strong>
        </div>
        <div className="card stat">
          <span className="muted">训练完成率</span>
          <strong>{snapshot.weeklyCompletionRate}</strong>
        </div>
        <div className="card stat">
          <span className="muted">恢复状态</span>
          <strong>{snapshot.recoveryStatus}</strong>
        </div>
      </section>

      <section className="grid two">
        <InfoCard title="今日重点" description={snapshot.todayFocus} />
        <InfoCard
          title="本周计划预览"
          description="训练计划由 agent 生成，可根据疲劳、睡眠和时间变化动态调整。"
          bullets={plan.map((day) => `${day.dayLabel} · ${day.focus} · ${day.duration}`)}
        />
      </section>
    </div>
  );
}

