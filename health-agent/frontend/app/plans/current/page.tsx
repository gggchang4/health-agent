import { getCurrentPlan } from "@/lib/api";

export default async function CurrentPlanPage() {
  const plan = await getCurrentPlan();

  return (
    <div className="page">
      <section className="hero">
        <h2>当前训练计划</h2>
        <p>每一天包含热身、主训练、收尾有氧或拉伸，以及恢复提示。</p>
      </section>
      <section className="grid">
        {plan.map((day) => (
          <article className="card" key={day.dayLabel}>
            <div className="section-header">
              <div>
                <h3>{day.dayLabel}</h3>
                <p>{day.focus}</p>
              </div>
              <span className="pill">{day.duration}</span>
            </div>
            <ul>
              {day.exercises.map((exercise) => (
                <li key={exercise}>{exercise}</li>
              ))}
            </ul>
            <p className="muted">恢复提示：{day.recoveryTip}</p>
            <div className="actions">
              <button className="button secondary">完成了</button>
              <button className="button secondary">太累了</button>
              <button className="button secondary">换动作</button>
              <button className="button secondary">改时间</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

