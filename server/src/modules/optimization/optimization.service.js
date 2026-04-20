import Project from "../project/project.model.js";
import Sprint from "../sprint/sprint.model.js";
import Task from "../task/task.model.js";
import User from "../user/user.model.js";
import { HttpError } from "../../utils/httpError.js";
import { buildSprintAnalytics, serializeId } from "../analytics/analytics.service.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getPriorityScore = (task) =>
  Number(task.businessValue ?? 0) * 0.4 +
  Number(task.riskFactor ?? 0) * 0.2 +
  Number(task.urgency ?? 0) * 0.2 -
  Number(task.storyPoints ?? 0) * 0.2;

const getRiskLabel = (riskScore) => {
  if (riskScore >= 0.5) {
    return "critical";
  }
  if (riskScore >= 0.25) {
    return "elevated";
  }
  return "controlled";
};

export const buildAiInsights = async (sprintId, optimization = null, analytics = null) => {
  const sprint = await Sprint.findById(sprintId).lean();
  if (!sprint) {
    throw new HttpError(404, "Sprint not found.");
  }

  const project = await Project.findById(sprint.projectId).lean();
  const sprintAnalytics = analytics ?? (await buildSprintAnalytics(sprintId));
  const optimized = optimization ?? (await optimizeSprint(sprintId));
  const tasks = await Task.find({ sprintId }).lean();
  const members = await User.find({ _id: { $in: project?.teamMemberIds ?? [] } }).lean();

  const blockers = tasks.filter((task) => task.status === "BLOCKED");
  const overloadedNames = members
    .filter((member) => sprintAnalytics.overloadedUsers.includes(serializeId(member._id)))
    .map((member) => member.name);

  const narrative = `Sprint ${sprint.name} is ${getRiskLabel(sprintAnalytics.riskScore)} with ${Math.round(
    sprintAnalytics.healthScore,
  )}/100 health. Recommended scope uses ${optimized.totalStoryPoints} story points at ${Math.round(
    optimized.capacityUtilization * 100,
  )}% capacity and projects ${Math.round(optimized.predictedSuccessProbability)}% success.`;

  const recommendedActions = [
    blockers.length
      ? `Resolve ${blockers.length} blocked task(s) first to improve sprint confidence.`
      : "No blocked tasks detected; preserve flow by keeping work in progress limited.",
    overloadedNames.length
      ? `Rebalance workload for ${overloadedNames.join(", ")} before adding new scope.`
      : "Team allocation looks balanced against current sprint capacity.",
    optimized.capacityUtilization > 0.9
      ? "Avoid pulling additional backlog items unless scope is traded out."
      : "There is still headroom to pull one small, high-priority story if dependencies are clear.",
  ];

  const riskDrivers = [
    { label: "Blocked task ratio", value: sprintAnalytics.riskScore },
    { label: "Capacity utilization", value: sprintAnalytics.capacityUtilization },
    { label: "Completion rate", value: sprintAnalytics.completionRate },
  ];

  return {
    sprintId: serializeId(sprint._id),
    narrative,
    recommendedActions,
    riskDrivers,
    model: "Beacon Heuristic AI",
    generatedAt: new Date().toISOString(),
  };
};

export const optimizeSprint = async (sprintId) => {
  const sprint = await Sprint.findById(sprintId).lean();
  if (!sprint) {
    throw new HttpError(404, "Sprint not found.");
  }

  const project = await Project.findById(sprint.projectId).lean();
  if (!project) {
    throw new HttpError(404, "Project not found.");
  }

  const teamMembers = await User.find({ _id: { $in: project.teamMemberIds } }).lean();
  const capacity = teamMembers.reduce((sum, member) => sum + Number(member.capacityPerSprint ?? 0), 0);
  const candidates = await Task.find({
    projectId: sprint.projectId,
    $or: [{ sprintId: null }, { sprintId: sprint._id }],
  }).lean();

  const sorted = candidates
    .map((task) => ({
      ...task,
      id: serializeId(task._id),
      sprintId: task.sprintId ? serializeId(task.sprintId) : null,
      projectId: serializeId(task.projectId),
      assignedTo: task.assignedTo ? serializeId(task.assignedTo) : null,
      priorityScore: getPriorityScore(task),
    }))
    .sort((left, right) => right.priorityScore - left.priorityScore);

  const recommendedTasks = [];
  let totalStoryPoints = 0;
  for (const task of sorted) {
    if (totalStoryPoints + Number(task.storyPoints ?? 0) <= capacity) {
      recommendedTasks.push(task);
      totalStoryPoints += Number(task.storyPoints ?? 0);
    }
  }

  const capacityUtilization = capacity > 0 ? totalStoryPoints / capacity : 0;
  const feasibilityScore = totalStoryPoints > 0 ? capacity / totalStoryPoints : 0;
  const blockedRatio =
    recommendedTasks.length > 0
      ? recommendedTasks.filter((task) => task.status === "BLOCKED").length / recommendedTasks.length
      : 0;
  const predictedSuccessProbability = clamp((1 - blockedRatio) * 100 - (capacityUtilization > 1 ? 12 : 0), 0, 99);

  const analytics = await buildSprintAnalytics(sprintId);
  const aiInsights = await buildAiInsights(sprintId, {
    recommendedTasks,
    totalStoryPoints,
    capacityUtilization: clamp(capacityUtilization, 0, 1),
    predictedSuccessProbability,
    feasibilityScore,
  }, analytics);

  return {
    recommendedTasks: recommendedTasks.slice(0, 5),
    totalStoryPoints,
    capacityUtilization: clamp(capacityUtilization, 0, 1),
    predictedSuccessProbability,
    feasibilityScore,
    aiInsights,
  };
};
