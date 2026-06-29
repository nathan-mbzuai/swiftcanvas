export default function StatRow({ stats = [] }) {
  return stats.map((stat, i) => (
    <div key={i} className="stat-card">
      <div className="stat-label">{stat.label}</div>
      <div className="stat-value">{stat.value}</div>
      {stat.change && (
        <div className={`stat-change trend-${stat.trend || "neutral"}`}>
          {stat.trend === "up" ? "▲" : stat.trend === "down" ? "▼" : "—"} {stat.change}
        </div>
      )}
    </div>
  ));
}
