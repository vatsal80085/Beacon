import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { projectApi, STATUS_META } from "../api/axios.js";
import Card from "../components/common/Card.jsx";
import Button from "../components/common/Button.jsx";
import { formatDate, formatPercent } from "../utils/formatters.js";

const HIGH_RISK_THRESHOLD = 0.35;

const emptyProjectForm = {
  name: "",
  description: "",
  status: "PLANNED",
  startDate: "",
  endDate: "",
};

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [formMode, setFormMode] = useState(null);
  const [alert, setAlert] = useState({ message: "", type: "", visible: false });
  const alertTimeoutRef = useRef(null);

  const showAlert = (message, type = "success") => {
    setAlert({ message, type, visible: true });
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
    }
    alertTimeoutRef.current = window.setTimeout(() => {
      setAlert((prev) => ({ ...prev, visible: false }));
      alertTimeoutRef.current = null;
    }, 3000);
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  };
  const [formValues, setFormValues] = useState(emptyProjectForm);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadProjects = useCallback(async () => {
    const items = await projectApi.getProjects();
    setProjects(items);
    if (items.length > 0) {
      localStorage.setItem("beacon:lastProjectId", items[0].id);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const items = await projectApi.getProjects();
        if (!isMounted) {
          return;
        }
        setProjects(items);
        if (items.length > 0) {
          localStorage.setItem("beacon:lastProjectId", items[0].id);
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
  }, []);

  const filteredProjects = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery = lowered
        ? project.name.toLowerCase().includes(lowered) || project.description.toLowerCase().includes(lowered)
        : true;
      const matchesStatus = statusFilter === "ALL" ? true : project.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  const highRiskProjects = useMemo(
    () => projects.filter((project) => (project.metrics?.riskIndex ?? 0) >= HIGH_RISK_THRESHOLD),
    [projects],
  );

  const openCreateForm = () => {
    setFormMode("create");
    setActiveProjectId(null);
    setFormValues(emptyProjectForm);
    setActionError("");
  };

  const openEditForm = (project) => {
    setFormMode("edit");
    setActiveProjectId(project.id);
    setFormValues({
      name: project.name ?? "",
      description: project.description ?? "",
      status: project.status ?? "PLANNED",
      startDate: project.startDate ? String(project.startDate).slice(0, 10) : "",
      endDate: project.endDate ? String(project.endDate).slice(0, 10) : "",
    });
    setActionError("");
  };

  const closeForm = () => {
    setFormMode(null);
    setActiveProjectId(null);
    setFormValues(emptyProjectForm);
    setActionError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmitProject = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setActionError("");

    try {
      if (formMode === "create") {
        await projectApi.createProject(formValues);
        showAlert("Project created successfully.");
      } else if (formMode === "edit" && activeProjectId) {
        await projectApi.updateProject(activeProjectId, formValues);
        showAlert("Project updated successfully.");
      }
      await loadProjects();
      closeForm();
    } catch {
      setActionError("Project save failed. Please try again.");
      showAlert("Project save failed. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    const shouldDelete = window.confirm("Delete this project and all linked sprints/tasks?");
    if (!shouldDelete) {
      return;
    }

    try {
      await projectApi.deleteProject(projectId);
      await loadProjects();
      showAlert("Project deleted successfully.");
    } catch {
      showAlert("Project delete failed. Please try again.", "error");
    }
  };

  return (
    <div className="page">
      {alert.visible ? (
        <div className={`project-alert project-alert-${alert.type}`} role="status">
          <span>{alert.message}</span>
          <button type="button" onClick={hideAlert} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      ) : null}
      <div className="page-header">
        <div>
          <p className="eyebrow">Project Portfolio</p>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Track health, risk, and throughput across every active initiative.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" size="sm" onClick={openCreateForm}>
            New Project
          </Button>
        </div>
      </div>

      <Card className="filter-bar" interactive={false}>
        <input
          className="filter-input"
          type="search"
          placeholder="Search projects..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PLANNED">Planned</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </Card>

      {highRiskProjects.length > 0 ? (
        <Card className="risk-alert-banner" interactive={false}>
          <div className="risk-alert-strip">
            <p className="risk-alert-title">
              <span className="alarm-dot" />
              Alert: {highRiskProjects.length} high-risk project(s) detected
            </p>
            <div className="risk-alert-list">
              {highRiskProjects.slice(0, 5).map((project) => (
                <span key={project.id} className="risk-alert-pill">
                  {project.name}
                </span>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {formMode ? (
        <Card
          title={formMode === "create" ? "Create New Project" : "Edit Project"}
          subtitle="Updates will refresh backlog and sprint metrics automatically."
          interactive={false}
        >
          <form className="entity-form" onSubmit={handleSubmitProject}>
            <label htmlFor="project-name">Project Name</label>
            <input
              id="project-name"
              className="filter-input"
              name="name"
              value={formValues.name}
              onChange={handleFormChange}
              required
            />

            <label htmlFor="project-description">Description</label>
            <input
              id="project-description"
              className="filter-input"
              name="description"
              value={formValues.description}
              onChange={handleFormChange}
            />

            <div className="form-grid">
              <div>
                <label htmlFor="project-status">Status</label>
                <select
                  id="project-status"
                  className="filter-select"
                  name="status"
                  value={formValues.status}
                  onChange={handleFormChange}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="project-startDate">Start Date</label>
                <input
                  id="project-startDate"
                  className="filter-input"
                  type="date"
                  name="startDate"
                  value={formValues.startDate}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <label htmlFor="project-endDate">End Date</label>
                <input
                  id="project-endDate"
                  className="filter-input"
                  type="date"
                  name="endDate"
                  value={formValues.endDate}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            {actionError ? <p className="form-error">{actionError}</p> : null}

            <div className="project-actions">
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                {formMode === "create" ? "Create Project" : "Save Changes"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {loading ? (
        <Card title="Loading projects" interactive={false}>
          <p className="text-muted">Collecting project snapshots...</p>
        </Card>
      ) : (
        <section className="project-grid">
          {filteredProjects.map((project) => {
            const completion = project.metrics.totalTasks
              ? project.metrics.completedTasks / project.metrics.totalTasks
              : 0;
            const isHighRisk = (project.metrics?.riskIndex ?? 0) >= HIGH_RISK_THRESHOLD;

            return (
              <Card
                key={project.id}
                title={project.name}
                subtitle={project.description}
                className={isHighRisk ? "risk-alarm-card" : ""}
              >
                <div className="project-meta">
                  <span className={`badge ${STATUS_META[project.status]?.className}`}>{project.status}</span>
                  <span>{project.teamMembers.length} members</span>
                  <span>
                    {formatDate(project.startDate)} - {formatDate(project.endDate)}
                  </span>
                  {isHighRisk ? (
                    <span className="risk-alert-pill">
                      <span className="alarm-dot" />
                      High Risk
                    </span>
                  ) : null}
                </div>

                <div className="metric-pair-grid">
                  <div>
                    <p>Total Tasks</p>
                    <strong>{project.metrics.totalTasks}</strong>
                  </div>
                  <div>
                    <p>Blocked</p>
                    <strong>{project.metrics.blockedTasks}</strong>
                  </div>
                  <div>
                    <p>Avg Velocity</p>
                    <strong>{project.metrics.avgVelocity.toFixed(1)}</strong>
                  </div>
                  <div>
                    <p>Risk Index</p>
                    <strong>{formatPercent(project.metrics.riskIndex)}</strong>
                  </div>
                </div>

                <div className="progress-item">
                  <p>Completion</p>
                  <strong>{formatPercent(completion)}</strong>
                  <div className="progress-track">
                    <span className="progress-fill progress-fill-primary" style={{ width: formatPercent(completion) }} />
                  </div>
                </div>

                <div className="project-actions">
                  <Button as={Link} to={`/app/projects/${project.id}`} variant="primary" size="sm">
                    Open Details
                  </Button>
                  <Button as={Link} to={`/app/projects/${project.id}/backlog`} variant="ghost" size="sm">
                    Backlog
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEditForm(project)}>
                    Edit
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => handleDeleteProject(project.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default Projects;
