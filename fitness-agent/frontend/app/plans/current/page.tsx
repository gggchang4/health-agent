import { PlanChecklist } from "@/components/plan-checklist";
import { getCurrentPlan } from "@/lib/api";
import { getServerAuthToken } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function CurrentPlanPage() {
  const authToken = getServerAuthToken();
  const plan = await getCurrentPlan(authToken);

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">计划</span>
          <h2>本周计划</h2>
        </div>
        <span className="mini-chip">执行优先</span>
      </div>

      <PlanChecklist plan={plan} />
    </div>
  );
}
