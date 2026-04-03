import { getCurrentPlan } from "@/lib/api";

export default async function CurrentPlanPage() {
  const plan = await getCurrentPlan();

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Plan</span>
          <h2>本周清单</h2>
        </div>
        <span className="mini-chip">Execution first</span>
      </div>

      <div className="dash-grid">
        <section className="todo-list">
          {plan.map((day, index) => (
            <article className={`todo-item ${index === 0 ? "done" : ""}`} key={day.dayLabel}>
              <span className="todo-check" />
              <div className="todo-main">
                <span className="todo-meta">{day.dayLabel}</span>
                <h3>{day.focus}</h3>
                <p>{day.exercises.slice(0, 2).join(" / ")}</p>
                <span className="todo-note">{day.recoveryTip}</span>
              </div>
              <span className="plan-duration">{day.duration}</span>
            </article>
          ))}
        </section>

        <aside className="plan-aside">
          <span className="section-label">Quick</span>
          <div className="action-row">
            <button className="button">完成今天</button>
            <button className="ghost-button">换动作</button>
            <button className="ghost-button">改时间</button>
          </div>
          <p className="muted">保持极简，让计划看起来像一条清楚的执行线。</p>
        </aside>
      </div>
    </div>
  );
}
