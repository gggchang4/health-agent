import { ActivityRings } from "@/components/activity-rings";
import { DashboardCoachingPanel } from "@/components/dashboard-coaching-panel";
import { DietPlateCard } from "@/components/diet-plate-card";
import { requireServerAuthToken } from "@/lib/server-auth";
import {
  getBodyMetrics,
  getCoachSummary,
  getCurrentPlan,
  getDashboard,
  getDailyCheckins,
  getTodayDietRecommendation,
  getWorkoutLogs
} from "@/lib/api";

export const dynamic = "force-dynamic";

const goalLabelByType: Record<string, string> = {
  fat_loss: "减脂",
  muscle_gain: "增肌",
  maintenance: "维持"
};

const valueLabelMap: Record<string, string> = {
  low: "偏低",
  medium: "中等",
  moderate: "适中",
  high: "较高",
  normal: "正常",
  none: "暂无"
};

function formatValueLabel(value?: string) {
  if (!value) {
    return "未记录";
  }

  return valueLabelMap[value] ?? value.replace(/_/g, " ");
}

function formatCompletionRate(value: string) {
  const percent = value.match(/\d+%/)?.[0];
  return percent ? `本周完成度 ${percent}` : value;
}

function formatWeightDelta(values: number[]) {
  if (values.length === 0) {
    return "等待更多体重记录";
  }

  if (values.length === 1) {
    return `${values[0].toFixed(1)} kg`;
  }

  const delta = values.at(-1)! - values[0];
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`;
}

function buildFallbackDietRecommendation() {
  return null;
}

export default async function DashboardPage() {
  const authToken = requireServerAuthToken();

  const [snapshot, plan, recommendation, metrics, checkins, workouts, coachSummary] = await Promise.all([
    getDashboard(authToken),
    getCurrentPlan(authToken),
    getTodayDietRecommendation(authToken).catch(buildFallbackDietRecommendation),
    getBodyMetrics(authToken),
    getDailyCheckins(authToken),
    getWorkoutLogs(authToken),
    getCoachSummary(authToken)
  ]);

  const todayPlan = plan[0];
  const latestMetric = metrics[0];
  const latestCheckin = checkins[0];
  const weeklyWorkouts = workouts.filter((workout) => {
    if (!workout.recordedAt) {
      return false;
    }

    return Date.now() - new Date(workout.recordedAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
  });

  const weeklyDuration = weeklyWorkouts.reduce((sum, workout) => sum + workout.durationMin, 0);
  const recentDurations = [...workouts]
    .slice(0, 7)
    .reverse()
    .map((workout) => Math.max(28, Math.min(100, Math.round((workout.durationMin / 75) * 100))));
  const burnValues = recentDurations.length > 0 ? recentDurations : [36, 48, 58, 44, 62, 54, 68];
  const weightHistory = [...metrics].slice(0, 7).reverse().map((item) => item.weightKg);
  const focusValue = Math.min(
    100,
    Math.round(((weeklyWorkouts.length || 1) / Math.max(plan.length || 1, 1)) * 100)
  );
  const calorieGap = recommendation ? recommendation.targetCalorie - recommendation.totalCalorie : 0;
  const calorieStatus = calorieGap >= 0 ? "热量缺口" : "热量盈余";

  const rings = [
    {
      slug: "move",
      label: "活动",
      value: Math.min(100, Math.round(((latestCheckin?.steps ?? 0) / 10000) * 100)),
      note: latestCheckin
        ? `今日步数 ${latestCheckin.steps.toLocaleString("zh-CN")} / 10,000`
        : "今天还没有完成状态打卡",
      accent: "#d53832"
    },
    {
      slug: "load",
      label: "负荷",
      value: Math.min(100, Math.round((weeklyDuration / 180) * 100)),
      note: `近 7 日训练 ${weeklyDuration} 分钟`,
      accent: "#20202a"
    },
    {
      slug: "focus",
      label: "专注",
      value: focusValue,
      note: todayPlan?.focus ?? snapshot.todayFocus,
      accent: "#8f9199"
    }
  ];

  const summaryRows = [
    {
      label: "恢复",
      value: snapshot.recoveryStatus,
      meta: latestCheckin
        ? `睡眠 ${latestCheckin.sleepHours} h · 疲劳 ${formatValueLabel(latestCheckin.fatigueLevel)}`
        : "等待今天的恢复数据"
    },
    {
      label: "饮食",
      value: recommendation
        ? `${goalLabelByType[recommendation.userGoal] ?? recommendation.userGoal} · ${calorieStatus}`
        : "今日餐盘尚未生成",
      meta: recommendation
        ? `${recommendation.totalCalorie}/${recommendation.targetCalorie} kcal`
        : "可以先补全饮食推荐数据"
    },
    {
      label: "计划",
      value: todayPlan?.focus ?? "今天还没有同步训练安排",
      meta: todayPlan?.duration ?? "休息或恢复日"
    }
  ];

  return (
    <div className="page">
      <div className="page-header-compact dashboard-header">
        <div>
          <span className="section-label">仪表盘</span>
          <h2>今日总览</h2>
        </div>

        <div className="chip-row">
          <span className="mini-chip">{formatCompletionRate(snapshot.weeklyCompletionRate)}</span>
          <span className="status-pill live">
            {latestMetric ? `最新体重 ${latestMetric.weightKg} kg` : "等待更多记录"}
          </span>
        </div>
      </div>

      <section className="dash-grid dashboard-refined">
        <div className="viz-wrap dashboard-main">
          <ActivityRings rings={rings} />

          <DashboardCoachingPanel coachSummary={coachSummary} />

          {recommendation ? (
            <DietPlateCard recommendation={recommendation} />
          ) : (
            <section className="diet-plate-panel">
              <div className="section-head">
                <div className="section-copy">
                  <span className="section-label">饮食</span>
                  <h3>今日推荐餐盘</h3>
                  <p className="muted">
                    当前数据库里还没有今天的饮食推荐快照，所以这里先保持空状态，不让整页因为缺一块数据而报错。
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="viz-wrap dashboard-rail">
          <section className="dashboard-summary-panel">
            <div className="section-copy">
              <span className="section-label">今天</span>
              <h3>关键信号</h3>
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
              <span className="section-label">趋势</span>
              <h3>7 日走向</h3>
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
              <strong>{formatWeightDelta(weightHistory)}</strong>
              <small>
                {todayPlan?.recoveryTip ??
                  latestCheckin?.hungerLevel?.replace(/_/g, " ") ??
                  "继续补充打卡和训练数据，建议会更稳定。"}
              </small>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
