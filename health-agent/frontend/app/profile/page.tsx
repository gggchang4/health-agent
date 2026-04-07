import Image from "next/image";

const memberRows = [
  ["身高", "176 cm"],
  ["体重", "67 kg"],
  ["BMI", "21.6"],
  ["训练目标", "减脂塑形"],
  ["胸围", "96 cm"],
  ["腰围", "78 cm"],
  ["臀围", "92 cm"]
] as const;

const weightTrend = [
  { label: "第 1 周", value: 70.2 },
  { label: "第 2 周", value: 69.6 },
  { label: "第 3 周", value: 69.1 },
  { label: "第 4 周", value: 68.7 },
  { label: "第 5 周", value: 68.2 },
  { label: "第 6 周", value: 67.8 },
  { label: "第 7 周", value: 67.4 },
  { label: "第 8 周", value: 67.0 }
] as const;

const trainingFrequency = [
  { label: "本周", sessions: 4, target: 4 },
  { label: "上周", sessions: 4, target: 4 },
  { label: "两周前", sessions: 3, target: 4 },
  { label: "三周前", sessions: 5, target: 4 },
  { label: "四周前", sessions: 4, target: 4 }
] as const;

const calorieLog = [
  { day: "一", intake: 2080, target: 2150 },
  { day: "二", intake: 2010, target: 2150 },
  { day: "三", intake: 2190, target: 2150 },
  { day: "四", intake: 2050, target: 2150 },
  { day: "五", intake: 1980, target: 2150 },
  { day: "六", intake: 2120, target: 2150 },
  { day: "日", intake: 2060, target: 2150 }
] as const;

const recentStats = [
  { label: "近 8 周体重变化", value: "-3.2 kg", note: "下降节奏平稳" },
  { label: "近 4 周训练频次", value: "4.0 / 周", note: "执行率稳定" },
  { label: "近 7 天平均热量", value: "2070 kcal", note: "贴近目标区间" }
] as const;

const recentNotes = [
  "训练节奏整体稳定，最近两周的恢复质量比前期更平衡。",
  "饮食热量基本贴着目标走，没有出现连续偏低或明显暴食。",
  "腰围继续下降，说明当前减脂策略仍然有效。"
] as const;

function buildSparklinePath(points: number[], width: number, height: number) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
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
        const cx = (index / (points.length - 1)) * width;
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

export default function ProfilePage() {
  const weightPoints = weightTrend.map((item) => item.value);
  const averageCalories = Math.round(
    calorieLog.reduce((sum, item) => sum + item.intake, 0) / calorieLog.length
  );

  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">档案</span>
          <h2>个人档案</h2>
        </div>
        <span className="mini-chip">减脂塑形计划第 8 周</span>
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
                <span className="section-label">成员</span>
                <h3>Alex Chen</h3>
                <p className="profile-member-note">
                  当前阶段以减脂塑形为主，训练安排维持每周 4 次，重点放在恢复稳定和体脂继续下降。
                </p>
              </div>
            </div>

            <div className="profile-member-highlight">
              <div>
                <span className="profile-stat-label">当前体重</span>
                <strong>67 kg</strong>
              </div>
              <div>
                <span className="profile-stat-label">目标体重</span>
                <strong>63 kg</strong>
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
              <span className="profile-ledger-tag">办公室健身党</span>
              <span className="profile-ledger-tag">每周 4 练</span>
              <span className="profile-ledger-tag">高蛋白饮食</span>
            </div>
          </section>
        </aside>

        <div className="profile-content">
          <section className="profile-recent-grid">
            {recentStats.map((item) => (
              <article className="profile-recent-card" key={item.label}>
                <span className="section-label">近期</span>
                <strong>{item.value}</strong>
                <p>{item.label}</p>
                <small>{item.note}</small>
              </article>
            ))}
          </section>

          <section className="profile-data-section">
            <div className="profile-data-head">
              <div>
                <span className="section-label">体重</span>
                <h3>近期体重变化</h3>
              </div>
              <p className="muted">
                用最近 8 周的趋势来判断减脂节奏是否稳定，而不是只盯着单日波动。
              </p>
            </div>

            <div className="profile-trend-panel">
              <div className="profile-trend-chart">
                <WeightSparkline points={weightPoints} />
                <div className="profile-trend-labels" aria-hidden="true">
                  {weightTrend.map((item) => (
                    <span key={item.label}>{item.label}</span>
                  ))}
                </div>
              </div>

              <div className="profile-trend-summary">
                <strong>70.2 → 67.0 kg</strong>
                <p className="muted">
                  近 8 周共下降 3.2 kg，节奏平稳，说明当前热量赤字和训练频率仍然匹配。
                </p>
                <div className="profile-mini-metrics">
                  <div>
                    <span className="profile-stat-label">平均周变化</span>
                    <strong>-0.4 kg</strong>
                  </div>
                  <div>
                    <span className="profile-stat-label">当前 BMI</span>
                    <strong>21.6</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="profile-data-section">
            <div className="profile-data-head">
              <div>
                <span className="section-label">训练</span>
                <h3>训练频次记录</h3>
              </div>
              <p className="muted">
                把最近几周的实际训练次数和目标频次放在一起，更容易判断执行是否稳定。
              </p>
            </div>

            <div className="profile-frequency-list">
              {trainingFrequency.map((item) => (
                <div className="profile-frequency-row" key={item.label}>
                  <div className="profile-frequency-copy">
                    <span>{item.label}</span>
                    <strong>
                      {item.sessions} / {item.target} 次
                    </strong>
                  </div>
                  <div className="profile-frequency-rail" aria-hidden="true">
                    <span style={{ width: `${Math.min((item.sessions / item.target) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="profile-data-section">
            <div className="profile-data-head">
              <div>
                <span className="section-label">饮食</span>
                <h3>饮食热量记录</h3>
              </div>
              <p className="muted">
                最近 7 天平均摄入 {averageCalories} kcal，整体保持在目标热量附近。
              </p>
            </div>

            <div className="profile-calorie-board">
              <div className="profile-calorie-bars" aria-hidden="true">
                {calorieLog.map((item) => (
                  <div className="profile-calorie-day" key={item.day}>
                    <div className="profile-calorie-track">
                      <span
                        className={`profile-calorie-fill ${item.intake > item.target ? "is-over" : ""}`}
                        style={{ height: `${(item.intake / 2400) * 100}%` }}
                      />
                    </div>
                    <small>{item.day}</small>
                  </div>
                ))}
              </div>

              <div className="profile-calorie-list">
                {calorieLog.map((item) => (
                  <div className="profile-calorie-row" key={item.day}>
                    <span>{item.day}</span>
                    <strong>{item.intake} kcal</strong>
                    <small>目标 {item.target} kcal</small>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="profile-data-section">
            <div className="profile-data-head">
              <div>
                <span className="section-label">观察</span>
                <h3>近期观察</h3>
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
