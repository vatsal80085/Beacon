import Project from "../project/project.model.js";
import Sprint from "../sprint/sprint.model.js";
import Task from "../task/task.model.js";
import User from "../user/user.model.js";
import { buildAccessibleProjectsQuery } from "../project/project.permissions.js";
import { optimizeSprint } from "../optimization/optimization.service.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const serializeId = (value) => String(value);

export const toPlainTask = (task) => ({
  ...task.toObject(),
  id: serializeId(task._id),
});

const storyPoints = (tasks) => tasks.reduce((sum, task) => sum + Number(task.storyPoints ?? 0), 0);

export const getProjectCapacity = async (projectId) => {
  const project = await Project.findById(projectId).lean();
  if (!project) {
    return 0;
  }
  const members = await User.find({ _id: { $in: project.teamMemberIds } }).lean();
  return members.reduce((sum, member) => sum + Number(member.capacityPerSprint ?? 0), 0);
};

export const buildSprintAnalytics = async (sprintId) => {
  const sprint = await Sprint.findById(sprintId).lean();
  if (!sprint) {
    return null;
  }

  const tasks = await Task.find({ sprintId }).lean();
  const committedStoryPoints = Number(sprint.committedStoryPoints ?? 0);
  const completedStoryPoints = storyPoints(tasks.filter((task) => task.status === "DONE"));
  const totalAssignedPoints = storyPoints(tasks);
  const blockedTasks = tasks.filter((task) => task.status === "BLOCKED").length;
  const totalTasks = tasks.length || 1;
  const totalCapacity = (await getProjectCapacity(sprint.projectId)) || 1;
  const completionRate = committedStoryPoints > 0 ? completedStoryPoints / committedStoryPoints : 0;
  const capacityUtilization = totalAssignedPoints / totalCapacity;
  const riskScore = blockedTasks / totalTasks;
  const healthScore = clamp(
    (completionRate * 0.5 + clamp(capacityUtilization, 0, 1.2) * 0.3 + (1 - riskScore) * 0.2) * 100,
    0,
    100,
  );

  const durationDays = Math.max(
    1,
    Math.round((new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) / 86400000),
  );
  const velocity = completedStoryPoints / durationDays;

  const teamMembers = await User.find({ _id: { $in: tasks.map((task) => task.assignedTo).filter(Boolean) } }).lean();
  const capacityMap = new Map(teamMembers.map((user) => [serializeId(user._id), user.capacityPerSprint ?? 0]));
  const pointsByUser = tasks.reduce((accumulator, task) => {
    if (!task.assignedTo) {
      return accumulator;
    }
    const key = serializeId(task.assignedTo);
    accumulator.set(key, (accumulator.get(key) ?? 0) + Number(task.storyPoints ?? 0));
    return accumulator;
  }, new Map());

  const overloadedUsers = [...pointsByUser.entries()]
    .filter(([userId, points]) => points > Number(capacityMap.get(userId) ?? Number.POSITIVE_INFINITY))
    .map(([userId]) => userId);

  return {
    sprintId: serializeId(sprint._id),
    velocity,
    healthScore,
    riskScore,
    completionRate: clamp(completionRate, 0, 1),
    committedStoryPoints,
    completedStoryPoints,
    capacityUtilization: clamp(capacityUtilization, 0, 1),
    overloadedUsers,
    generatedAt: new Date().toISOString(),
  };
};

export const buildProjectAnalytics = async (projectId) => {
  const [project, sprints, tasks] = await Promise.all([
    Project.findById(projectId).lean(),
    Sprint.find({ projectId }).lean(),
    Task.find({ projectId }).lean(),
  ]);

  if (!project) {
    return null;
  }

  const completedSprints = sprints.filter((sprint) => sprint.status === "COMPLETED");
  const sprintAnalytics = await Promise.all(completedSprints.map((sprint) => buildSprintAnalytics(sprint._id)));
  const averageVelocity =
    sprintAnalytics.length > 0
      ? sprintAnalytics.reduce((sum, analytics) => sum + Number(analytics?.velocity ?? 0), 0) / sprintAnalytics.length
      : 0;

  const blockedTasks = tasks.filter((task) => task.status === "BLOCKED").length;
  const riskIndex = tasks.length ? blockedTasks / tasks.length : 0;
  const teamMembers = await User.find({ _id: { $in: project.teamMemberIds } }).lean();

  const teamPerformance = teamMembers.map((member) => {
    const memberTasks = tasks.filter((task) => serializeId(task.assignedTo) === serializeId(member._id));
    return {
      userId: serializeId(member._id),
      assignedTasks: memberTasks.length,
      completedStoryPoints: storyPoints(memberTasks.filter((task) => task.status === "DONE")),
    };
  });

  return {
    projectId: serializeId(project._id),
    averageVelocity,
    totalSprints: sprints.length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.status === "DONE").length,
    blockedTasks,
    pendingTasks: tasks.filter((task) => task.status !== "DONE").length,
    riskIndex,
    teamPerformance,
    createdAt: new Date().toISOString(),
  };
};

