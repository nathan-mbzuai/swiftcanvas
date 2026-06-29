import { useState } from "react";

function badgeClass(value) {
  const v = String(value).toLowerCase().replace(/\s+/g, "-");
  const known = ["active","completed","approved","online","done","pending","review","in-progress","scheduled","overdue","cancelled","rejected","offline","critical"];
  return known.includes(v) ? `cell-badge badge-${v}` : "cell-badge badge-default";
}

export default function DataTable({ title, columns = [], rows = [], sortable = true }) {
  const [sortKey, setSortKey]   = useState(null);
  const [sortDir, setSortDir]   = useState("asc");

  function handleSort(key) {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rows;

  return (
    <div className="proto-table-wrap">
      <table className="proto-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} onClick={() => handleSort(col.key)}>
                {col.label}
                {sortable && (
                  <span className="sort-icon">
                    {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.type === "badge" ? (
                    <span className={badgeClass(row[col.key])}>{row[col.key]}</span>
                  ) : (
                    row[col.key] ?? ""
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
