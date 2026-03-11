export default function RegisterPage() {
  return (
    <div className="page">
      <section className="hero">
        <h2>注册</h2>
        <p>邮箱密码是当前 MVP 的账号入口，手机号与短信能力在后续阶段预留扩展。</p>
      </section>
      <div className="card form-card" style={{ maxWidth: 520 }}>
        <div className="grid">
          <input placeholder="邮箱" />
          <input placeholder="密码" type="password" />
          <input placeholder="确认密码" type="password" />
          <button className="button">创建账号</button>
        </div>
      </div>
    </div>
  );
}
