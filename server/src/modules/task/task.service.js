import Task from "./task.model.js";
import Project from "../project/project.model.js";
import { HttpError } from "../../utils/httpError.js";
import { serializeId } from "../analytics/analytics.service.js";

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

const formatTask = (task) => ({
  ...task.toObject(),
  id: serializeId(task._id),
  projectId: serializeId(task.projectId),
  sprintId: task.sprintId ? serializeId(task.sprintId) : null,
  assignedTo: task.assignedTo ? serializeId(task.assignedTo) : null,
});

export const listTasks = async ({ projectId, sprintId }, userId) => {
  const query = {};
  if (projectId) {
    const project = await Project.findById(projectId).lean();
    if (!project || !project.teamMemberIds.some((id) => String(id) === String(userId))) {
      throw new HttpError(403, "Forbidden");
    }
    query.projectId = projectId;
  }
  if (sprintId === "backlog") {
    query.sprintId = null;
  } else if (sprintId) {
    query.sprintId = sprintId;
  }

  const tasks = await Task.find(query).sort({ createdAt: -1 });
  return tasks.map(formatTask);
};

export const getTask = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new HttpError(404, "Task not found.");
  }
  const project = await Project.findById(task.projectId).lean();
  if (!project || !project.teamMemberIds.some((id) => String(id) === String(userId))) {
    throw new HttpError(403, "Forbidden");
  }
  return formatTask(task);
};

export const createTask = async (payload) => {
  const task = await Task.create({
    projectId: payload.projectId,
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
  return formatTask(task);
};

export const updateTask = async (taskId, updates) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new HttpError(404, "Task not found.");
  }

  task.title = updates.title ?? task.title;
  task.description = updates.description ?? task.description;
  task.assignedTo = updates.assignedTo ?? task.assignedTo;
  task.priority = updates.priority ?? task.priority;
  task.storyPoints = updates.storyPoints !== undefined ? Number(updates.storyPoints) : task.storyPoints;
  task.status = updates.status ?? task.status;
  task.sprintId = updates.sprintId !== undefined ? updates.sprintId : task.sprintId;
  task.businessValue = updates.businessValue !== undefined ? Number(updates.businessValue) : task.businessValue;
  task.riskFactor = updates.riskFactor !== undefined ? Number(updates.riskFactor) : task.riskFactor;
  task.urgency = updates.urgency !== undefined ? Number(updates.urgency) : task.urgency;
  if (updates.risk !== undefined) {
    task.risk = normalizeRisk(updates.risk);
  }

  await task.save();
  return formatTask(task);
};

export const removeTask = async (taskId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new HttpError(404, "Task not found.");
  }
  await Task.findByIdAndDelete(taskId);
  return { deletedTaskId: taskId };
};
