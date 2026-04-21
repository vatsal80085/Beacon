import Task from "./task.model.js";
import { HttpError } from "../../utils/httpError.js";
import { serializeId } from "../analytics/analytics.service.js";
import { getSprintRealtimeChannels } from "../live/live.channels.js";
import { publishLiveUpdate } from "../live/live.service.js";
import {
  canManageProject,
  getAccessibleProjectIds,
  getProjectForRequester,
  getSprintForRequester,
  resolveProjectMemberIds,
} from "../project/project.permissions.js";

const normalizeRisk = (risk) => {
  if (typeof risk === "number") {
    return {
      score: risk,
      level: risk >= 0.6 ? "HIGH" : risk >= 0.3 ? "MEDIUM" : "LOW",
    };
  }
  const score = Number(risk?.score ?? 0.2);
  return {
    score,
    level: risk?.level ?? (score >= 0.6 ? "HIGH" : score >= 0.3 ? "MEDIUM" : "LOW"),
    probability: risk?.probability,
    impact: risk?.impact,
  };
};

const canManageTasks = (requester) => canManageProject(requester);

const getProjectForAccess = async (projectId, requester) => getProjectForRequester(projectId, requester, { lean: true });

const getTaskWithProjectAccess = async (taskId, requester) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new HttpError(404, "Task not found.");
  }

  await getProjectForAccess(task.projectId, requester);
  return task;
};

const formatTask = (task) => ({
  ...task.toObject(),
  id: serializeId(task._id),
  projectId: serializeId(task.projectId),
  sprintId: task.sprintId ? serializeId(task.sprintId) : null,
  assignedTo: task.assignedTo ? serializeId(task.assignedTo) : null,
});

const emitTaskRefresh = (project, sprintIds, type, taskId) => {
  publishLiveUpdate({
    userIds: resolveProjectMemberIds(project),
    channels: getSprintRealtimeChannels(project._id, sprintIds),
    type,
    projectId: serializeId(project._id),
    taskId: serializeId(taskId),
  });
};

export const listTasks = async ({ projectId, sprintId }, requester) => {
  const query = {};

  if (projectId) {
    await getProjectForAccess(projectId, requester);
    query.projectId = projectId;
  } else if (sprintId && sprintId !== "backlog") {
    const { sprint } = await getSprintForRequester(sprintId, requester);
    query.projectId = sprint.projectId;
  } else {
    query.projectId = { $in: await getAccessibleProjectIds(requester) };
  }

  if (sprintId === "backlog") {
    query.sprintId = null;
  } else if (sprintId) {
    query.sprintId = sprintId;
  }

  const tasks = await Task.find(query).sort({ createdAt: -1 });
  return tasks.map(formatTask);
};

export const getTask = async (taskId, requester) => {
  const task = await getTaskWithProjectAccess(taskId, requester);
  return formatTask(task);
};

export const createTask = async (payload, requester) => {
  const project = await getProjectForAccess(payload.projectId, requester);
  if (payload.sprintId && !canManageTasks(requester)) {
    throw new HttpError(403, "Only managers can add tasks directly to a sprint.");
  }

  if (payload.sprintId) {
    const { sprint } = await getSprintForRequester(payload.sprintId, requester, { requireManager: true });
    if (serializeId(sprint.projectId) !== serializeId(project._id)) {
      throw new HttpError(400, "Task sprint must belong to the same project.");
    }
  }

  const task = await Task.create({
    projectId: project._id,
    sprintId: payload.sprintId ?? null,
    title: payload.title,
    description: payload.description ?? "",
    assignedTo: payload.assignedTo ?? null,
    priority: payload.priority ?? "MEDIUM",
    storyPoints: Number(payload.storyPoints ?? 0),
    status: payload.status ?? "TODO",
    risk: normalizeRisk(payload.risk),
    businessValue: Number(payload.businessValue ?? 6),
    riskFactor: Number(payload.riskFactor ?? 5),
    urgency: Number(payload.urgency ?? 5),
  });

  emitTaskRefresh(project, [payload.sprintId], "task.created", task._id);
  return formatTask(task);
};

export const updateTask = async (taskId, updates, requester) => {
  const task = await getTaskWithProjectAccess(taskId, requester);
  if (!canManageTasks(requester)) {
    throw new HttpError(403, "Only managers can edit task details. Developers can only update task status.");
  }

  const project = await getProjectForAccess(task.projectId, requester);
  const previousSprintId = task.sprintId;

  task.title = updates.title ?? task.title;
  task.description = updates.description ?? task.description;
  task.assignedTo = updates.assignedTo ?? task.assignedTo;
  task.priority = updates.priority ?? task.priority;
  task.storyPoints = updates.storyPoints !== undefined ? Number(updates.storyPoints) : task.storyPoints;
  task.status = updates.status ?? task.status;

  if (updates.sprintId !== undefined) {
    if (updates.sprintId) {
      const { sprint } = await getSprintForRequester(updates.sprintId, requester, { requireManager: true });
      if (serializeId(sprint.projectId) !== serializeId(task.projectId)) {
        throw new HttpError(400, "Task sprint must belong to the same project.");
      }
    }

    task.sprintId = updates.sprintId;
  }

  task.businessValue = updates.businessValue !== undefined ? Number(updates.businessValue) : task.businessValue;
  task.riskFactor = updates.riskFactor !== undefined ? Number(updates.riskFactor) : task.riskFactor;
  task.urgency = updates.urgency !== undefined ? Number(updates.urgency) : task.urgency;
  if (updates.risk !== undefined) {
    task.risk = normalizeRisk(updates.risk);
  }

  await task.save();
  emitTaskRefresh(project, [previousSprintId, task.sprintId], "task.updated", task._id);
  return formatTask(task);
};

export const updateTaskStatus = async (taskId, status, requester) => {
  const task = await getTaskWithProjectAccess(taskId, requester);
  const project = await getProjectForAccess(task.projectId, requester);
  task.status = status ?? task.status;
  await task.save();
  emitTaskRefresh(project, [task.sprintId], "task.status.updated", task._id);
  return formatTask(task);
};

export const removeTask = async (taskId, requester) => {
  const task = await getTaskWithProjectAccess(taskId, requester);
  if (!canManageTasks(requester)) {
    throw new HttpError(403, "Only managers can delete tasks.");
  }

  const project = await getProjectForAccess(task.projectId, requester);
  const sprintId = task.sprintId;

  await Task.findByIdAndDelete(taskId);
  emitTaskRefresh(project, [sprintId], "task.deleted", taskId);
  return { deletedTaskId: taskId };
};
