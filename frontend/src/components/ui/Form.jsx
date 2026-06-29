import { useState } from "react";

export default function FormUI({ title, fields = [], submit_label = "Submit" }) {
  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(id, value) {
    setValues(prev => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  }

  return (
    <form className="proto-form" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div key={field.id} className="form-field">
          <label className="form-label">
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>

          {field.type === "select" && (
            <select
              className="form-select"
              value={values[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
            >
              <option value="">Select…</option>
              {(field.options || []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {field.type === "textarea" && (
            <textarea
              className="form-textarea"
              placeholder={field.placeholder || ""}
              value={values[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
            />
          )}

          {field.type === "checkbox" && (
            <div className="form-checkbox-row">
              <input
                type="checkbox"
                className="form-checkbox"
                id={field.id}
                checked={!!values[field.id]}
                onChange={(e) => handleChange(field.id, e.target.checked)}
              />
              <label htmlFor={field.id} style={{ fontSize: "0.82rem", color: "#374151" }}>
                {field.placeholder || field.label}
              </label>
            </div>
          )}

          {!["select", "textarea", "checkbox"].includes(field.type) && (
            <input
              type={field.type || "text"}
              className="form-input"
              placeholder={field.placeholder || ""}
              value={values[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
            />
          )}
        </div>
      ))}

      <button type="submit" className="btn-submit">
        {submitted ? "✓ Submitted!" : submit_label}
      </button>
    </form>
  );
}
