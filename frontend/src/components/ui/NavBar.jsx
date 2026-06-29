import { useState } from "react";

export default function NavBar({ brand = "App", links = [] }) {
  const [active, setActive] = useState(
    links.findIndex((l) => l.active) >= 0
      ? links.findIndex((l) => l.active)
      : 0
  );

  return (
    <nav className="proto-nav">
      <div className="proto-nav-brand">{brand}</div>
      <div className="proto-nav-links">
        {links.map((link, i) => (
          <div
            key={i}
            className={`proto-nav-link ${active === i ? "active" : ""}`}
            onClick={() => setActive(i)}
          >
            {link.label}
          </div>
        ))}
      </div>
    </nav>
  );
}
