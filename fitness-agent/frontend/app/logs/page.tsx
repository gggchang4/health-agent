import { getBodyMetrics, getDailyCheckins, getWorkoutLogs } from "@/lib/api";

function formatDate(value?: string) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatLevel(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  return value.replace(/_/g, " ");
}

function buildWeightTrend(values: number[]) {
  if (values.length === 0) {
    return [48];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map((value) => 32 + ((value - min) / range) * 48);
}

export default async function LogsPage() {
  const [metrics, checkins, workouts] = await Promise.all([
    getBodyMetrics(),
    getDailyCheckins(),
    getWorkoutLogs()
  ]);

  const latestMetric = metrics[0];
  const latestCheckin = checkins[0];
  const latestWorkout = workouts[0];
  const weightHistory = [...metrics].slice(0, 7).reverse();
  const weightTrend = buildWeightTrend(weightHistory.map((item) => item.weightKg));
  const trendLabels = weightHistory.map((item) => formatDate(item.recordedAt));

  const recentLogs = [...checkins].slice(0, 4).map((checkin, index) => ({
    day: formatDate(checkin.recordedAt),
    weight: metrics[index]?.weightKg ?? latestMetric?.weightKg ?? 0,
    sleep: checkin.sleepHours,
    note: `${checkin.steps.toLocaleString("en-US")} steps - energy ${formatLevel(checkin.energyLevel)}`
  }));

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Logs</span>
          <h2>Health Logs</h2>
        </div>
        <span className="mini-chip">Frontend now reads body, recovery, and workout logs from PostgreSQL</span>
      </div>

      <section className="spotlight-grid">
        <div className="form-panel">
          <div className="section-copy">
            <span className="section-label">Body</span>
            <h2>Latest body metrics</h2>
            <p className="muted">These values come from the `BodyMetricLog` records returned by the backend.</p>
          </div>
          <div className="form-grid two">
            <label className="field">
              <span className="form-label">Weight</span>
              <input value={latestMetric?.weightKg ? `${latestMetric.weightKg} kg` : "No data"} readOnly />
            </label>
            <label className="field">
              <span className="form-label">Body fat</span>
              <input
                value={latestMetric?.bodyFatPct !== undefined ? `${latestMetric.bodyFatPct}%` : "Not recorded"}
                readOnly
              />
            </label>
            <label className="field span-2">
              <span className="form-label">Waist</span>
              <input
                value={latestMetric?.waistCm !== undefined ? `${latestMetric.waistCm} cm` : "Not recorded"}
                readOnly
              />
            </label>
          </div>
          <div className="action-row">
            <button className="button" type="button">
              Last update: {formatDate(latestMetric?.recordedAt)}
            </button>
            <button className="ghost-button" type="button">
              Total entries: {metrics.length}
            </button>
          </div>
        </div>

        <aside className="form-panel">
          <div className="section-copy">
            <span className="section-label">Check-in</span>
            <h2>Latest recovery check-in</h2>
            <p className="muted">Sleep, water, steps, and readiness now come from `DailyCheckin` rows.</p>
          </div>
          <div className="form-grid two">
            <label className="field">
              <span className="form-label">Sleep</span>
              <input value={latestCheckin ? `${latestCheckin.sleepHours} h` : "No data"} readOnly />
            </label>
            <label className="field">
              <span className="form-label">Steps</span>
              <input value={latestCheckin ? latestCheckin.steps.toLocaleString("en-US") : "No data"} readOnly />
            </label>
            <label className="field">
              <span className="form-label">Water</span>
              <input value={latestCheckin ? `${latestCheckin.waterMl} ml` : "No data"} readOnly />
            </label>
            <label className="field">
              <span className="form-label">Energy</span>
              <input value={formatLevel(latestCheckin?.energyLevel)} readOnly />
            </label>
          </div>
          <div className="action-row">
            <button className="button" type="button">
              Last update: {formatDate(latestCheckin?.recordedAt)}
            </button>
            <span className="field-hint">
              Fatigue: {formatLevel(latestCheckin?.fatigueLevel)} - Hunger: {formatLevel(latestCheckin?.hungerLevel)}
            </span>
          </div>
        </aside>
      </section>

      <section className="log-layout">
        <div className="form-panel">
          <div className="section-copy">
            <span className="section-label">Trend</span>
            <h3>Weight trend from the database</h3>
          </div>
          <div className="log-trend-bars" aria-hidden="true">
            {weightTrend.map((value, index) => (
              <span key={`${value}-${index}`} className="log-trend-bar" style={{ height: `${value}%` }} />
            ))}
          </div>
          <div className="log-trend-labels" aria-hidden="true">
            {trendLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="log-trend-foot">
            <strong>
              {weightHistory.length > 1
                ? `${(weightHistory.at(-1)!.weightKg - weightHistory[0].weightKg).toFixed(1)} kg`
                : `${latestMetric?.weightKg ?? 0} kg`}
            </strong>
            <p className="muted">
              The chart uses the most recent body-metric entries instead of hardcoded sample values.
            </p>
          </div>
        </div>

        <div className="form-panel">
          <div className="section-copy">
            <span className="section-label">Recent</span>
            <h3>Recent check-ins and workouts</h3>
          </div>
          <div className="log-sheet">
            {recentLogs.map((entry) => (
              <div className="log-row" key={entry.day}>
                <div className="log-row-head">
                  <span className="metric-label">{entry.day}</span>
                  <strong>{entry.weight.toFixed(1)} kg</strong>
                </div>
                <p className="muted">
                  Sleep {entry.sleep} h - {entry.note}
                </p>
              </div>
            ))}

            {latestWorkout ? (
              <div className="log-row">
                <div className="log-row-head">
                  <span className="metric-label">Latest workout</span>
                  <strong>{latestWorkout.durationMin} min</strong>
                </div>
                <p className="muted">
                  {formatLevel(latestWorkout.workoutType)} - {formatLevel(latestWorkout.intensity)} -{" "}
                  {formatDate(latestWorkout.recordedAt)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
