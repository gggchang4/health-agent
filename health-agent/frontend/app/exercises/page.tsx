import { getExercises } from "@/lib/api";

const focusGroups = ["推 Push", "拉 Pull", "下肢 Lower", "核心 Core", "活动度 Mobility"];
const swapRows = [
  ["深蹲模式", "高脚杯深蹲 -> 箱式深蹲"],
  ["下拉模式", "高位下拉 -> 胸托划船"],
  ["有氧替换", "单车 -> 坡走"]
];

export default async function ExercisesPage() {
  const exercises = await getExercises();

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Library</span>
          <h2>动作库</h2>
        </div>
        <span className="mini-chip">结构化</span>
      </div>

      <section className="exercise-library-top">
        <div className="profile-card">
          <div className="section-copy">
            <span className="section-label">Focus</span>
            <h3>为快速替换而建</h3>
            <p className="muted">先把动作库做小、做清楚，替换动作时才不会打断训练节奏。</p>
          </div>
          <div className="profile-tags">
            {focusGroups.map((group) => (
              <span className="profile-tag" key={group}>
                {group}
              </span>
            ))}
          </div>
        </div>

        <aside className="profile-card">
          <div className="section-copy">
            <span className="section-label">Swap ideas</span>
            <h3>快速替换</h3>
          </div>
          <div className="exercise-swap-list">
            {swapRows.map(([label, value]) => (
              <div className="exercise-swap-row" key={label}>
                <span className="metric-label">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="exercise-grid">
        {exercises.map((exercise) => (
          <article className="exercise-panel" key={exercise.id}>
            <div className="exercise-head">
              <div>
                <span className="section-label">{exercise.equipment}</span>
                <h3>{exercise.name}</h3>
              </div>
              <span className="mini-chip">{exercise.level}</span>
            </div>
            <p className="muted">目标肌群：{exercise.targetMuscles.join(" / ")}</p>
            <ul className="exercise-notes">
              {exercise.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
