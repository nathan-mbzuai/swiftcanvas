import { useState } from "react";

export default function KanbanBoard({ title, columns: initialColumns = [] }) {
  const [cols, setCols] = useState(initialColumns);
  const [dragging, setDragging] = useState(null);

  function onDragStart(colIdx, cardIdx) {
    setDragging({ colIdx, cardIdx });
  }

  function onDrop(targetColIdx) {
    if (!dragging) return;
    const { colIdx, cardIdx } = dragging;
    if (colIdx === targetColIdx) { setDragging(null); return; }

    const updated = cols.map(c => ({ ...c, cards: [...c.cards] }));
    const [card] = updated[colIdx].cards.splice(cardIdx, 1);
    updated[targetColIdx].cards.push(card);
    setCols(updated);
    setDragging(null);
  }

  return (
    <div>
      {title && <div className="proto-card-title" style={{ marginBottom: 14 }}>{title}</div>}
      <div className="kanban-board">
        {cols.map((col, ci) => (
          <div
            key={col.id || ci}
            className="kanban-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(ci)}
          >
            <div className="kanban-col-header">
              <span className="kanban-col-dot" style={{ background: col.color || "#6366f1" }} />
              <span className="kanban-col-title">{col.title}</span>
              <span className="kanban-col-count">{col.cards?.length || 0}</span>
            </div>
            <div className="kanban-cards">
              {(col.cards || []).map((card, ki) => (
                <div
                  key={card.id || ki}
                  className="kanban-card"
                  draggable
                  onDragStart={() => onDragStart(ci, ki)}
                  style={{ opacity: dragging?.colIdx === ci && dragging?.cardIdx === ki ? 0.5 : 1, cursor: "grab" }}
                >
                  {card.tag && <div className="kanban-card-tag">{card.tag}</div>}
                  <div className="kanban-card-title">
                    {card.title}
                    {card.priority && (
                      <span className={`priority-dot priority-${card.priority}`} title={card.priority} />
                    )}
                  </div>
                  {card.subtitle && <div className="kanban-card-subtitle">{card.subtitle}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
