export default function LogsPage() {
  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Logs</span>
          <h2>每日记录</h2>
        </div>
        <span className="mini-chip">Daily input</span>
      </div>

      <section className="spotlight-grid">
        <div className="form-panel">
          <div className="section-copy">
            <span className="section-label">Body</span>
            <h2>身体数据</h2>
            <p className="muted">趋势比单次值更重要。</p>
          </div>
          <div className="form-grid two">
            <label className="field">
              <span className="form-label">体重</span>
              <input placeholder="67.8 kg" />
            </label>
            <label className="field">
              <span className="form-label">体脂率</span>
              <input placeholder="21.4%" />
            </label>
            <label className="field span-2">
              <span className="form-label">腰围</span>
              <input placeholder="78 cm" />
            </label>
          </div>
          <div className="action-row">
            <button className="button">保存</button>
            <button className="ghost-button">历史</button>
          </div>
        </div>

        <aside className="form-panel">
          <div className="section-copy">
            <span className="section-label">Check-in</span>
            <h2>今日状态</h2>
            <p className="muted">睡眠、步数、饮水和疲劳就够了。</p>
          </div>
          <div className="form-grid two">
            <label className="field">
              <span className="form-label">睡眠</span>
              <input placeholder="6.5 h" />
            </label>
            <label className="field">
              <span className="form-label">步数</span>
              <input placeholder="8500" />
            </label>
            <label className="field">
              <span className="form-label">饮水</span>
              <input placeholder="1800 ml" />
            </label>
            <label className="field">
              <span className="form-label">疲劳</span>
              <select defaultValue="normal">
                <option value="low">偏高</option>
                <option value="normal">正常</option>
                <option value="great">很好</option>
              </select>
            </label>
          </div>
          <div className="action-row">
            <button className="button">保存</button>
            <span className="field-hint">固定时间记录会更稳定。</span>
          </div>
        </aside>
      </section>
    </div>
  );
}
