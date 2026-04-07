import { ActivityRings } from "@/components/activity-rings";
import { DietPlateCard } from "@/components/diet-plate-card";
import { getCurrentPlan, getDashboard, getTodayDietRecommendation } from "@/lib/api";

const goalLabelByType: Record<string, string> = {
  fat_loss: "减脂",
  muscle_gain: "增肌",
  maintenance: "维持"
};

export default async function DashboardPage() {
  const [snapshot, plan, recommendation] = await Promise.all([
    getDashboard(),
    getCurrentPlan(),
    getTodayDietRecommendation()
  ]);

  const todayPlan = plan[0];
  const rings = [
    { slug: "move", label: "消耗", value: 76, note: "今日已消耗 612 kcal", accent: "#d53832" },
    { slug: "load", label: "负荷", value: 64, note: "已完成 18 组训练", accent: "#20202a" },
    { slug: "focus", label: "专注", value: 82, note: "计划执行质量 82%", accent: "#8f9199" }
  ];
  const burnValues = [38, 52, 66, 48, 74, 61, 83];
  const calorieGap = recommendation.targetCalorie - recommendation.totalCalorie;
  const calorieStatus = calorieGap >= 0 ? "热量缺口" : "热量盈余";

  const summaryRows = [
    {
      label: "恢复",
      value: snapshot.recoveryStatus,
      meta: "准备度 76"
    },
    {
      label: "饮食",
      value: `${goalLabelByType[recommendation.userGoal] ?? recommendation.userGoal} · ${calorieStatus}`,
      meta: `${recommendation.totalCalorie}/${recommendation.targetCalorie} kcal`
    },
    {
      label: "计划",
      value: todayPlan?.focus ?? "今日训练待同步",
      meta: todayPlan?.duration ?? "休息日"
    }
  ];

  return (
    <div className="page">
      <div className="page-header-compact dashboard-header">
        <div>
          <span className="section-label">Dashboard</span>
          <h2>今日总览</h2>
        </div>
        <div className="chip-row">
          <span className="mini-chip">{snapshot.weeklyCompletionRate}</span>
          <span className="status-pill live">已同步</span>
        </div>
      </div>

      <section className="dash-grid dashboard-refined">
        <div className="viz-wrap dashboard-main">
          <ActivityRings rings={rings} />
          <DietPlateCard recommendation={recommendation} />
        </div>

        <aside className="viz-wrap dashboard-rail">
          <section className="dashboard-summary-panel">
            <div className="section-copy">
              <span className="section-label">Today</span>
              <h3>关键状态</h3>
            </div>

            <div className="dashboard-summary-list">
              {summaryRows.map((item) => (
                <div className="dashboard-summary-row" key={item.label}>
                  <span>{item.label}</span>
                  <div>
                    <strong>{item.value}</strong>
                    <small>{item.meta}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-burn-panel">
            <div className="section-copy">
              <span className="section-label">Burn</span>
              <h3>7 日趋势</h3>
            </div>

            <div className="bar-chart compact" aria-hidden="true">
              {burnValues.map((value, index) => (
                <div
                  key={`${value}-${index}`}
                  className={index < 2 ? "bar muted-bar" : "bar"}
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>

            <div className="dashboard-burn-foot">
              <strong>{snapshot.weightTrend}</strong>
              <small>{snapshot.todayFocus}</small>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
