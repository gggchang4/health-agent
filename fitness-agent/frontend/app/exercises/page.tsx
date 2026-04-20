import { ExerciseLibrarySearch } from "@/components/exercise-library-search";
import { getCurrentPlan, getExerciseCatalog } from "@/lib/api";
import { requireServerAuthToken } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const authToken = requireServerAuthToken();
  const [plan, exerciseCatalog] = await Promise.all([getCurrentPlan(authToken), getExerciseCatalog()]);
  const todayFocus = plan[0]?.focus ?? "上肢力量与核心";

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">动作库</span>
          <h2>动作库</h2>
        </div>
        <span className="mini-chip">先筛选，再看细节</span>
      </div>

      <ExerciseLibrarySearch catalog={exerciseCatalog} todayFocus={todayFocus} />
    </div>
  );
}
