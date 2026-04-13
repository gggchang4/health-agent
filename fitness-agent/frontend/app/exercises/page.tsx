import { ExerciseLibrarySearch } from "@/components/exercise-library-search";
import { getCurrentPlan, getExerciseCatalog } from "@/lib/api";

export default async function ExercisesPage() {
  const [plan, exerciseCatalog] = await Promise.all([getCurrentPlan(), getExerciseCatalog()]);
  const todayFocus = plan[0]?.focus ?? "Full body strength";

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Library</span>
          <h2>Exercise Library</h2>
        </div>
        <span className="mini-chip">Loaded from the exercise table in PostgreSQL</span>
      </div>

      <ExerciseLibrarySearch catalog={exerciseCatalog} todayFocus={todayFocus} />
    </div>
  );
}
