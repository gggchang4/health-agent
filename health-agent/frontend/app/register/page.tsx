import { PageHero } from "@/components/page-hero";

export default function RegisterPage() {
  return (
    <div className="page">
      <PageHero
        eyebrow="Create account"
        title="注册"
        description="先建一个干净的起点。"
        meta={["Email", "Goal", "Start"]}
      />

      <section className="auth-grid">
        <article className="auth-copy">
          <span className="section-label">MVP</span>
          <h2>先把目标、限制和训练节奏接起来。</h2>
          <p className="muted">账号只是入口，真正有价值的是后面的连续记录和建议。</p>
        </article>

        <article className="auth-panel">
          <div className="section-copy">
            <span className="section-label">Register</span>
            <h2>创建账号</h2>
          </div>
          <div className="form-grid">
            <label className="field">
              <span className="form-label">邮箱</span>
              <input placeholder="you@example.com" />
            </label>
            <label className="field">
              <span className="form-label">密码</span>
              <input placeholder="创建密码" type="password" />
            </label>
            <label className="field">
              <span className="form-label">确认密码</span>
              <input placeholder="再次输入密码" type="password" />
            </label>
          </div>
          <div className="action-row">
            <button className="button">创建账号</button>
            <button className="ghost-button">稍后再说</button>
          </div>
        </article>
      </section>
    </div>
  );
}
