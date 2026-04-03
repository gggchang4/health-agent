import { getCurrentPlan, getDashboard } from "@/lib/api";

export default async function DashboardPage() {
  const [snapshot, plan] = await Promise.all([getDashboard(), getCurrentPlan()]);
  const todayPlan = plan[0];
  const rings = [
    { label: "卡路里", value: 76, note: "612 kcal" },
    { label: "动作", value: 64, note: "18 / 28" },
    { label: "饮食", value: 82, note: "82%" }
  ];
  const calories = [38, 52, 66, 48, 74, 61, 83];

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Dashboard</span>
          <h2>今天</h2>
        </div>
        <div className="chip-row">
          <span className="status-pill live">Ready</span>
          <span className="mini-chip">{snapshot.weeklyCompletionRate}</span>
        </div>
      </div>

      <section className="dash-grid">
        <div className="viz-wrap">
          <div className="section-head">
            <div className="section-copy">
              <span className="section-label">Rings</span>
              <h3>今日完成度</h3>
            </div>
          </div>

          <div className="viz-grid">
            {rings.map((ring) => {
              const radius = 46;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference * (1 - ring.value / 100);

              return (
                <div className="viz-card" key={ring.label}>
                  <svg viewBox="0 0 120 120" className="ring-meter" aria-hidden="true">
                    <circle className="ring-track" cx="60" cy="60" r={radius} />
                    <circle
                      className="ring-progress"
                      cx="60"
                      cy="60"
                      r={radius}
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                    />
                  </svg>
                  <span className="metric-label">{ring.label}</span>
                  <strong>{ring.note}</strong>
                </div>
              );
            })}
          </div>

          <div className="section-head">
            <div className="section-copy">
              <span className="section-label">Burn</span>
              <h3>7 天消耗</h3>
            </div>
          </div>

          <div className="viz-card">
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
          <div className="section-head">
            <div className="section-copy">
              <span className="section-label">Food</span>
              <h3>今日饮食</h3>
            </div>
          </div>

          <div className="meal-list">
            <div className="meal-row">
              <span className="metric-label">Breakfast</span>
              <strong>42g 蛋白</strong>
              <p className="muted">燕麦 / 鸡蛋 / 酸奶</p>
            </div>
            <div className="meal-row">
              <span className="metric-label">Lunch</span>
              <strong>68g 碳水</strong>
              <p className="muted">米饭 / 鸡胸 / 蔬菜</p>
            </div>
            <div className="meal-row">
              <span className="metric-label">Dinner</span>
              <strong>31g 脂肪</strong>
              <p className="muted">牛肉 / 土豆 / 沙拉</p>
            </div>
          </div>

          <div className="meal-row">
            <span className="metric-label">Plan</span>
            <strong>{todayPlan.focus}</strong>
            <p className="muted">{todayPlan.duration}</p>
            <p className="muted">{snapshot.todayFocus}</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
