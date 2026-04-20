import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { analyticsApi, PRIORITY_META } from "../api/axios.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import { formatPercent } from "../utils/formatters.js";

const HIGH_RISK_THRESHOLD = 0.35;

function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      try {
        const payload = await analyticsApi.getDashboardOverview();
        if (isMounted) {
          setOverview(payload);
          if (payload?.activeSprint?.id) {
            localStorage.setItem("beacon:lastSprintId", payload.activeSprint.id);
            localStorage.setItem("beacon:lastProjectId", payload.activeSprint.projectId);
          }
        }
      } catch {
        if (isMounted) {
          setError("Could not load dashboard metrics.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const kpis = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      { label: "Portfolio Health", value: `${Math.round(overview.portfolioHealth)} / 100` },
      { label: "Average Velocity", value: `${overview.averageVelocity.toFixed(1)} pts/day` },
      { label: "Active Sprints", value: `${overview.activeSprints}` },
      { label: "Overloaded Members", value: `${overview.overloadedPeople}` },
      { label: "Risk Score", value: formatPercent(overview.riskScore) },
    ];
  }, [overview]);

  const highRiskProjects = useMemo(() => {
    if (!overview?.projects) {
      return [];
    }
    return overview.projects.filter((project) => (project.metrics?.riskIndex ?? 0) >= HIGH_RISK_THRESHOLD);
  }, [overview]);

  if (loading) {
    return (
      <div className="page">
        <Card title="Loading Dashboard">
          <p className="text-muted">Preparing your sprint intelligence stream...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Card title="Dashboard unavailable">
          <p className="form-error">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Performance Overview</p>
          <h1 className="page-title">Agile command center</h1>
          <p className="page-subtitle">
            Stay ahead with live sprint health, risk forecasts, and optimization suggestions.
          </p>
        </div>
        <div className="page-actions">
          <Button as={Link} to="/app/projects" variant="secondary" size="sm">
            View Projects
          </Button>
        </div>
      </div>

      {highRiskProjects.length > 0 ? (
        <Card className="risk-alert-banner" interactive={false}>
          <div className="risk-alert-strip">
            <p className="risk-alert-title">
              <span className="alarm-dot" />
              High Risk Alert: {highRiskProjects.length} project(s) need attention
            </p>
            <div className="risk-alert-list">
              {highRiskProjects.slice(0, 4).map((project) => (
                <span key={project.id} className="risk-alert-pill">
                  {project.name}
                </span>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <section className="kpi-grid">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="kpi-card" interactive={false}>
            <p className="kpi-label">{kpi.label}</p>
            <p className="kpi-value">{kpi.value}</p>
          </Card>
        ))}
      </section>

      <section className="panel-grid">
        <Card
          title={overview.activeSprint.name}
          subtitle={`${overview.activeSprint.projectName} | ${overview.activeSprint.committedStoryPoints} committed pts`}
        >
          <div className="progress-list">
            <div className="progress-item">
              <p>Completion</p>
              <strong>{formatPercent(overview.activeSprint.completionRate)}</strong>
              <div className="progress-track">
                <span
                  className="progress-fill progress-fill-primary"
                  style={{ width: formatPercent(overview.activeSprint.completionRate) }}
                />
              </div>
            </div>
            <div className="progress-item">
              <p>Capacity Utilization</p>
              <strong>{formatPercent(overview.activeSprint.capacityUtilization)}</strong>
              <div className="progress-track">
                <span
                  className="progress-fill progress-fill-warm"
                  style={{ width: formatPercent(overview.activeSprint.capacityUtilization) }}
                />
              </div>
            </div>
            <div className="progress-item">
              <p>Sprint Health</p>
              <strong>{Math.round(overview.activeSprint.healthScore)} / 100</strong>
              <div className="progress-track">
                <span
                  className="progress-fill progress-fill-good"
                  style={{ width: `${Math.round(overview.activeSprint.healthScore)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Team Load Balancer" subtitle="Assigned points vs per-sprint capacity">
          <div className="team-load-list">
            {overview.teamLoad.map((member) => {
              const ratio = member.capacityPerSprint
                ? Math.min(1, member.assignedPoints / member.capacityPerSprint)
                : 0;

              return (
                <div key={member.userId} className="team-load-row">
                  <div>
                    <p>{member.name}</p>
                    <span>
                      {member.assignedPoints} / {member.capacityPerSprint} pts
                    </span>
                  </div>
                  <div className="progress-track">
                    <span
                      className={ratio > 0.9 ? "progress-fill progress-fill-risk" : "progress-fill progress-fill-good"}
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="panel-grid">
        <Card title="Optimization Spotlight" subtitle="Highest priority recommended stories">
          <div className="chip-row">
            <span className="chip">Success Probability {Math.round(overview.optimization.predictedSuccessProbability)}%</span>
            <span className="chip">Utilization {formatPercent(overview.optimization.capacityUtilization)}</span>
            <span className="chip">Feasibility {overview.optimization.feasibilityScore.toFixed(2)}</span>
          </div>

          <div className="priority-legend">
            <p className="priority-legend-title">Priority Column Meaning</p>
            <div className="priority-legend-items">
              <span className="badge priority-high">HIGH = urgent, high impact</span>
              <span className="badge priority-medium">MEDIUM = important, schedulable</span>
              <span className="badge priority-low">LOW = flexible, lower impact</span>
            </div>
          </div>

          <div className="task-stack-head">
            <span>Recommended Task</span>
            <span>Priority Column</span>
          </div>

          <div className="task-stack">
            {overview.optimization.recommendedTasks.map((task) => (
              <div key={task.id} className="task-stack-item">
                <div>
                  <p>{task.title}</p>
                  <span>{task.storyPoints} story points</span>
                </div>
                <span className={`badge ${PRIORITY_META[task.priority]?.className}`}>{task.priority}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Portfolio Throughput" subtitle="Completed tasks by project">
          <div className="throughput-list">
            {overview.projects.map((project) => {
              const completion = project.metrics.totalTasks
                ? project.metrics.completedTasks / project.metrics.totalTasks
                : 0;
              const highRisk = (project.metrics?.riskIndex ?? 0) >= HIGH_RISK_THRESHOLD;

              return (
                <div key={project.id} className={`throughput-row ${highRisk ? "risk-alarm-row" : ""}`}>
                  <div className="throughput-head">
                    <p>
                      {highRisk ? <span className="alarm-dot" /> : null} {project.name}
                    </p>
                    <span>{Math.round(completion * 100)}%</span>
                  </div>
                  <div className="progress-track">
                    <span className="progress-fill progress-fill-primary" style={{ width: `${Math.round(completion * 100)}%` }} />
                  </div>
                  {highRisk ? <span className="risk-alert-pill">Risk {formatPercent(project.metrics.riskIndex)}</span> : null}
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}

export default Dashboard;
