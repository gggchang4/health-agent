import { ActivityRings } from "@/components/activity-rings";
import {
  getBodyMetrics,
  getCurrentPlan,
  getDashboard,
  getDailyCheckins,
  getWorkoutLogs
} from "@/lib/api";

function formatLevel(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  return value.replace(/_/g, " ");
}

export default async function DashboardPage() {
  const [snapshot, plan, metrics, checkins, workouts] = await Promise.all([
    getDashboard(),
    getCurrentPlan(),
    getBodyMetrics(),
    getDailyCheckins(),
    getWorkoutLogs()
  ]);

  const todayPlan = plan[0];
  const latestMetric = metrics[0];
  const latestCheckin = checkins[0];
  const weeklyDuration = workouts
    .filter((workout) => {
      if (!workout.recordedAt) {
        return false;
      }

      return Date.now() - new Date(workout.recordedAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
    })
    .reduce((sum, workout) => sum + workout.durationMin, 0);
  const burnValues = [...workouts]
    .slice(0, 7)
    .reverse()
    .map((workout) => Math.max(24, Math.min(100, (workout.durationMin / 75) * 100)));

  const focusValue = Math.min(
    100,
    Math.round(((workouts.length > 0 ? workouts.length : 1) / Math.max(plan.length || 1, 1)) * 100)
  );

  const rings = [
    {
      slug: "move",
      label: "Move",
      value: Math.min(100, Math.round(((latestCheckin?.steps ?? 0) / 10000) * 100)),
      note: latestCheckin ? `${latestCheckin.steps.toLocaleString("en-US")} steps today` : "No check-in yet",
      accent: "#d53832"
    },
    {
      slug: "load",
      label: "Load",
      value: Math.min(100, Math.round((weeklyDuration / 180) * 100)),
      note: `${weeklyDuration} training minutes over the last 7 days`,
      accent: "#20202a"
    },
    {
      slug: "focus",
      label: "Focus",
      value: focusValue,
      note: todayPlan?.focus ?? snapshot.todayFocus,
      accent: "#8f9199"
    }
  ];

  const summaryRows = [
    {
      label: "Recovery",
      value: `${formatLevel(latestCheckin?.energyLevel)} energy`,
      meta: `${latestCheckin?.sleepHours ?? 0} h sleep - ${formatLevel(latestCheckin?.fatigueLevel)} fatigue`
    },
    {
      label: "Body trend",
      value: latestMetric ? `${latestMetric.weightKg} kg` : "No weight logged yet",
      meta:
        latestMetric?.bodyFatPct !== undefined
          ? `${latestMetric.bodyFatPct}% body fat`
          : "Add more body metrics to improve coaching context"
    },
    {
      label: "Plan",
      value: todayPlan?.focus ?? "No active day loaded",
      meta: todayPlan?.duration ?? "Add an active workout plan"
    }
  ];

  return (
    <div className="page">
      <div className="page-header-compact dashboard-header">
        <div>
          <span className="section-label">Dashboard</span>
          <h2>Today</h2>
        </div>
        <div className="chip-row">
          <span className="mini-chip">{snapshot.weeklyCompletionRate}</span>
          <span className="status-pill live">
            {latestMetric ? `${latestMetric.weightKg} kg latest weight` : "Waiting for more logs"}
          </span>
        </div>
      </div>

      <section className="dash-grid dashboard-refined">
        <div className="viz-wrap dashboard-main">
          <ActivityRings rings={rings} />
        </div>

        <aside className="viz-wrap dashboard-rail">
          <section className="dashboard-summary-panel">
            <div className="section-copy">
              <span className="section-label">Today</span>
              <h3>Live coaching snapshot</h3>
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
              <span className="section-label">Training</span>
              <h3>Recent workload</h3>
            </div>

            <div className="bar-chart compact" aria-hidden="true">
              {(burnValues.length > 0 ? burnValues : [36]).map((value, index) => (
                <div
                  key={`${value}-${index}`}
                  className={index < 2 ? "bar muted-bar" : "bar"}
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>

            <div className="dashboard-burn-foot">
              <strong>{snapshot.weightTrend}</strong>
              <small>
                {todayPlan?.recoveryTip ?? latestCheckin?.hungerLevel ?? "Add more check-ins to improve agent context"}
              </small>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
