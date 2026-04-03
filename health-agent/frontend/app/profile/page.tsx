import Image from "next/image";

export default function ProfilePage() {
  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Profile</span>
          <h2>Alex Chen</h2>
        </div>
        <span className="mini-chip">Lean Strength</span>
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
              <p className="profile-note">减脂中，4 天训练频率，商业健身房。</p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-label">Current</span>
              <strong>67 kg</strong>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-label">Target</span>
              <strong>63 kg</strong>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-label">Split</span>
              <strong>4 days</strong>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-head">
            <div>
              <span className="section-label">Setup</span>
              <h3>偏好</h3>
            </div>
          </div>
          <div className="profile-tags">
            <span className="profile-tag">减脂塑形</span>
            <span className="profile-tag">上肢优先</span>
            <span className="profile-tag">新手到初中级</span>
            <span className="profile-tag">商业健身房</span>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-head">
            <div>
              <span className="section-label">Limits</span>
              <h3>限制</h3>
            </div>
          </div>
          <p className="profile-note">
            膝部轻微不适，避免过深蹲和高冲击跳跃；睡眠低于 6 小时时自动下调训练量。
          </p>
        </section>
      </div>
    </div>
  );
}
