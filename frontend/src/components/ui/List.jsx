export default function ListUI({ title, items = [], numbered = false }) {
  return (
    <div>
      {title && <div className="proto-card-title" style={{ marginBottom: 10 }}>{title}</div>}
      <div className="proto-list">
        {items.map((item, i) => (
          <div key={i} className="list-item">
            {numbered && (
              <div className="list-number">{i + 1}</div>
            )}
            <div className="list-text">
              <div className="list-primary">{item.primary}</div>
              {item.secondary && <div className="list-secondary">{item.secondary}</div>}
            </div>
            {item.badge && (
              <span
                className="list-badge"
                style={{
                  background: item.badgeColor ? `${item.badgeColor}18` : "#f1f5f9",
                  color: item.badgeColor || "#64748b",
                  border: `1px solid ${item.badgeColor ? item.badgeColor + "40" : "#e2e8f0"}`,
                }}
              >
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
