export default function Timeline({ title, events = [] }) {
  return (
    <div>
      {title && <div className="proto-card-title" style={{ marginBottom: 14 }}>{title}</div>}
      <div className="timeline">
        {events.map((evt, i) => (
          <div key={i} className="timeline-event">
            <div className="timeline-track">
              <div className={`timeline-dot ${evt.status || "upcoming"}`} />
              {i < events.length - 1 && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-date">{evt.date}</div>
              <div className="timeline-title">{evt.title}</div>
              {evt.description && <div className="timeline-desc">{evt.description}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
