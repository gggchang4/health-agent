export default function LogsPage() {
  return (
    <div className="page">
      <section className="hero">
        <h2>健康记录</h2>
        <p>聊天是主入口，表单作为高可靠兜底，支持体重、睡眠、步数、饮水、训练完成度等记录。</p>
      </section>
      <section className="grid two">
        <div className="card form-card">
          <h3>身体数据</h3>
          <div className="grid">
            <input placeholder="体重 (kg)" />
            <input placeholder="体脂率 (%) 可选" />
            <input placeholder="腰围 (cm) 可选" />
            <button className="button">保存身体数据</button>
          </div>
        </div>
        <div className="card form-card">
          <h3>每日状态</h3>
          <div className="grid">
            <input placeholder="睡眠时长 (h)" />
            <input placeholder="步数" />
            <input placeholder="饮水量 (ml)" />
            <select defaultValue="normal">
              <option value="low">疲劳高</option>
              <option value="normal">疲劳正常</option>
              <option value="great">状态很好</option>
            </select>
            <button className="button">保存每日状态</button>
          </div>
        </div>
      </section>
    </div>
  );
}

