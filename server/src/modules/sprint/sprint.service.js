import Sprint from "./sprint.model.js";
import { serializeId } from "../analytics/analytics.service.js";
import { getAccessibleProjectIds, getProjectForRequester, getSprintForRequester, resolveProjectMemberIds } from "../project/project.permissions.js";
import { getSprintRealtimeChannels } from "../live/live.channels.js";
import { publishLiveUpdate } from "../live/live.service.js";

const formatSprint = (sprint) => ({
  ...sprint.toObject(),
  id: serializeId(sprint._id),
  projectId: serializeId(sprint.projectId),
});

export const listSprints = async (projectId, requester) => {
  const query = {};

  if (projectId) {
    await getProjectForRequester(projectId, requester, { lean: true });
    query.projectId = projectId;
  } else {
    query.projectId = { $in: await getAccessibleProjectIds(requester) };
  }

  const sprints = await Sprint.find(query).sort({ createdAt: -1 });
  return sprints.map(formatSprint);
};

export const getSprint = async (sprintId, requester) => {
  const { sprint } = await getSprintForRequester(sprintId, requester);
  return formatSprint(sprint);
};

export const createSprint = async (payload, requester) => {
  const project = await getProjectForRequester(payload.projectId, requester, { requireManager: true });
  const sprint = await Sprint.create({
    projectId: project._id,
    name: payload.name,
    goal: payload.goal ?? "",
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: payload.status ?? "PLANNED",
    committedStoryPoints: Number(payload.committedStoryPoints ?? 0),
  });

  publishLiveUpdate({
    userIds: resolveProjectMemberIds(project),
    channels: getSprintRealtimeChannels(project._id, sprint._id),
    type: "sprint.created",
    projectId: serializeId(project._id),
    sprintId: serializeId(sprint._id),
  });

  return formatSprint(sprint);
};

export const updateSprint = async (sprintId, updates, requester) => {
  const { sprint, project } = await getSprintForRequester(sprintId, requester, { requireManager: true });

  sprint.name = updates.name ?? sprint.name;
  sprint.goal = updates.goal ?? sprint.goal;
  sprint.startDate = updates.startDate ?? sprint.startDate;
  sprint.endDate = updates.endDate ?? sprint.endDate;
  sprint.status = updates.status ?? sprint.status;
  if (updates.committedStoryPoints !== undefined) {
    sprint.committedStoryPoints = Number(updates.committedStoryPoints);
  }
  await sprint.save();

  publishLiveUpdate({
    userIds: resolveProjectMemberIds(project),
    channels: getSprintRealtimeChannels(project._id, sprint._id),
    type: "sprint.updated",
    projectId: serializeId(project._id),
    sprintId: serializeId(sprint._id),
  });

  return formatSprint(sprint);
};
