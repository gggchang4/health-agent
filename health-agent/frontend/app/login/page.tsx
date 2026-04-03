import { PageHero } from "@/components/page-hero";

export default function LoginPage() {
  return (
    <div className="page">
      <PageHero
        eyebrow="Account"
        title="登录"
        description="入口保持克制。"
        meta={["Email", "Password"]}
      />

      <section className="auth-grid">
        <article className="auth-copy">
          <span className="section-label">GymPal</span>
          <h2>直接进入训练工作面。</h2>
          <p className="muted">先看状态，再聊天，再调整计划。</p>
          <div className="chip-row">
            <span className="chip">Chat</span>
            <span className="chip">Dashboard</span>
            <span className="chip">Plan</span>
          </div>
        </article>

        <article className="auth-panel">
          <div className="section-copy">
            <span className="section-label">Login</span>
            <h2>欢迎回来</h2>
          </div>
          <div className="form-grid">
            <label className="field">
              <span className="form-label">邮箱</span>
              <input placeholder="you@example.com" />
            </label>
            <label className="field">
              <span className="form-label">密码</span>
              <input placeholder="输入密码" type="password" />
            </label>
          </div>
          <div className="action-row">
            <button className="button">登录</button>
            <button className="ghost-button">演示模式</button>
          </div>
        </article>
      </section>
    </div>
  );
}
