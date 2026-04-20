import { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card.jsx";
import { analyticsApi, projectApi, sprintApi } from "../api/axios.js";
import { formatPercent } from "../utils/formatters.js";

function Analytics() {
  const [overview, setOverview] = useState(null);
  const [projectAnalytics, setProjectAnalytics] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadAnalytics = async () => {
      const dashboard = await analyticsApi.getDashboardOverview();
      const projects = await projectApi.getProjects();
      const analyticsByProject = await Promise.all(
        projects.map(async (project) => ({
          project,
          analytics: await analyticsApi.getProjectAnalytics(project.id),
        })),
      );
      const sprintRows = await Promise.all(
        projects.flatMap((project) =>
          (project.activeSprintId ? [project.activeSprintId] : []).map(async (sprintId) => ({
            sprint: await sprintApi.getSprintById(sprintId),
            analytics: await analyticsApi.getSprintAnalytics(sprintId),
          })),
        ),
      );

      if (!active) {
        return;
      }

      setOverview(dashboard);
      setProjectAnalytics(analyticsByProject);
      setSprints(sprintRows.filter((row) => row.sprint && row.analytics));
      setLoading(false);
    };

    loadAnalytics();

    return () => {
      active = false;
    };
  }, []);

  const overloadRows = useMemo(() => overview?.teamLoad ?? [], [overview]);

  if (loading) {
    return (
      <div className="page">
        <Card title="Loading analytics" interactive={false}>
          <p className="text-muted">Preparing velocity, health, and workload insights...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Analytics Engine</p>
          <h1 className="page-title">Delivery intelligence</h1>
          <p className="page-subtitle">Velocity, risk, and capacity metrics derived from Beacon&apos;s analytics formulas.</p>
        </div>
      </div>

      <section className="kpi-grid">
        <Card interactive={false}>
          <p className="kpi-label">Portfolio Health</p>
          <p className="kpi-value">{Math.round(overview?.portfolioHealth ?? 0)} / 100</p>
        </Card>
        <Card interactive={false}>
          <p className="kpi-label">Average Velocity</p>
          <p className="kpi-value">{Number(overview?.averageVelocity ?? 0).toFixed(1)} pts/day</p>
        </Card>
        <Card interactive={false}>
          <p className="kpi-label">Active Sprints</p>
          <p className="kpi-value">{overview?.activeSprints ?? 0}</p>
        </Card>
        <Card interactive={false}>
          <p className="kpi-label">Risk Score</p>
          <p className="kpi-value">{formatPercent(overview?.riskScore ?? 0)}</p>
        </Card>
      </section>

      <section className="panel-grid">
        <Card title="Project analytics" subtitle="Average velocity, sprint count, and delivery risk by project">
          <div className="mini-list">
            {projectAnalytics.map(({ project, analytics }) => (
              <div key={project.id} className="mini-list-item">
                <div className="split-line">
                  <strong>{project.name}</strong>
                  <span className="status-chip">{project.status}</span>
                </div>
                <p>Average velocity {Number(analytics.averageVelocity ?? 0).toFixed(1)} pts/day</p>
                <p>Total sprints {analytics.totalSprints}</p>
                <p>Risk index {formatPercent(analytics.riskIndex ?? 0)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Active sprint analytics" subtitle="Current health and completion signals">
          <div className="mini-list">
            {sprints.length === 0 ? <p className="text-muted">No active sprint analytics available yet.</p> : null}
            {sprints.map(({ sprint, analytics }) => (
              <div key={sprint.id} className="mini-list-item">
                <div className="split-line">
                  <strong>{sprint.name}</strong>
                  <span className="status-chip">{sprint.status}</span>
                </div>
                <p>Velocity {Number(analytics.velocity ?? 0).toFixed(1)} pts/day</p>
                <p>Health {Math.round(analytics.healthScore ?? 0)} / 100</p>
                <p>Completion {formatPercent(analytics.completionRate ?? 0)}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card title="Workload balance" subtitle="Assigned points vs per-sprint team capacity" interactive={false}>
        <div className="mini-list">
          {overloadRows.map((member) => (
            <div key={member.userId} className="mini-list-item">
              <div className="split-line">
                <strong>{member.name}</strong>
                <span className="status-chip">{member.assignedPoints > member.capacityPerSprint ? "Overloaded" : "Balanced"}</span>
              </div>
              <p>
                {member.assignedPoints} / {member.capacityPerSprint} story points
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default Analytics;
