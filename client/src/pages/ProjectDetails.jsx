import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { analyticsApi, projectApi, sprintApi, STATUS_META } from "../api/axios.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { formatDate, formatPercent } from "../utils/formatters.js";

function ProjectDetails() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [projectInvites, setProjectInvites] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProjectEditor, setShowProjectEditor] = useState(false);
  const [showSprintCreator, setShowSprintCreator] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "PLANNED",
    startDate: "",
    endDate: "",
  });
  const [sprintForm, setSprintForm] = useState({
    name: "",
    goal: "",
    startDate: "",
    endDate: "",
    status: "PLANNED",
    committedStoryPoints: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    inviteeUniqueCode: "",
    role: "DEVELOPER",
  });

  const loadDetails = useCallback(async () => {
    const [projectData, sprintData, analyticsData, invitationData] = await Promise.all([
      projectApi.getProjectById(projectId),
      sprintApi.getSprintsByProject(projectId),
      analyticsApi.getProjectAnalytics(projectId),
      projectApi.getProjectInvitations(projectId),
    ]);

    setProject(projectData);
    setSprints(sprintData);
    setAnalytics(analyticsData);
    setProjectInvites(invitationData);
    if (projectData?.id) {
      localStorage.setItem("beacon:lastProjectId", projectData.id);
    }
    const activeSprint = sprintData.find((sprint) => sprint.status === "ACTIVE");
    if (activeSprint?.id) {
      localStorage.setItem("beacon:lastSprintId", activeSprint.id);
    }

    setProjectForm({
      name: projectData?.name ?? "",
      description: projectData?.description ?? "",
      status: projectData?.status ?? "PLANNED",
      startDate: projectData?.startDate ? String(projectData.startDate).slice(0, 10) : "",
      endDate: projectData?.endDate ? String(projectData.endDate).slice(0, 10) : "",
    });
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await loadDetails();
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
  }, [loadDetails]);

  const teamPerformance = useMemo(() => {
    if (!project || !analytics) {
      return [];
    }
    return analytics.teamPerformance
      .map((entry) => {
        const member = project.teamMembers.find((teamMember) => teamMember.id === entry.userId);
        if (!member) {
          return null;
        }
        const ratio = member.capacityPerSprint ? entry.completedStoryPoints / member.capacityPerSprint : 0;
        return {
          ...entry,
          member,
          ratio: Math.min(1, ratio),
        };
      })
      .filter(Boolean);
  }, [analytics, project]);

  const handleProjectFormChange = (event) => {
    const { name, value } = event.target;
    setProjectForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSprintFormChange = (event) => {
    const { name, value } = event.target;
    setSprintForm((previous) => ({
      ...previous,
      [name]: name === "committedStoryPoints" ? Number(value) : value,
    }));
  };

  const handleProjectUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await projectApi.updateProject(projectId, projectForm);
      await loadDetails();
      setShowProjectEditor(false);
    } catch {
      setError("Unable to update project.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSprint = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await sprintApi.createSprint({
        ...sprintForm,
        projectId,
      });
      await loadDetails();
      setShowSprintCreator(false);
      setSprintForm({
        name: "",
        goal: "",
        startDate: "",
        endDate: "",
        status: "PLANNED",
        committedStoryPoints: 0,
      });
    } catch {
      setError("Unable to create sprint.");
    } finally {
      setSaving(false);
    }
  };

  const handleSprintStatusChange = async (sprintId, status) => {
    await sprintApi.updateSprintStatus(sprintId, status);
    await loadDetails();
  };

  const canInvite = user?.role === "MANAGER" || user?.role === "ADMIN";

  const handleInviteChange = (event) => {
    const { name, value } = event.target;
    setInviteForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSendInvite = async (event) => {
    event.preventDefault();
    if (!canInvite || !user?.id) {
      return;
    }
    setInviteSubmitting(true);
    setError("");
    try {
      await projectApi.inviteMemberByUniqueCode(projectId, {
        inviteeUniqueCode: inviteForm.inviteeUniqueCode,
        role: inviteForm.role,
        invitedByUserId: user.id,
      });
      await loadDetails();
      setInviteForm({ inviteeUniqueCode: "", role: "DEVELOPER" });
    } catch (inviteError) {
      setError(inviteError?.message ?? "Unable to send invitation.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Card title="Loading project details" interactive={false}>
          <p className="text-muted">Assembling delivery analytics...</p>
        </Card>
      </div>
    );
  }

  if (!project || !analytics) {
    return (
      <div className="page">
        <Card title="Project not found" interactive={false}>
          <p className="form-error">The selected project could not be loaded.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Project Detail</p>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">{project.description}</p>
        </div>
        <div className="page-actions">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowProjectEditor((value) => !value)}>
            {showProjectEditor ? "Close Editor" : "Edit Project"}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => setShowSprintCreator((value) => !value)}>
            {showSprintCreator ? "Close Sprint Form" : "Create Sprint"}
          </Button>
          <Button as={Link} to={`/app/projects/${project.id}/backlog`} variant="secondary" size="sm">
            Open Backlog
          </Button>
        </div>
      </div>

      {showProjectEditor ? (
        <Card title="Update Project" subtitle="Changes recalculate project analytics in real time." interactive={false}>
          <form className="entity-form" onSubmit={handleProjectUpdate}>
            <label htmlFor="edit-project-name">Name</label>
            <input
              id="edit-project-name"
              className="filter-input"
              name="name"
              value={projectForm.name}
              onChange={handleProjectFormChange}
              required
            />

            <label htmlFor="edit-project-description">Description</label>
            <input
              id="edit-project-description"
              className="filter-input"
              name="description"
              value={projectForm.description}
              onChange={handleProjectFormChange}
            />

            <div className="form-grid">
              <div>
                <label htmlFor="edit-project-status">Status</label>
                <select
                  id="edit-project-status"
                  className="filter-select"
                  name="status"
                  value={projectForm.status}
                  onChange={handleProjectFormChange}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-project-start">Start Date</label>
                <input
                  id="edit-project-start"
                  className="filter-input"
                  type="date"
                  name="startDate"
                  value={projectForm.startDate}
                  onChange={handleProjectFormChange}
                />
              </div>
              <div>
                <label htmlFor="edit-project-end">End Date</label>
                <input
                  id="edit-project-end"
                  className="filter-input"
                  type="date"
                  name="endDate"
                  value={projectForm.endDate}
                  onChange={handleProjectFormChange}
                />
              </div>
            </div>

            <div className="project-actions">
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                Save Project
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {showSprintCreator ? (
        <Card title="Create Sprint" subtitle="Add a new sprint and immediately include it in backlog/sprint planning." interactive={false}>
          <form className="entity-form" onSubmit={handleCreateSprint}>
            <label htmlFor="new-sprint-name">Sprint Name</label>
            <input
              id="new-sprint-name"
              className="filter-input"
              name="name"
              value={sprintForm.name}
              onChange={handleSprintFormChange}
              required
            />

            <label htmlFor="new-sprint-goal">Goal</label>
            <input
              id="new-sprint-goal"
              className="filter-input"
              name="goal"
              value={sprintForm.goal}
              onChange={handleSprintFormChange}
            />

            <div className="form-grid">
              <div>
                <label htmlFor="new-sprint-status">Status</label>
                <select
                  id="new-sprint-status"
                  className="filter-select"
                  name="status"
                  value={sprintForm.status}
                  onChange={handleSprintFormChange}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
              <div>
                <label htmlFor="new-sprint-start">Start Date</label>
                <input
                  id="new-sprint-start"
                  className="filter-input"
                  type="date"
                  name="startDate"
                  value={sprintForm.startDate}
                  onChange={handleSprintFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="new-sprint-end">End Date</label>
                <input
                  id="new-sprint-end"
                  className="filter-input"
                  type="date"
                  name="endDate"
                  value={sprintForm.endDate}
                  onChange={handleSprintFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="new-sprint-points">Committed Story Points</label>
                <input
                  id="new-sprint-points"
                  className="filter-input"
                  type="number"
                  min="0"
                  name="committedStoryPoints"
                  value={sprintForm.committedStoryPoints}
                  onChange={handleSprintFormChange}
                />
              </div>
            </div>

            <div className="project-actions">
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                Create Sprint
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <Card title="Team Members & Invitations" subtitle="Invite members using their unique user ID (BCN-XXXX).">
        <div className="team-member-list">
          {project.teamMembers.map((member) => (
            <div key={member.id} className="team-member-row">
              <div>
                <p>{member.name}</p>
                <span>
                  {member.role} | {member.uniqueCode ?? "No ID"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {canInvite ? (
          <form className="entity-form" onSubmit={handleSendInvite}>
            <div className="form-grid">
              <div>
                <label htmlFor="inviteeUniqueCode">Member Unique ID</label>
                <input
                  id="inviteeUniqueCode"
                  className="filter-input"
                  name="inviteeUniqueCode"
                  value={inviteForm.inviteeUniqueCode}
                  onChange={handleInviteChange}
                  placeholder="BCN-0008"
                  required
                />
              </div>
              <div>
                <label htmlFor="invite-role">Invite Role</label>
                <select
                  id="invite-role"
                  className="filter-select"
                  name="role"
                  value={inviteForm.role}
                  onChange={handleInviteChange}
                >
                  <option value="MANAGER">Manager</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="QA">QA</option>
                </select>
              </div>
            </div>
            <div className="project-actions">
              <Button type="submit" size="sm" variant="primary" loading={inviteSubmitting}>
                Send Invitation
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-muted">Only managers/admins can invite members.</p>
        )}

        <div className="invite-list">
          {projectInvites.length === 0 ? (
            <p className="text-muted">No invitations sent for this project.</p>
          ) : (
            projectInvites.map((invite) => (
              <article key={invite.id} className="invite-row">
                <div>
                  <h4>{invite.invitee?.name ?? invite.inviteeUniqueCode}</h4>
                  <p>
                    Invited by {invite.inviter?.name ?? "Unknown"} as {invite.role}
                  </p>
                  <span>{formatDate(invite.createdAt)}</span>
                </div>
                <span
                  className={`badge ${
                    invite.status === "PENDING"
                      ? "status-planned"
                      : invite.status === "ACCEPTED"
                        ? "status-completed"
                        : "status-blocked"
                  }`}
                >
                  {invite.status}
                </span>
              </article>
            ))
          )}
        </div>
      </Card>

      <section className="kpi-grid">
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Total Sprints</p>
          <p className="kpi-value">{analytics.totalSprints}</p>
        </Card>
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Avg Velocity</p>
          <p className="kpi-value">{analytics.averageVelocity.toFixed(1)}</p>
        </Card>
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Completed Tasks</p>
          <p className="kpi-value">{analytics.completedTasks}</p>
        </Card>
        <Card className="kpi-card" interactive={false}>
          <p className="kpi-label">Risk Index</p>
          <p className="kpi-value">{formatPercent(analytics.riskIndex)}</p>
        </Card>
      </section>

      <section className="panel-grid">
        <Card title="Team Performance" subtitle="Completed points against per-sprint capacity">
          <div className="team-load-list">
            {teamPerformance.map((entry) => (
              <div key={entry.userId} className="team-load-row">
                <div>
                  <p>{entry.member.name}</p>
                  <span>
                    {entry.completedStoryPoints} / {entry.member.capacityPerSprint} pts
                  </span>
                </div>
                <div className="progress-track">
                  <span className="progress-fill progress-fill-primary" style={{ width: `${Math.round(entry.ratio * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Project Snapshot" subtitle={`${project.status} | ${project.teamMembers.length} members`}>
          <div className="metric-pair-grid">
            <div>
              <p>Start Date</p>
              <strong>{formatDate(project.startDate)}</strong>
            </div>
            <div>
              <p>End Date</p>
              <strong>{formatDate(project.endDate)}</strong>
            </div>
            <div>
              <p>Total Tasks</p>
              <strong>{analytics.totalTasks}</strong>
            </div>
            <div>
              <p>Blocked Tasks</p>
              <strong>{analytics.blockedTasks}</strong>
            </div>
          </div>
        </Card>
      </section>

      <Card title="Sprint Timeline" subtitle="Current and historical sprint runs">
        <div className="sprint-list">
          {sprints.map((sprint) => (
            <article key={sprint.id} className="sprint-row">
              <div>
                <h4>{sprint.name}</h4>
                <p>{sprint.goal}</p>
                <span>
                  {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                </span>
              </div>

              <div className="sprint-row-actions">
                <span className={`badge ${STATUS_META[sprint.status]?.className}`}>{sprint.status}</span>
                {sprint.status !== "ACTIVE" ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleSprintStatusChange(sprint.id, "ACTIVE")}>
                    Start
                  </Button>
                ) : null}
                {sprint.status !== "COMPLETED" ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleSprintStatusChange(sprint.id, "COMPLETED")}>
                    Complete
                  </Button>
                ) : null}
                <Button as={Link} to={`/app/sprints/${sprint.id}`} variant="ghost" size="sm">
                  View Sprint
                </Button>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default ProjectDetails;
