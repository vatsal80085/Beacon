import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { projectApi, sprintApi, STATUS_META } from "../api/axios.js";
import Card from "../components/common/Card.jsx";
import { useLiveRefresh } from "../hooks/useLiveRefresh.js";
import { LIVE_CHANNELS } from "../realtime/liveChannels.js";
import { formatDate, statusToLabel } from "../utils/formatters.js";

function Sprints() {
  const [projects, setProjects] = useState([]);
  const [sprintsByProject, setSprintsByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSprints = useCallback(async () => {
    const projectData = await projectApi.getProjects();
    setProjects(projectData);

    const sprintEntries = await Promise.all(
      projectData.map(async (project) => [project.id, await sprintApi.getSprintsByProject(project.id)]),
    );

    setSprintsByProject(Object.fromEntries(sprintEntries));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setError("");
        await loadSprints();
      } catch {
        if (isMounted) {
          setError("Could not load sprints.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [loadSprints]);

  useLiveRefresh(loadSprints, {
    enabled: !loading,
    channels: [LIVE_CHANNELS.sprints, LIVE_CHANNELS.projects],
  });

  const flattened = useMemo(() => {
    const rows = [];
    projects.forEach((project) => {
      const projectSprints = sprintsByProject[project.id] ?? [];
      projectSprints.forEach((sprint) => {
        rows.push({
          ...sprint,
          projectName: project.name,
          projectId: project.id,
        });
      });
    });
    return rows;
  }, [projects, sprintsByProject]);

  const activeSprints = useMemo(() => flattened.filter((sprint) => sprint.status === "ACTIVE"), [flattened]);
  const plannedSprints = useMemo(() => flattened.filter((sprint) => sprint.status === "PLANNED"), [flattened]);
  const completedSprints = useMemo(() => flattened.filter((sprint) => sprint.status === "COMPLETED"), [flattened]);

  if (loading) {
    return (
      <div className="page">
        <Card title="Loading sprints" interactive={false}>
          <p className="text-muted">Fetching sprint timelines...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Card title="Sprints unavailable" interactive={false}>
          <p className="form-error">{error}</p>
        </Card>
      </div>
    );
  }

  if (flattened.length === 0) {
    return (
      <div className="page">
        <Card title="No sprints yet" subtitle="Create a sprint inside a project" interactive={false}>
          <p className="text-muted" style={{ padding: "1rem" }}>
            Head to <Link to="/app/projects">Projects</Link> to create your first sprint.
          </p>
        </Card>
      </div>
    );
  }

  const renderList = (items, title, subtitle) => (
    <Card title={title} subtitle={subtitle} interactive={false}>
      <div className="invite-list">
        {items.map((sprint) => (
          <article key={sprint.id} className="invite-row">
            <div>
              <h4>{sprint.name}</h4>
              <p className="text-muted">{sprint.projectName}</p>
              <span>
                {sprint.startDate ? formatDate(sprint.startDate) : "-"} {"->"} {sprint.endDate ? formatDate(sprint.endDate) : "-"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className={`badge ${STATUS_META[sprint.status]?.className ?? ""}`}>{statusToLabel(sprint.status)}</span>
              <Link
                to={`/app/sprints/${sprint.id}`}
                onClick={() => localStorage.setItem("beacon:lastSprintId", sprint.id)}
                className="nav-item"
                style={{ textDecoration: "none" }}
              >
                Open
              </Link>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Sprint Board</p>
          <h1 className="page-title">Sprints</h1>
          <p className="page-subtitle">Browse active, planned, and completed sprints across your projects.</p>
        </div>
      </div>

      {renderList(activeSprints, "Active Sprints", `${activeSprints.length} in progress`)}
      {renderList(plannedSprints, "Planned Sprints", `${plannedSprints.length} upcoming`)}
      {renderList(completedSprints, "Completed Sprints", `${completedSprints.length} delivered`)}
    </div>
  );
}

export default Sprints;
