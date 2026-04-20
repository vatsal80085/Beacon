import Sprint from "./sprint.model.js";
import { HttpError } from "../../utils/httpError.js";
import { serializeId } from "../analytics/analytics.service.js";

const formatSprint = (sprint) => ({
  ...sprint.toObject(),
  id: serializeId(sprint._id),
  projectId: serializeId(sprint.projectId),
});

export const listSprints = async (projectId) => {
  const query = projectId ? { projectId } : {};
  const sprints = await Sprint.find(query).sort({ createdAt: -1 });
  return sprints.map(formatSprint);
};

export const getSprint = async (sprintId) => {
  const sprint = await Sprint.findById(sprintId);
  if (!sprint) {
    throw new HttpError(404, "Sprint not found.");
  }
  return formatSprint(sprint);
};

export const createSprint = async (payload) => {
  const sprint = await Sprint.create({
    projectId: payload.projectId,
    name: payload.name,
    goal: payload.goal ?? "",
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: payload.status ?? "PLANNED",
    committedStoryPoints: Number(payload.committedStoryPoints ?? 0),
  });
  return formatSprint(sprint);
};

export const updateSprint = async (sprintId, updates) => {
  const sprint = await Sprint.findById(sprintId);
  if (!sprint) {
    throw new HttpError(404, "Sprint not found.");
  }

  sprint.name = updates.name ?? sprint.name;
  sprint.goal = updates.goal ?? sprint.goal;
  sprint.startDate = updates.startDate ?? sprint.startDate;
  sprint.endDate = updates.endDate ?? sprint.endDate;
  sprint.status = updates.status ?? sprint.status;
  if (updates.committedStoryPoints !== undefined) {
    sprint.committedStoryPoints = Number(updates.committedStoryPoints);
  }
  await sprint.save();
  return formatSprint(sprint);
};
