import { ActivityRings } from "@/components/activity-rings";
import { getCurrentPlan, getDashboard } from "@/lib/api";

export default async function DashboardPage() {
  const [snapshot, plan] = await Promise.all([getDashboard(), getCurrentPlan()]);
  const todayPlan = plan[0];
  const rings = [
    { slug: "move", label: "消耗", value: 76, note: "Move · 已消耗 612 kcal", accent: "#d53832" },
    { slug: "load", label: "负荷", value: 64, note: "Load · 已完成 18 组", accent: "#20202a" },
    { slug: "focus", label: "专注", value: 82, note: "Focus · 计划质量 82%", accent: "#8f9199" }
  ];
  const calories = [38, 52, 66, 48, 74, 61, 83];

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Dashboard</span>
          <h2>今日概览</h2>
        </div>
        <div className="chip-row">
          <span className="status-pill live">已就绪</span>
          <span className="mini-chip">{snapshot.weeklyCompletionRate}</span>
        </div>
      </div>

      <section className="dash-grid">
        <div className="viz-wrap">
          <ActivityRings rings={rings} />

          <div className="viz-card wide">
            <div className="section-head">
              <div className="section-copy">
                <span className="section-label">Burn</span>
                <h3>7 日消耗</h3>
              </div>
            </div>
            <div className="bar-chart" aria-hidden="true">
              {calories.map((value, index) => (
                <div
                  key={`${value}-${index}`}
                  className={index < 2 ? "bar muted-bar" : "bar"}
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
            <strong>{snapshot.weightTrend}</strong>
          </div>
        </div>

        <aside className="viz-wrap">
          <div className="dashboard-side-panel">
            <div className="section-copy">
              <span className="section-label">Recovery</span>
              <h3>恢复状态</h3>
              <p className="muted">{snapshot.recoveryStatus}</p>
            </div>
            <div className="quick-stat-row">
              <span className="mini-chip">就绪分 76</span>
              <span className="status-pill live">稳态训练日</span>
            </div>
          </div>

          <div className="dashboard-side-panel">
            <div className="section-copy">
              <span className="section-label">Food</span>
              <h3>今日饮食</h3>
            </div>

            <div className="meal-list">
              <div className="meal-row">
                <span className="metric-label">早餐 Breakfast</span>
                <strong>蛋白 42g</strong>
                <p className="muted">燕麦 / 鸡蛋 / 酸奶</p>
              </div>
              <div className="meal-row">
                <span className="metric-label">午餐 Lunch</span>
                <strong>碳水 68g</strong>
                <p className="muted">米饭 / 鸡胸 / 绿叶菜</p>
              </div>
              <div className="meal-row">
                <span className="metric-label">晚餐 Dinner</span>
                <strong>脂肪 31g</strong>
                <p className="muted">牛肉 / 土豆 / 沙拉</p>
              </div>
            </div>
          </div>

          <div className="dashboard-side-panel">
            <div className="section-copy">
              <span className="section-label">Plan</span>
              <h3>{todayPlan.focus}</h3>
            </div>
            <div className="quick-stat-row">
              <span className="mini-chip">{todayPlan.duration}</span>
              <span className="status-pill live">今日任务</span>
            </div>
            <p className="muted">{snapshot.todayFocus}</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
