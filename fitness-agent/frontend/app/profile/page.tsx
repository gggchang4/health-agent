import Image from "next/image";
import {
  getBodyMetrics,
  getCurrentPlan,
  getMe,
  getWorkoutLogs
} from "@/lib/api";

function formatDate(value?: string) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatLabel(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  return value.replace(/_/g, " ");
}

function buildSparklinePath(points: number[], width: number, height: number) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function WeightSparkline({ points }: { points: number[] }) {
  const width = 420;
  const height = 120;
  const path = buildSparklinePath(points, width, height);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return (
    <svg viewBox={`0 0 ${width} ${height + 12}`} className="profile-sparkline" aria-hidden="true">
      <path d={path} className="profile-sparkline-path" />
      {points.map((point, index) => {
        const cx = (index / Math.max(points.length - 1, 1)) * width;
        const cy = height - ((point - min) / range) * height;

        return (
          <circle
            key={`${point}-${index}`}
            cx={cx}
            cy={cy}
            r={index === points.length - 1 ? 4.5 : 3}
            className="profile-sparkline-dot"
          />
        );
      })}
    </svg>
  );
}

export default async function ProfilePage() {
  const [me, metrics, workouts, plan] = await Promise.all([
    getMe(),
    getBodyMetrics(),
    getWorkoutLogs(),
    getCurrentPlan()
  ]);

  const profile = me.profile;
  const latestMetric = metrics[0];
  const currentWeight = latestMetric?.weightKg ?? profile?.currentWeightKg ?? 0;
  const targetWeight = profile?.targetWeightKg ?? currentWeight;
  const heightCm = profile?.heightCm ?? 0;
  const bmi = heightCm > 0 ? currentWeight / ((heightCm / 100) * (heightCm / 100)) : 0;
  const weightTrend = [...metrics].slice(0, 8).reverse();
  const weightPoints =
    weightTrend.length > 0 ? weightTrend.map((item) => item.weightKg) : [currentWeight || 0, currentWeight || 0];
  const weeklyWorkoutCount = workouts.filter((workout) => {
    if (!workout.recordedAt) {
      return false;
    }

    return Date.now() - new Date(workout.recordedAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const trainingTarget = profile?.trainingDaysPerWeek ?? 4;
  const latestWorkout = workouts[0];

  const memberRows = [
    ["Email", me.email],
    ["Height", heightCm > 0 ? `${heightCm} cm` : "Not recorded"],
    ["Current weight", currentWeight > 0 ? `${currentWeight} kg` : "Not recorded"],
    ["Target weight", targetWeight > 0 ? `${targetWeight} kg` : "Not recorded"],
    ["BMI", bmi > 0 ? bmi.toFixed(1) : "Not recorded"],
    ["Experience", formatLabel(profile?.trainingExperience)],
    ["Equipment", formatLabel(profile?.equipmentAccess)]
  ] as const;

  const recentStats = [
    {
      label: "Body metrics logged",
      value: String(metrics.length),
      note: latestMetric ? `Latest update ${formatDate(latestMetric.recordedAt)}` : "No body metrics yet"
    },
    {
      label: "Workouts in last 7 days",
      value: `${weeklyWorkoutCount} / ${trainingTarget}`,
      note: "Driven by workout log rows instead of static dashboard values"
    },
    {
      label: "Current plan days",
      value: String(plan.length),
      note: plan[0]?.focus ? `Next focus: ${plan[0].focus}` : "No active workout plan loaded"
    }
  ] as const;

  const trainingFrequency = [
    { label: "Weekly training", sessions: weeklyWorkoutCount, target: trainingTarget },
    { label: "Body logs", sessions: Math.min(metrics.length, 7), target: 7 },
    { label: "Plan days", sessions: plan.length, target: Math.max(trainingTarget, 1) }
  ] as const;

  const recentNotes = [
    profile?.limitations ? `Limitation: ${profile.limitations}` : null,
    latestWorkout?.painFeedback ? `Workout feedback: ${latestWorkout.painFeedback}` : null,
    plan[0]?.recoveryTip ? `Current plan note: ${plan[0].recoveryTip}` : null,
    latestWorkout?.exerciseNote ? `Latest session note: ${latestWorkout.exerciseNote}` : null
  ].filter((note): note is string => Boolean(note));

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Profile</span>
          <h2>Fitness Profile</h2>
        </div>
        <span className="mini-chip">All profile panels are now backed by PostgreSQL records</span>
      </div>

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <section className="profile-member-card">
            <div className="profile-member-top">
              <Image
                src="/brand/gympal-logo.jpg"
                alt="GymPal"
                width={96}
                height={96}
                className="profile-member-avatar"
              />

              <div className="profile-member-copy">
                <span className="section-label">Member</span>
                <h3>{me.email}</h3>
                <p className="profile-member-note">
                  This profile is composed from the `User`, `HealthProfile`, `BodyMetricLog`,
                  `WorkoutLog`, and workout plan tables.
                </p>
              </div>
            </div>

            <div className="profile-member-highlight">
              <div>
                <span className="profile-stat-label">Current weight</span>
                <strong>{currentWeight > 0 ? `${currentWeight} kg` : "Not recorded"}</strong>
              </div>
              <div>
                <span className="profile-stat-label">Target weight</span>
                <strong>{targetWeight > 0 ? `${targetWeight} kg` : "Not recorded"}</strong>
              </div>
            </div>

            <div className="profile-member-grid">
              {memberRows.map(([label, value]) => (
                <div className="profile-member-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="profile-member-tags">
              <span className="profile-ledger-tag">{formatLabel(profile?.activityLevel)}</span>
              <span className="profile-ledger-tag">{trainingTarget} training days/week</span>
              <span className="profile-ledger-tag">{formatLabel(profile?.gender)}</span>
            </div>
          </section>
        </aside>

        <div className="profile-content">
          <section className="profile-recent-grid">
            {recentStats.map((item) => (
              <article className="profile-recent-card" key={item.label}>
                <span className="section-label">Live</span>
                <strong>{item.value}</strong>
                <p>{item.label}</p>
                <small>{item.note}</small>
              </article>
            ))}
          </section>

          <section className="profile-data-section">
            <div className="profile-data-head">
              <div>
                <span className="section-label">Weight</span>
                <h3>Weight trend from body metrics</h3>
              </div>
              <p className="muted">The sparkline now uses the real metric history stored in PostgreSQL.</p>
            </div>

            <div className="profile-trend-panel">
              <div className="profile-trend-chart">
                <WeightSparkline points={weightPoints} />
                <div className="profile-trend-labels" aria-hidden="true">
                  {weightTrend.map((item) => (
                    <span key={`${item.recordedAt}-${item.weightKg}`}>{formatDate(item.recordedAt)}</span>
                  ))}
                </div>
              </div>

              <div className="profile-trend-summary">
                <strong>
                  {weightPoints[0].toFixed(1)} to {weightPoints.at(-1)!.toFixed(1)} kg
                </strong>
                <p className="muted">
                  {weightTrend.length > 1
                    ? `Change over tracked period: ${(weightPoints.at(-1)! - weightPoints[0]).toFixed(1)} kg`
                    : "Add more body metric logs to reveal a stronger trend line."}
                </p>
                <div className="profile-mini-metrics">
                  <div>
                    <span className="profile-stat-label">Latest waist</span>
                    <strong>
                      {latestMetric?.waistCm !== undefined ? `${latestMetric.waistCm} cm` : "Not recorded"}
                    </strong>
                  </div>
                  <div>
                    <span className="profile-stat-label">BMI</span>
                    <strong>{bmi > 0 ? bmi.toFixed(1) : "Not recorded"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="profile-data-section">
            <div className="profile-data-head">
              <div>
                <span className="section-label">Training</span>
                <h3>Training consistency</h3>
              </div>
              <p className="muted">Session counts are derived from your stored workout logs and current profile target.</p>
            </div>

            <div className="profile-frequency-list">
              {trainingFrequency.map((item) => (
                <div className="profile-frequency-row" key={item.label}>
                  <div className="profile-frequency-copy">
                    <span>{item.label}</span>
                    <strong>
                      {item.sessions} / {item.target}
                    </strong>
                  </div>
                  <div className="profile-frequency-rail" aria-hidden="true">
                    <span style={{ width: `${Math.min((item.sessions / Math.max(item.target, 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="profile-data-section">
            <div className="profile-data-head">
              <div>
                <span className="section-label">Notes</span>
                <h3>Latest coaching notes</h3>
              </div>
            </div>

            <div className="profile-note-stream">
              {recentNotes.map((note, index) => (
                <div className="profile-note-row" key={note}>
                  <span className="profile-rule-index">{String(index + 1).padStart(2, "0")}</span>
                  <p>{note}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
