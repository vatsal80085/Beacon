import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { optimizationApi, PRIORITY_META, STATUS_META, projectApi, taskApi } from "../api/axios.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import { statusToLabel } from "../utils/formatters.js";

const ALL_ONGOING_SCOPE = "ONGOING";

const sortByOptions = [
  { value: "priority", label: "Priority" },
  { value: "storyPoints", label: "Story points" },
  { value: "risk", label: "Risk score" },
];

const backlogStatusOptions = [
  { value: "TODO", label: "To Do" },
  { value: "BLOCKED", label: "Blocked" },
];

const priorityOptions = ["HIGH", "MEDIUM", "LOW"];

const defaultTaskForm = {
  projectId: "",
  title: "",
  description: "",
  priority: "MEDIUM",
  storyPoints: 3,
  risk: 0.2,
  status: "TODO",
};

function Backlog() {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams();

  const [selectedScope, setSelectedScope] = useState(routeProjectId ?? ALL_ONGOING_SCOPE);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [sprintsByProject, setSprintsByProject] = useState({});
  const [optimization, setOptimization] = useState(null);
  const [sortBy, setSortBy] = useState("priority");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedScope(routeProjectId ?? ALL_ONGOING_SCOPE);
  }, [routeProjectId]);

  const ongoingProjects = useMemo(
    () => projects.filter((item) => item.status === "ACTIVE" || item.status === "PLANNED"),
    [projects],
  );

  const loadBacklog = useCallback(async () => {
    const projectsData = await projectApi.getProjects();
    setProjects(projectsData);

    const ongoing = projectsData.filter((item) => item.status === "ACTIVE" || item.status === "PLANNED");

    const effectiveScope =
      selectedScope !== ALL_ONGOING_SCOPE && projectsData.some((item) => item.id === selectedScope)
        ? selectedScope
        : ALL_ONGOING_SCOPE;
    if (effectiveScope !== selectedScope) {
      setSelectedScope(effectiveScope);
    }

    const scopedProjects =
      effectiveScope === ALL_ONGOING_SCOPE ? ongoing : projectsData.filter((item) => item.id === effectiveScope);

    if (scopedProjects.length === 0) {
      setProject(null);
      setTasks([]);
      setSprintsByProject({});
      setOptimization(null);
      return;
    }

    const [scopedDetails, scopedBacklogs] = await Promise.all([
      Promise.all(scopedProjects.map((item) => projectApi.getProjectById(item.id))),
      Promise.all(scopedProjects.map((item) => taskApi.getBacklogByProject(item.id))),
    ]);

    const sprintMap = {};
    const projectNameById = new Map();

    scopedProjects.forEach((item) => {
      projectNameById.set(item.id, item.name);
    });

    scopedDetails.forEach((item) => {
      if (item?.id) {
        sprintMap[item.id] = item.sprints ?? [];
      }
    });

    setSprintsByProject(sprintMap);

    const mergedTasks = scopedBacklogs.flat().map((task) => ({
      ...task,
      projectName: projectNameById.get(task.projectId) ?? "Unknown Project",
    }));

    setTasks(mergedTasks);

    if (effectiveScope === ALL_ONGOING_SCOPE) {
      setProject(null);
      setOptimization(null);
      return;
    }

    const selectedProject = scopedDetails.find((item) => item?.id === effectiveScope) ?? null;
    setProject(selectedProject);

    if (selectedProject?.id) {
      localStorage.setItem("beacon:lastProjectId", selectedProject.id);
    }

    const activeSprint = selectedProject?.sprints?.find((sprint) => sprint.status === "ACTIVE");
    if (activeSprint?.id) {
      localStorage.setItem("beacon:lastSprintId", activeSprint.id);
    }

    const optimizationData = activeSprint ? await optimizationApi.optimizeSprint(activeSprint.id) : null;
    setOptimization(optimizationData);
  }, [selectedScope]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setError("");
        await loadBacklog();
      } catch {
        if (isMounted) {
          setError("Backlog data could not be loaded.");
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
  }, [loadBacklog]);

  const actionableSprintsByProject = useMemo(() => {
    return Object.fromEntries(
      Object.entries(sprintsByProject).map(([projectId, sprints]) => {
        const options = (sprints ?? []).filter((sprint) => sprint.status === "ACTIVE" || sprint.status === "PLANNED");
        return [projectId, options];
      }),
    );
  }, [sprintsByProject]);

  const activeSprintByProject = useMemo(() => {
    return Object.fromEntries(
      Object.entries(actionableSprintsByProject).map(([projectId, sprints]) => {
        const activeSprint = (sprints ?? []).find((sprint) => sprint.status === "ACTIVE") ?? null;
        return [projectId, activeSprint];
      }),
    );
  }, [actionableSprintsByProject]);

  const sortedTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (!query.trim()) {
        return true;
      }

      const normalized = query.trim().toLowerCase();
      return (
        task.title?.toLowerCase().includes(normalized) ||
        task.description?.toLowerCase().includes(normalized) ||
        task.projectName?.toLowerCase().includes(normalized)
      );
    });

    const next = [...filtered];

    if (sortBy === "priority") {
      next.sort((left, right) => {
        const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (order[right.priority] ?? 0) - (order[left.priority] ?? 0);
      });
      return next;
    }

    if (sortBy === "storyPoints") {
      next.sort((left, right) => right.storyPoints - left.storyPoints);
      return next;
    }

    next.sort((left, right) => (right.risk?.score ?? 0) - (left.risk?.score ?? 0));
    return next;
  }, [query, sortBy, tasks]);

  const backlogSummary = useMemo(() => {
    return {
      totalStories: sortedTasks.length,
      highPriority: sortedTasks.filter((task) => task.priority === "HIGH").length,
      blockedStories: sortedTasks.filter((task) => task.status === "BLOCKED").length,
      totalPoints: sortedTasks.reduce((sum, task) => sum + Number(task.storyPoints ?? 0), 0),
    };
  }, [sortedTasks]);

  const backlogCountsByProject = useMemo(() => {
    return sortedTasks.reduce((accumulator, task) => {
      const key = task.projectId;
      const previous = accumulator[key] ?? { projectName: task.projectName, count: 0, points: 0 };
      accumulator[key] = {
        projectName: previous.projectName,
        count: previous.count + 1,
        points: previous.points + Number(task.storyPoints ?? 0),
      };
      return accumulator;
    }, {});
  }, [sortedTasks]);

  const openCreateTaskForm = () => {
    const defaultProjectId =
      selectedScope !== ALL_ONGOING_SCOPE ? selectedScope : ongoingProjects[0]?.id ?? projects[0]?.id ?? "";
    setShowTaskForm(true);
    setEditingTaskId(null);
    setTaskForm({ ...defaultTaskForm, projectId: defaultProjectId });
    setError("");
  };

  const openEditTaskForm = (task) => {
    setShowTaskForm(true);
    setEditingTaskId(task.id);
    setTaskForm({
      projectId: task.projectId,
      title: task.title,
      description: task.description ?? "",
      priority: task.priority ?? "MEDIUM",
      storyPoints: task.storyPoints ?? 0,
      risk: task.risk?.score ?? 0.2,
      status: task.status ?? "TODO",
    });
    setError("");
  };

  const handleTaskFormChange = (event) => {
    const { name, value } = event.target;
    setTaskForm((previous) => ({
      ...previous,
      [name]: name === "storyPoints" || name === "risk" ? Number(value) : value,
    }));
  };

  const handleScopeChange = (event) => {
    const nextScope = event.target.value;
    setSelectedScope(nextScope);
    if (nextScope === ALL_ONGOING_SCOPE) {
      navigate("/app/backlog");
      return;
    }
    navigate(`/app/projects/${nextScope}/backlog`);
  };

  const handleSubmitTask = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!taskForm.projectId) {
        setError("Select a project for this backlog story.");
        setSaving(false);
        return;
      }

      const payload = {
        projectId: taskForm.projectId,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        storyPoints: taskForm.storyPoints,
        status: taskForm.status,
        risk: {
          score: taskForm.risk,
          level: taskForm.risk >= 0.6 ? "HIGH" : taskForm.risk >= 0.3 ? "MEDIUM" : "LOW",
        },
      };

      if (editingTaskId) {
        await taskApi.updateTask(editingTaskId, payload);
      } else {
        await taskApi.createTask(payload);
      }

      await loadBacklog();
      setShowTaskForm(false);
      setEditingTaskId(null);
    } catch {
      setError("Task update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handlePlanStoryToSprint = async (task, sprintId) => {
    try {
      setError("");
      await taskApi.updateTask(task.id, { sprintId, status: "TODO" });
      localStorage.setItem("beacon:lastProjectId", task.projectId);
      localStorage.setItem("beacon:lastSprintId", sprintId);
      await loadBacklog();
    } catch {
      setError("Could not plan this story into sprint.");
    }
  };

  const handlePriorityChange = async (taskId, priority) => {
    try {
      setError("");
      await taskApi.updateTask(taskId, { priority });
      await loadBacklog();
    } catch {
      setError("Could not update story priority.");
    }
  };

  const handleBacklogStatusChange = async (taskId, status) => {
    try {
      setError("");
      await taskApi.updateTaskStatus(taskId, status);
      await loadBacklog();
    } catch {
      setError("Could not update story status.");
    }
  };

  const handleCloneTask = async (task) => {
    try {
      setError("");
      await taskApi.createTask({
        projectId: task.projectId,
        title: `${task.title} (Copy)`,
        description: task.description ?? "",
        priority: task.priority ?? "MEDIUM",
        storyPoints: Number(task.storyPoints ?? 0),
        status: task.status ?? "TODO",
        risk: task.risk ?? { score: 0.2, level: "LOW" },
      });
      await loadBacklog();
    } catch {
      setError("Could not clone this story.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    const shouldDelete = window.confirm("Delete this backlog task?");
    if (!shouldDelete) {
      return;
    }

    try {
      setError("");
      await taskApi.deleteTask(taskId);
      await loadBacklog();
    } catch {
      setError("Could not delete this story.");
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Card title="Loading backlog" interactive={false}>
          <p className="text-muted">Preparing cross-project backlog insights...</p>
        </Card>
      </div>
    );
  }

  if (selectedScope !== ALL_ONGOING_SCOPE && !project) {
    return (
      <div className="page">
        <Card title="Backlog unavailable" interactive={false}>
          <p className="form-error">The project backlog could not be loaded.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Backlog Prioritization</p>
          <h1 className="page-title">{selectedScope === ALL_ONGOING_SCOPE ? "Ongoing Projects Backlog" : project?.name}</h1>
          <p className="page-subtitle">
            {selectedScope === ALL_ONGOING_SCOPE
              ? "Review and prioritize stories across all active/planned projects."
              : "Score and sequence stories for smarter sprint commitments."}
          </p>
        </div>
        <div className="page-actions">
          <select className="filter-select" value={selectedScope} onChange={handleScopeChange}>
            <option value={ALL_ONGOING_SCOPE}>All Ongoing Projects</option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({statusToLabel(item.status)})
              </option>
            ))}
          </select>
          <Button type="button" variant="primary" size="sm" onClick={openCreateTaskForm}>
            Add Backlog Story
          </Button>
          {project?.id ? (
            <Button as={Link} to={`/app/projects/${project.id}`} variant="ghost" size="sm">
              Project Details
            </Button>
          ) : null}
        </div>
      </div>

      <section className="kpi-grid">
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Backlog Stories</p>
          <p className="kpi-value">{backlogSummary.totalStories}</p>
        </Card>
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">High Priority</p>
          <p className="kpi-value">{backlogSummary.highPriority}</p>
        </Card>
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Blocked Stories</p>
          <p className="kpi-value">{backlogSummary.blockedStories}</p>
        </Card>
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Total Story Points</p>
          <p className="kpi-value">{backlogSummary.totalPoints}</p>
        </Card>
      </section>

      {showTaskForm ? (
        <Card title={editingTaskId ? "Edit Backlog Story" : "Create Backlog Story"} interactive={false}>
          <form className="entity-form" onSubmit={handleSubmitTask}>
            <label htmlFor="backlog-project">Project</label>
            <select
              id="backlog-project"
              className="filter-select"
              name="projectId"
              value={taskForm.projectId}
              onChange={handleTaskFormChange}
              disabled={Boolean(editingTaskId)}
              required
            >
              <option value="" disabled>
                Select project
              </option>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <label htmlFor="backlog-title">Title</label>
            <input
              id="backlog-title"
              className="filter-input"
              name="title"
              value={taskForm.title}
              onChange={handleTaskFormChange}
              required
            />

            <label htmlFor="backlog-description">Description</label>
            <input
              id="backlog-description"
              className="filter-input"
              name="description"
              value={taskForm.description}
              onChange={handleTaskFormChange}
            />

            <div className="form-grid">
              <div>
                <label htmlFor="backlog-priority">Priority</label>
                <select
                  id="backlog-priority"
                  className="filter-select"
                  name="priority"
                  value={taskForm.priority}
                  onChange={handleTaskFormChange}
                >
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <label htmlFor="backlog-storyPoints">Story Points</label>
                <input
                  id="backlog-storyPoints"
                  className="filter-input"
                  type="number"
                  min="0"
                  name="storyPoints"
                  value={taskForm.storyPoints}
                  onChange={handleTaskFormChange}
                />
              </div>
              <div>
                <label htmlFor="backlog-risk">Risk (0 to 1)</label>
                <input
                  id="backlog-risk"
                  className="filter-input"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  name="risk"
                  value={taskForm.risk}
                  onChange={handleTaskFormChange}
                />
              </div>
              <div>
                <label htmlFor="backlog-status">Backlog Status</label>
                <select
                  id="backlog-status"
                  className="filter-select"
                  name="status"
                  value={taskForm.status}
                  onChange={handleTaskFormChange}
                >
                  {backlogStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="project-actions">
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                {editingTaskId ? "Save Story" : "Create Story"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTaskForm(false);
                  setEditingTaskId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {selectedScope !== ALL_ONGOING_SCOPE ? (
        optimization ? (
          <Card title="AI Optimization Summary" subtitle="Recommended stories for the active sprint boundary">
            <div className="chip-row">
              <span className="chip">Predicted success {Math.round(optimization.predictedSuccessProbability)}%</span>
              <span className="chip">Capacity utilization {Math.round(optimization.capacityUtilization * 100)}%</span>
              <span className="chip">Total points {optimization.totalStoryPoints}</span>
            </div>
            <div className="task-stack">
              {optimization.recommendedTasks.map((task) => (
                <div key={task.id} className="task-stack-item">
                  <div>
                    <p>{task.title}</p>
                    <span>{task.storyPoints} points</span>
                  </div>
                  <span className={`badge ${PRIORITY_META[task.priority]?.className}`}>{task.priority}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card title="AI Optimization Summary" subtitle="No active sprint found for this project" interactive={false}>
            <p className="text-muted">Start a sprint to receive optimization recommendations for this project.</p>
          </Card>
        )
      ) : (
        <Card title="Cross-Project Backlog Focus" subtitle="Backlog distribution across ongoing projects" interactive={false}>
          <div className="throughput-list">
            {Object.entries(backlogCountsByProject).map(([projectId, item]) => (
              <div key={projectId} className="throughput-row">
                <div className="throughput-head">
                  <p>{item.projectName}</p>
                  <span>
                    {item.count} stories | {item.points} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        title="Backlog Stories"
        subtitle={`${sortedTasks.length} pending stories`}
        actions={
          <div className="filter-bar backlog-filters">
            <input
              className="filter-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, description, or project"
            />
            <select className="filter-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              {sortByOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <p className="backlog-note">
          Planning into sprint means the story leaves backlog and appears in the selected sprint board as <strong>To Do</strong>.
        </p>

        <div className="backlog-list">
          {sortedTasks.map((task) => {
            const sprintOptions = actionableSprintsByProject[task.projectId] ?? [];
            const activeSprint = activeSprintByProject[task.projectId] ?? null;

            return (
              <article key={task.id} className="backlog-row">
                <div>
                  <h4>{task.title}</h4>
                  <p>{task.description}</p>
                  {selectedScope === ALL_ONGOING_SCOPE ? (
                    <span className="backlog-project-tag">{task.projectName}</span>
                  ) : null}
                </div>

                <div className="backlog-row-meta">
                  <span>{task.storyPoints} pts</span>
                  <span>Risk {(task.risk?.score ?? 0).toFixed(2)}</span>
                  <span className={`badge ${PRIORITY_META[task.priority]?.className}`}>{task.priority}</span>
                  <span className={`badge ${STATUS_META[task.status]?.className ?? "status-muted"}`}>{statusToLabel(task.status)}</span>

                  <Button type="button" variant="ghost" size="sm" onClick={() => openEditTaskForm(task)}>
                    Edit
                  </Button>

                  <Button type="button" variant="ghost" size="sm" onClick={() => handleCloneTask(task)}>
                    Clone
                  </Button>

                  {activeSprint ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => handlePlanStoryToSprint(task, activeSprint.id)}>
                      Plan To Active Sprint
                    </Button>
                  ) : null}

                  {sprintOptions.length > 0 ? (
                    <select
                      className="filter-select"
                      defaultValue=""
                      onChange={(event) => {
                        if (event.target.value) {
                          handlePlanStoryToSprint(task, event.target.value);
                        }
                      }}
                    >
                      <option value="" disabled>
                        Plan Into Sprint
                      </option>
                      {sprintOptions.map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name} ({statusToLabel(sprint.status)})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-muted">No active/planned sprint</span>
                  )}

                  <select
                    className="filter-select"
                    value={task.priority}
                    onChange={(event) => handlePriorityChange(task.id, event.target.value)}
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        Priority: {priority}
                      </option>
                    ))}
                  </select>

                  <select
                    className="filter-select"
                    value={task.status}
                    onChange={(event) => handleBacklogStatusChange(task.id, event.target.value)}
                  >
                    {backlogStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        Status: {option.label}
                      </option>
                    ))}
                  </select>

                  <Button type="button" variant="danger" size="sm" onClick={() => handleDeleteTask(task.id)}>
                    Delete
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

export default Backlog;
