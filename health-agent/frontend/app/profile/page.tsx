export default function ProfilePage() {
  return (
    <div className="page">
      <section className="hero">
        <h2>个人档案</h2>
        <p>首轮建档由 agent 追问补齐，档案页用于修正目标、训练频次、器械条件和限制条件。</p>
      </section>
      <section className="grid two">
        <div className="card form-card">
          <h3>目标与基础信息</h3>
          <div className="grid">
            <input placeholder="年龄" />
            <input placeholder="身高 (cm)" />
            <input placeholder="当前体重 (kg)" />
            <input placeholder="目标体重 (kg)" />
            <select defaultValue="novice">
              <option value="novice">训练经验：新手</option>
              <option value="intermediate">训练经验：初中级</option>
            </select>
          </div>
        </div>
        <div className="card form-card">
          <h3>训练约束</h3>
          <div className="grid">
            <input placeholder="每周可训练天数" />
            <input placeholder="器械条件，例如家里哑铃 / 健身房" />
            <input placeholder="限制条件，例如膝不适、肩部活动受限" />
            <button className="button">更新档案</button>
          </div>
        </div>
      </section>
    </div>
  );
}

