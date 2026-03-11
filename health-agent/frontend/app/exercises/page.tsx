import { getExercises } from "@/lib/api";

export default async function ExercisesPage() {
  const exercises = await getExercises();

  return (
    <div className="page">
      <section className="hero">
        <h2>动作库</h2>
        <p>结构化动作知识是 agent 推荐训练内容的稳定来源，不依赖模型即时编造。</p>
      </section>
      <section className="grid two">
        {exercises.map((exercise) => (
          <article className="card" key={exercise.id}>
            <div className="section-header">
              <div>
                <h3>{exercise.name}</h3>
                <p>{exercise.equipment}</p>
              </div>
              <span className="pill">{exercise.level}</span>
            </div>
            <p className="muted">目标肌群：{exercise.targetMuscles.join(" / ")}</p>
            <ul>
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