export const buildProjectSnapshot = async (project) => {
  const analytics = await buildProjectAnalytics(project._id);
  const activeSprint = await Sprint.findOne({ projectId: project._id, status: "ACTIVE" }).lean();
  const activeHealth = activeSprint ? await buildSprintAnalytics(activeSprint._id) : null;
  const teamMembers = await User.find({ _id: { $in: project.teamMemberIds } }).select("-passwordHash").lean();

  return {
    ...project,
    id: serializeId(project._id),
    teamMembers: teamMembers.map((member) => ({ ...member, id: serializeId(member._id) })),
    metrics: {
      totalTasks: analytics?.totalTasks ?? 0,
      completedTasks: analytics?.completedTasks ?? 0,
      blockedTasks: analytics?.blockedTasks ?? 0,
      avgVelocity: analytics?.averageVelocity ?? 0,
      riskIndex: analytics?.riskIndex ?? 0,
      healthScore: activeHealth?.healthScore ?? 0,
    },
    activeSprintId: activeSprint ? serializeId(activeSprint._id) : null,
  };
};

export const buildDashboardOverview = async (userId) => {
  const projects = await Project.find(buildAccessibleProjectsQuery(userId)).lean();
  const projectIds = projects.map(p => p._id);
  const [sprints, activeSprint] = await Promise.all([
    Sprint.find({ projectId: { $in: projectIds } }).lean(),
    Sprint.findOne({ projectId: { $in: projectIds }, status: "ACTIVE" }).sort({ createdAt: -1 }).lean(),
  ]);
  const snapshots = await Promise.all(projects.map((project) => buildProjectSnapshot(project)));
  const activeSprintAnalytics = activeSprint ? await buildSprintAnalytics(activeSprint._id) : null;
  const optimization = activeSprint ? await optimizeSprint(activeSprint._id) : null;

  let teamLoad = [];
  if (activeSprint) {
    const project = projects.find((item) => serializeId(item._id) === serializeId(activeSprint.projectId));
    const projectTasks = await Task.find({ sprintId: activeSprint._id }).lean();
    const members = await User.find({ _id: { $in: project?.teamMemberIds ?? [] } }).lean();
    teamLoad = members.map((member) => ({
      userId: serializeId(member._id),
      name: member.name,
      assignedPoints: storyPoints(projectTasks.filter((task) => serializeId(task.assignedTo) === serializeId(member._id))),
      capacityPerSprint: member.capacityPerSprint ?? 0,
    }));
  }

  return {
    averageVelocity:
      snapshots.reduce((sum, project) => sum + Number(project.metrics?.avgVelocity ?? 0), 0) / Math.max(snapshots.length, 1),
    activeSprints: sprints.filter((sprint) => sprint.status === "ACTIVE").length,
    portfolioHealth:
      snapshots.reduce((sum, project) => sum + Number(project.metrics?.healthScore ?? 0), 0) / Math.max(snapshots.length, 1),
    overloadedPeople: activeSprintAnalytics?.overloadedUsers?.length ?? 0,
    riskScore: activeSprintAnalytics?.riskScore ?? 0,
    activeSprint: activeSprint
      ? {
          ...activeSprint,
          id: serializeId(activeSprint._id),
          projectId: serializeId(activeSprint.projectId),
          projectName: snapshots.find((project) => project.id === serializeId(activeSprint.projectId))?.name ?? "Unknown Project",
          ...activeSprintAnalytics,
        }
      : null,
    optimization,
    teamLoad,
    projects: snapshots,
  };
};
