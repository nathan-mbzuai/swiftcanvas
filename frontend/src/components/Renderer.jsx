import StatRow from "./ui/StatCard.jsx";
import DataTable from "./ui/DataTable.jsx";
import BarChartUI from "./ui/BarChart.jsx";
import LineChartUI from "./ui/LineChart.jsx";
import PieChartUI from "./ui/PieChart.jsx";
import FormUI from "./ui/Form.jsx";
import KanbanBoard from "./ui/KanbanBoard.jsx";
import Timeline from "./ui/Timeline.jsx";
import ListUI from "./ui/List.jsx";
import NavBar from "./ui/NavBar.jsx";
import AlertUI from "./ui/Alert.jsx";
import FileExport from "./ui/FileExport.jsx";

const SECTION_MAP = {
  stat_row:    StatRow,
  table:       DataTable,
  bar_chart:   BarChartUI,
  line_chart:  LineChartUI,
  pie_chart:   PieChartUI,
  form:        FormUI,
  kanban:      KanbanBoard,
  timeline:    Timeline,
  list:        ListUI,
  alert:       AlertUI,
  file_export: FileExport,
};

function ProtoHeader({ title, subtitle, badge }) {
  return (
    <div className="proto-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {badge && <div className="proto-badge">{badge}</div>}
    </div>
  );
}

function Section({ section }) {
  const spanClass =
    section.span === "half"  ? "span-half" :
    section.span === "third" ? "span-third" : "span-full";

  if (section.type === "header") {
    return (
      <div className={spanClass} style={{ gridColumn: "1 / -1" }}>
        <ProtoHeader {...(section.props || {})} />
      </div>
    );
  }

  if (section.type === "stat_row") {
    return (
      <div className="stat-row">
        <StatRow {...(section.props || {})} />
      </div>
    );
  }

  const Component = SECTION_MAP[section.type];
  if (!Component) return null;

  const needsCard = !["kanban", "alert", "file_export"].includes(section.type);

  return (
    <div className={spanClass}>
      {needsCard ? (
        <div className="proto-card">
          {section.props?.title && (
            <div className="proto-card-title">{section.props.title}</div>
          )}
          <Component {...(section.props || {})} />
        </div>
      ) : (
        <Component {...(section.props || {})} />
      )}
    </div>
  );
}

export default function Renderer({ tree }) {
  if (!tree) return null;
  const { nav, sections = [] } = tree;

  return (
    <div className="proto-wrap">
      {nav && (
        <NavBar brand={nav.brand} links={nav.links} />
      )}
      <div className="proto-body">
        <div className="proto-grid">
          {sections.map((section, i) => (
            <Section key={section.id || i} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
