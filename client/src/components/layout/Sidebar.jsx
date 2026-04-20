import { Link, useLocation } from "react-router-dom";

const getQuickLinks = () => ({
  sprintId: localStorage.getItem("beacon:lastSprintId") ?? "s-001",
});

function Sidebar() {
  const quickLinks = getQuickLinks();
  const location = useLocation();

  const navItems = [
    { to: "/app", label: "Dashboard", icon: "D" },
    { to: "/app/projects", label: "Projects", icon: "P" },
    { to: "/app/backlog", label: "Backlog", icon: "B" },
    { to: "/app/analytics", label: "Analytics", icon: "A" },
    { to: `/app/sprints/${quickLinks.sprintId}`, label: "Sprint View", icon: "S" },
  ];

  const isItemActive = (item) => {
    const path = location.pathname;
    if (item.to === "/app") {
      return path === "/app";
    }
    if (item.to === "/app/projects") {
      return (path === "/app/projects" || /^\/app\/projects\/[^/]+$/.test(path)) && !path.endsWith("/backlog");
    }
    if (item.to === "/app/backlog") {
      return path === "/app/backlog" || path.endsWith("/backlog");
    }
    if (item.to.startsWith("/app/sprints/")) {
      return path.startsWith("/app/sprints/");
    }
    return path === item.to;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-orb" />
        <div>
          <h1>Beacon</h1>
          <p>Agile Intelligence Hub</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-item ${isItemActive(item) ? "active-manual" : ""}`}
            aria-current={isItemActive(item) ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Optimization Engine</p>
        <strong>Realtime Insight Mode</strong>
      </div>
    </aside>
  );
}

export default Sidebar;
