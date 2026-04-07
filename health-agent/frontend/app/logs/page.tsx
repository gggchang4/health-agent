const recentLogs = [
  { day: "周一", weight: "67.4", sleep: "7.2 h", note: "状态平稳" },
  { day: "周二", weight: "67.2", sleep: "6.9 h", note: "精力偏低" },
  { day: "周四", weight: "66.9", sleep: "7.5 h", note: "训练质量较好" },
  { day: "周六", weight: "66.8", sleep: "7.8 h", note: "恢复优先" }
];

const weightTrend = [52, 58, 55, 62, 68, 66, 74];
const trendLabels = ["一", "二", "三", "四", "五", "六", "日"];

export default function LogsPage() {
  return (
    <div className="page">
      <div className="page-header-compact">
        <div>
          <span className="section-label">Logs</span>
          <h2>每日记录</h2>
        </div>
        <span className="mini-chip">日常输入</span>
      </div>

      <section className="spotlight-grid">
        <div className="form-panel">
          <div className="section-copy">
            <span className="section-label">Body</span>
            <h2>身体数据</h2>
            <p className="muted">趋势比单次输入更有参考价值。</p>
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
            <button className="ghost-button">历史记录</button>
          </div>
        </div>

        <aside className="form-panel">
          <div className="section-copy">
            <span className="section-label">Check-in</span>
            <h2>今日状态</h2>
            <p className="muted">先记录睡眠、步数、饮水和疲劳度，就足够支撑当前 MVP。</p>
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
            <span className="field-hint">固定时间记录，会让趋势判断更稳定。</span>
          </div>
        </aside>
      </section>

      <section className="log-layout">
        <div className="form-panel">
          <div className="section-copy">
            <span className="section-label">Trend</span>
            <h3>近 7 日趋势</h3>
          </div>
          <div className="log-trend-bars" aria-hidden="true">
            {weightTrend.map((value, index) => (
              <span key={`${value}-${index}`} className="log-trend-bar" style={{ height: `${value}%` }} />
            ))}
          </div>
          <div className="log-trend-labels" aria-hidden="true">
            {trendLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="log-trend-foot">
            <strong>-1.1 kg</strong>
            <p className="muted">本周下降节奏平稳，没有出现过快波动。</p>
          </div>
        </div>

        <div className="form-panel">
          <div className="section-copy">
            <span className="section-label">最近</span>
            <h3>最近记录</h3>
          </div>
          <div className="log-sheet">
            {recentLogs.map((entry) => (
              <div className="log-row" key={entry.day}>
                <div className="log-row-head">
                  <span className="metric-label">{entry.day}</span>
                  <strong>{entry.weight} kg</strong>
                </div>
                <p className="muted">
                  睡眠 {entry.sleep}，{entry.note}。
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
