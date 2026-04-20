import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { analyticsApi, optimizationApi, PRIORITY_META, sprintApi, STATUS_META, taskApi } from "../api/axios.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import { formatDate, formatPercent, statusToLabel } from "../utils/formatters.js";

const columnOrder = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

function SprintView() {
  const { sprintId } = useParams();

  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    storyPoints: 3,
    risk: 0.2,
  });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ message: "", type: "", visible: false });
  const alertTimeoutRef = useRef(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [syncingInsights, setSyncingInsights] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [bulkCompleting, setBulkCompleting] = useState(false);

  const handleDragStart = (event, task) => {
    setDraggedTask(task);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

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

  const loadSprint = useCallback(async () => {
    const [sprintData, sprintTasks, analyticsData, optimizationData] = await Promise.all([
      sprintApi.getSprintById(sprintId),
      taskApi.getSprintTasks(sprintId),
      analyticsApi.getSprintAnalytics(sprintId),
      optimizationApi.optimizeSprint(sprintId),
    ]);

    setSprint(sprintData);
    setTasks(sprintTasks);
    setAnalytics(analyticsData);
    setOptimization(
      optimizationData ?? {
        recommendedTasks: [],
        predictedSuccessProbability: 0,
        totalStoryPoints: 0,
        capacityUtilization: 0,
        feasibilityScore: 0,
      },
    );
    if (sprintData?.id) {
      localStorage.setItem("beacon:lastSprintId", sprintData.id);
    }
    if (sprintData?.projectId) {
      localStorage.setItem("beacon:lastProjectId", sprintData.projectId);
    }
  }, [sprintId]);

  const refreshInsights = useCallback(async () => {
    setSyncingInsights(true);
    try {
      const [analyticsData, optimizationData] = await Promise.all([
        analyticsApi.getSprintAnalytics(sprintId),
        optimizationApi.optimizeSprint(sprintId),
      ]);
      setAnalytics(analyticsData);
      setOptimization(
        optimizationData ?? {
          recommendedTasks: [],
          predictedSuccessProbability: 0,
          totalStoryPoints: 0,
          capacityUtilization: 0,
          feasibilityScore: 0,
        },
      );
    } finally {
      setSyncingInsights(false);
    }
  }, [sprintId]);

  const handleDrop = async (event, newStatus) => {
    event.preventDefault();
    if (!draggedTask || draggedTask.status === newStatus) {
      return;
    }
    const taskId = draggedTask.id;
    setDraggedTask(null);
    await handleMoveTaskToStatus(taskId, newStatus);
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await loadSprint();
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
  }, [loadSprint]);

  const groupedTasks = useMemo(() => {
    return columnOrder.reduce((accumulator, status) => {
      return {
        ...accumulator,
        [status]: tasks.filter((task) => task.status === status),
      };
    }, {});
  }, [tasks]);

  const remainingTaskIds = useMemo(
    () => tasks.filter((task) => task.status !== "DONE").map((task) => task.id),
    [tasks],
  );

  const handleTaskFormChange = (event) => {
    const { name, value } = event.target;
    setTaskForm((previous) => ({
      ...previous,
      [name]: name === "storyPoints" || name === "risk" ? Number(value) : value,
    }));
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!sprint) {
      return;
    }

    setSaving(true);
    try {
      await taskApi.createTask({
        ...taskForm,
        projectId: sprint.projectId,
        sprintId: sprint.id,
        status: "TODO",
        risk: {
          score: taskForm.risk,
          level: taskForm.risk >= 0.6 ? "HIGH" : taskForm.risk >= 0.3 ? "MEDIUM" : "LOW",
        },
      });
      setTaskForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        storyPoints: 3,
        risk: 0.2,
      });
      setShowTaskForm(false);
      await loadSprint();
    } finally {
      setSaving(false);
    }
  };

  const handleMoveTaskToStatus = async (taskId, nextStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === nextStatus) {
      return;
    }

    if (sprint?.status === "COMPLETED" && nextStatus !== "DONE") {
      showAlert("Completed sprint only allows moving tasks into Done.", "error");
      return;
    }

    const previousTasks = [...tasks];
    setTasks((prevTasks) => prevTasks.map((item) => (item.id === taskId ? { ...item, status: nextStatus } : item)));

    try {
      await taskApi.updateTaskStatus(taskId, nextStatus);
      await refreshInsights();
    } catch {
      setTasks(previousTasks);
      showAlert("Failed to move task to the selected section.", "error");
    }
  };

  const handleMoveOpenTasksToDone = async () => {
    if (remainingTaskIds.length === 0) {
      return;
    }

    setBulkCompleting(true);
    const previousTasks = [...tasks];
    setTasks((prevTasks) => prevTasks.map((task) => (task.status === "DONE" ? task : { ...task, status: "DONE" })));

    try {
      await Promise.all(remainingTaskIds.map((taskId) => taskApi.updateTaskStatus(taskId, "DONE")));
      await refreshInsights();
      showAlert("All open sprint tasks moved to Done.", "success");
    } catch {
      setTasks(previousTasks);
      showAlert("Failed to complete all open sprint tasks.", "error");
    } finally {
      setBulkCompleting(false);
    }
  };

  const handleSprintStatusUpdate = async (nextStatus) => {
    if (!sprint?.id) {
      return;
    }

    setStatusUpdating(true);
    try {
      await sprintApi.updateSprintStatus(sprint.id, nextStatus);
      await loadSprint();
      showAlert(
        nextStatus === "COMPLETED"
          ? "Sprint marked as completed."
          : nextStatus === "ACTIVE"
            ? "Sprint is active again."
            : "Sprint status updated.",
      );
    } catch {
      showAlert("Failed to update sprint status.", "error");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Card title="Loading sprint view" interactive={false}>
          <p className="text-muted">Analyzing sprint telemetry...</p>
        </Card>
      </div>
    );
  }

  if (!sprint || !analytics || !optimization) {
    return (
      <div className="page">
        <Card title="Sprint unavailable" interactive={false}>
          <p className="form-error">The requested sprint data could not be loaded.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      {alert.visible ? (
        <div className={`project-alert project-alert-${alert.type}`} role="status">
          <span>{alert.message}</span>
          <button type="button" onClick={hideAlert} aria-label="Dismiss notification">
            x
          </button>
        </div>
      ) : null}
      <div className="page-header">
        <div>
          <p className="eyebrow">Sprint Execution</p>
          <h1 className="page-title">{sprint.name}</h1>
          <p className="page-subtitle">{sprint.goal}</p>
        </div>
        <div className="page-actions">
          {sprint.status === "PLANNED" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={statusUpdating}
              onClick={() => handleSprintStatusUpdate("ACTIVE")}
            >
              Start Sprint
            </Button>
          ) : null}
          {sprint.status === "ACTIVE" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={statusUpdating}
              onClick={() => handleSprintStatusUpdate("COMPLETED")}
            >
              Mark Sprint Completed
            </Button>
          ) : null}
          {sprint.status === "COMPLETED" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={statusUpdating}
              onClick={() => handleSprintStatusUpdate("ACTIVE")}
            >
              Reopen Sprint
            </Button>
          ) : null}
          {sprint.status === "COMPLETED" && remainingTaskIds.length > 0 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={bulkCompleting}
              onClick={handleMoveOpenTasksToDone}
            >
              Move Open Tasks To Done ({remainingTaskIds.length})
            </Button>
          ) : null}
          <Button type="button" variant="primary" size="sm" onClick={() => setShowTaskForm((value) => !value)}>
            {showTaskForm ? "Close Task Form" : "Add Sprint Task"}
          </Button>
          <Button as={Link} to={`/app/projects/${sprint.projectId}`} variant="ghost" size="sm">
            Open Project
          </Button>
        </div>
      </div>

      {showTaskForm ? (
        <Card title="Add Task To Sprint" subtitle="New tasks instantly affect sprint health and velocity." interactive={false}>
          <form className="entity-form" onSubmit={handleCreateTask}>
            <label htmlFor="sprint-task-title">Title</label>
            <input
              id="sprint-task-title"
              className="filter-input"
              name="title"
              value={taskForm.title}
              onChange={handleTaskFormChange}
              required
            />

            <label htmlFor="sprint-task-description">Description</label>
            <input
              id="sprint-task-description"
              className="filter-input"
              name="description"
              value={taskForm.description}
              onChange={handleTaskFormChange}
            />

            <div className="form-grid">
              <div>
                <label htmlFor="sprint-task-priority">Priority</label>
                <select
                  id="sprint-task-priority"
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
                <label htmlFor="sprint-task-points">Story Points</label>
                <input
                  id="sprint-task-points"
                  className="filter-input"
                  type="number"
                  min="0"
                  name="storyPoints"
                  value={taskForm.storyPoints}
                  onChange={handleTaskFormChange}
                />
              </div>
              <div>
                <label htmlFor="sprint-task-risk">Risk (0 to 1)</label>
                <input
                  id="sprint-task-risk"
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
            </div>

            <div className="project-actions">
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                Add Task
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <section className="kpi-grid">
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Status</p>
          <p className="kpi-value">
            <span className={`badge ${STATUS_META[sprint.status]?.className}`}>{sprint.status}</span>
          </p>
        </Card>
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Velocity</p>
          <p className="kpi-value">{analytics.velocity.toFixed(1)}</p>
        </Card>
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Health Score</p>
          <p className="kpi-value">{Math.round(analytics.healthScore)} / 100</p>
        </Card>
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Risk Score</p>
          <p className="kpi-value">{formatPercent(analytics.riskScore)}</p>
        </Card>
      </section>

      <section className="panel-grid">
        <Card title="Sprint Metrics" subtitle={`${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`}>
          {syncingInsights ? <p className="text-muted">Syncing metrics with the latest board updates...</p> : null}
          <div className="progress-list">
            <div className="progress-item">
              <p>Completion Rate</p>
              <strong>{formatPercent(analytics.completionRate)}</strong>
              <div className="progress-track">
                <span className="progress-fill progress-fill-primary" style={{ width: formatPercent(analytics.completionRate) }} />
              </div>
            </div>
            <div className="progress-item">
              <p>Capacity Utilization</p>
              <strong>{formatPercent(analytics.capacityUtilization)}</strong>
              <div className="progress-track">
                <span className="progress-fill progress-fill-warm" style={{ width: formatPercent(analytics.capacityUtilization) }} />
              </div>
            </div>
            <div className="progress-item">
              <p>Committed / Completed</p>
              <strong>
                {analytics.committedStoryPoints} / {analytics.completedStoryPoints} points
              </strong>
            </div>
          </div>
        </Card>

        <Card title="Optimization Outcome" subtitle="Current sprint recommendation footprint">
          {syncingInsights ? <p className="text-muted">Refreshing optimization after board changes...</p> : null}
          <div className="chip-row">
            <span className="chip">{optimization?.recommendedTasks?.length ?? 0} recommended tasks</span>
            <span className="chip">{Math.round(optimization?.predictedSuccessProbability ?? 0)}% success probability</span>
            <span className="chip">{optimization?.totalStoryPoints ?? 0} total points</span>
          </div>
          <div className="task-stack">
            {(optimization?.recommendedTasks ?? []).map((task) => (
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
      </section>

      <Card
        title="Sprint Board"
        subtitle={
          syncingInsights ? "Task flow across delivery states | syncing metrics and optimization..." : "Task flow across delivery states"
        }
      >
        <div className="kanban">
          {columnOrder.map((status) => (
            <section
              key={status}
              className={`kanban-column kanban-column-${status.toLowerCase()} ${
                sprint.status === "COMPLETED" && status !== "DONE" ? "kanban-column-drop-locked" : ""
              }`}
              onDragOver={(event) => {
                if (sprint.status === "COMPLETED" && status !== "DONE") {
                  return;
                }
                handleDragOver(event);
              }}
              onDrop={(event) => handleDrop(event, status)}
            >
              <header>
                <h4>{statusToLabel(status)}</h4>
                <span>{groupedTasks[status]?.length ?? 0}</span>
              </header>
              <div className="kanban-list">
                {groupedTasks[status]?.map((task) => (
                  <article
                    key={task.id}
                    className={`kanban-card kanban-card-${status.toLowerCase()}`}
                    draggable={sprint.status !== "COMPLETED" || task.status !== "DONE"}
                    onDragStart={(event) => handleDragStart(event, task)}
                  >
                    <p>{task.title}</p>
                    <span>{task.storyPoints} pts</span>
                    <div className="kanban-tags">
                      <span className={`badge ${PRIORITY_META[task.priority]?.className}`}>{task.priority}</span>
                      <span className="badge status-muted">Risk {(task.risk?.score ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="kanban-inline-move">
                      <span>Move to</span>
                      <select
                        className="kanban-inline-select"
                        value={task.status}
                        onChange={(event) => handleMoveTaskToStatus(task.id, event.target.value)}
                        disabled={bulkCompleting || syncingInsights || (sprint.status === "COMPLETED" && task.status === "DONE")}
                      >
                        {columnOrder.map((optionStatus) => (
                          <option
                            key={optionStatus}
                            value={optionStatus}
                            disabled={sprint.status === "COMPLETED" && optionStatus !== "DONE"}
                          >
                            {statusToLabel(optionStatus)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default SprintView;
