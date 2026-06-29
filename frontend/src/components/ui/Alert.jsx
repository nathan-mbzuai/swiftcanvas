const ICONS = { info: "ℹ️", success: "✅", warning: "⚠️", error: "❌" };

export default function AlertUI({ type = "info", title, message }) {
  return (
    <div className={`proto-alert ${type}`}>
      <span className="alert-icon">{ICONS[type] || "ℹ️"}</span>
      <div className="alert-body">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-message">{message}</div>
      </div>
    </div>
  );
}
