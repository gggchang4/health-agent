import { getExercises } from "@/lib/api";

export default async function ExercisesPage() {
  const exercises = await getExercises();

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Library</span>
          <h2>动作库</h2>
        </div>
        <span className="mini-chip">Structured</span>
      </div>

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
