export default function LoginPage() {
  return (
    <div className="page">
      <section className="hero">
        <h2>登录</h2>
        <p>当前骨架保留邮箱密码登录入口，后续可替换为真实鉴权与 HttpOnly cookie 会话。</p>
      </section>
      <div className="card form-card" style={{ maxWidth: 520 }}>
        <div className="grid">
          <input placeholder="邮箱" />
          <input placeholder="密码" type="password" />
          <button className="button">登录</button>
        </div>
      </div>
    </div>
  );
}

