import Image from "next/image";

const bodyHotspots = [
  {
    slug: "chest",
    label: "胸围",
    value: "96 cm",
    note: "上肢力量表现正在稳定上升。"
  },
  {
    slug: "waist",
    label: "腰围",
    value: "78 cm",
    note: "最近 4 周下降了 2 cm。"
  },
  {
    slug: "legs",
    label: "腿围",
    value: "54 cm",
    note: "下肢训练量仍然保持保守。"
  }
];

const baselineRows = [
  ["静息心率", "58 bpm"],
  ["睡眠基线", "7.3 h"],
  ["蛋白目标", "125 g"],
  ["步数基线", "8.5k"]
];

const rhythm = [
  { day: "一", level: "high" },
  { day: "二", level: "mid" },
  { day: "四", level: "high" },
  { day: "六", level: "mid" },
  { day: "日", level: "low" }
];

const focusRows = [
  ["目标", "减脂塑形"],
  ["频率", "每周 4 练"],
  ["场地", "商业健身房"],
  ["限制", "深屈膝动作保守"]
];

const coachRules = [
  "睡眠偏低时先降训练负荷，而不是硬把训练量做满。",
  "每次下肢训练后都要留出完整恢复时段。",
  "先把蛋白和饮水执行稳定，再考虑叠加额外有氧。"
];

export default function ProfilePage() {
  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Profile</span>
          <h2>个人档案</h2>
        </div>
        <span className="mini-chip">减脂期 Lean cut</span>
      </div>

      <div className="profile-wrap">
        <section className="profile-card">
          <div className="profile-hero">
            <Image
              src="/brand/gympal-logo.jpg"
              alt="GymPal"
              width={92}
              height={92}
              className="profile-avatar"
            />
            <div>
              <span className="section-label">Member</span>
              <h3>Alex Chen</h3>
              <p className="profile-note">减脂阶段，每周 4 次训练，主要在商业健身房完成。</p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-label">当前</span>
              <strong>67 kg</strong>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-label">目标</span>
              <strong>63 kg</strong>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-label">频率</span>
              <strong>每周 4 练</strong>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-head">
            <div>
              <span className="section-label">Body map</span>
              <h3>身体报告</h3>
            </div>
          </div>

          <div className="body-report">
            <div className="body-map">
              <div className="body-stage">
                <Image
                  src="/brand/human-body-silhouette.svg"
                  alt="Human body silhouette"
                  width={280}
                  height={500}
                  className="body-silhouette"
                />

                {bodyHotspots.map((spot) => (
                  <button
                    key={spot.slug}
                    className={`body-hotspot ${spot.slug}`}
                    type="button"
                    aria-label={`${spot.label} ${spot.value}`}
                  >
                    <span className="body-hotspot-dot" />
                    <span className="body-hotspot-card">
                      <strong>
                        {spot.label} {spot.value}
                      </strong>
                      <small>{spot.note}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="body-overview-card">
                <span className="profile-stat-label">体脂率</span>
                <strong>18.6%</strong>
                <p className="profile-note">悬停人体标记，可以快速查看围度变化和训练提示。</p>
                <div className="body-overview-list">
                  <span>瘦体重 50.2 kg</span>
                  <span>活动度表现良好</span>
                  <span>下肢负荷保持保守</span>
                </div>
              </div>
            </div>

            <div className="profile-side-stack">
              <div className="profile-note-panel">
                <span className="section-label">Baseline</span>
                <div className="profile-line-list">
                  {baselineRows.map(([label, value]) => (
                    <div className="profile-line-row" key={label}>
                      <span className="profile-stat-label">{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="profile-note-panel">
                <span className="section-label">Rhythm</span>
                <div className="profile-rhythm-row" aria-hidden="true">
                  {rhythm.map((item) => (
                    <div className={`profile-rhythm-day ${item.level}`} key={item.day}>
                      <span>{item.day}</span>
                    </div>
                  ))}
                </div>
                <p className="profile-note">
                  高强度训练主要放在周前段，周末留给恢复和整理。
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="profile-double">
          <section className="profile-card">
            <div className="profile-head">
              <div>
                <span className="section-label">Setup</span>
                <h3>训练偏好</h3>
              </div>
            </div>
            <div className="profile-stack-list">
              {focusRows.map(([label, value]) => (
                <div className="profile-line-row" key={label}>
                  <span className="profile-stat-label">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="profile-tags">
              <span className="profile-tag">上肢优先</span>
              <span className="profile-tag">商业健身房</span>
              <span className="profile-tag">新手进阶</span>
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-head">
              <div>
                <span className="section-label">Notes</span>
                <h3>执行规则</h3>
              </div>
            </div>
            <div className="profile-stack-list">
              {coachRules.map((rule) => (
                <p className="profile-note" key={rule}>
                  {rule}
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
