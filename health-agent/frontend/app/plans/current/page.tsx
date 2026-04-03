import { PlanChecklist } from "@/components/plan-checklist";
import { getCurrentPlan } from "@/lib/api";

export default async function CurrentPlanPage() {
  const plan = await getCurrentPlan();

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Plan</span>
          <h2>本周计划</h2>
        </div>
        <span className="mini-chip">执行优先</span>
      </div>

      <PlanChecklist plan={plan} />
    </div>
  );
}
