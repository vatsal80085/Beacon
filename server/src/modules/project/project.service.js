import Project from "./project.model.js";
import Sprint from "../sprint/sprint.model.js";
import Task from "../task/task.model.js";
import User from "../user/user.model.js";
import Invitation from "../invitation/invitation.model.js";
import mongoose from "mongoose";
import { HttpError } from "../../utils/httpError.js";
import { buildProjectSnapshot, serializeId } from "../analytics/analytics.service.js";
import {
  buildAccessibleProjectsQuery,
  ensureProjectAccess,
  getProjectForRequester,
  resolveProjectMemberIds,
} from "./project.permissions.js";
import { getInvitationRealtimeChannels, getProjectRealtimeChannels } from "../live/live.channels.js";
import { publishLiveUpdate } from "../live/live.service.js";

const resolveInviterUserId = (payload, inviterUserId) =>
  inviterUserId ?? payload?.invitedByUserId ?? payload?.inviterUserId ?? payload?.invitedBy ?? null;

export const getProjects = async (userId) => {
  const projects = await Project.find(buildAccessibleProjectsQuery(userId))
    .sort({ createdAt: -1 })
    .lean();
  return Promise.all(projects.map((project) => buildProjectSnapshot(project)));
};

export const getProjectById = async (projectId, userId = null) => {
  const project = await Project.findById(projectId).lean();
  if (!project) {
    throw new HttpError(404, "Project not found.");
  }

  if (userId) {
    ensureProjectAccess(project, { id: userId });
  }

  const snapshot = await buildProjectSnapshot(project);
  const sprints = await Sprint.find({ projectId }).sort({ createdAt: -1 }).lean();
  return {
    ...snapshot,
    sprints: sprints.map((sprint) => ({
      ...sprint,
      id: serializeId(sprint._id),
      projectId: serializeId(sprint.projectId),
    })),
  };
};

export const createProject = async (payload, userId) => {
  const suppliedTeamMembers = Array.isArray(payload.teamMemberIds) ? payload.teamMemberIds : [];
  const teamMemberIds = resolveProjectMemberIds({
    teamMemberIds: suppliedTeamMembers.length ? suppliedTeamMembers : [userId],
    createdBy: userId,
  });

  const project = await Project.create({
    name: payload.name,
    description: payload.description ?? "",
    status: payload.status ?? "PLANNED",
    startDate: payload.startDate ?? null,
    endDate: payload.endDate ?? null,
    createdBy: userId,
    teamMemberIds,
  });

  await User.updateMany({ _id: { $in: teamMemberIds } }, { $addToSet: { projects: project._id } });
  publishLiveUpdate({
    userIds: teamMemberIds,
    channels: getProjectRealtimeChannels(project._id),
    type: "project.created",
    projectId: serializeId(project._id),
  });
  return getProjectById(project._id);
};

export const updateProject = async (projectId, updates, requester) => {
  const project = await getProjectForRequester(projectId, requester, { requireManager: true });
  const previousTeamMemberIds = resolveProjectMemberIds(project);

  project.name = updates.name ?? project.name;
  project.description = updates.description ?? project.description;
  project.status = updates.status ?? project.status;
  project.startDate = updates.startDate ?? project.startDate;
  project.endDate = updates.endDate ?? project.endDate;
  if (updates.teamMemberIds?.length) {
    project.teamMemberIds = resolveProjectMemberIds({
      teamMemberIds: updates.teamMemberIds,
      createdBy: project.createdBy,
    });
  }

  await project.save();
  publishLiveUpdate({
    userIds: [...previousTeamMemberIds, ...resolveProjectMemberIds(project)],
    channels: getProjectRealtimeChannels(project._id),
    type: "project.updated",
    projectId: serializeId(project._id),
  });
  return getProjectById(projectId);
};

export const deleteProject = async (projectId, requester) => {
  const project = await getProjectForRequester(projectId, requester, { requireManager: true });
  const memberIds = resolveProjectMemberIds(project);

  const sprintIds = (await Sprint.find({ projectId }, { _id: 1 }).lean()).map((item) => item._id);
  await Task.deleteMany({ projectId });
  await Sprint.deleteMany({ projectId });
  await Invitation.deleteMany({ projectId });
  await User.updateMany({ projects: project._id }, { $pull: { projects: project._id } });
  await Project.findByIdAndDelete(projectId);

  publishLiveUpdate({
    userIds: memberIds,
    channels: getProjectRealtimeChannels(projectId),
    type: "project.deleted",
    projectId: serializeId(projectId),
  });

  return {
    deletedProjectId: projectId,
    deletedSprintCount: sprintIds.length,
  };
};

export const inviteMemberByUniqueCode = async (projectId, payload, inviterUserId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new HttpError(404, "Project not found.");
  }

  const resolvedInviterUserId = resolveInviterUserId(payload, inviterUserId);

  if (!resolvedInviterUserId) {
    throw new HttpError(400, "Inviter identity missing.");
  }

  const inviteeUniqueCode = String(payload?.inviteeUniqueCode ?? "").trim();
  if (!inviteeUniqueCode) {
    throw new HttpError(400, "Invitee unique ID is required.");
  }

  const inviterObjectId = mongoose.isValidObjectId(resolvedInviterUserId)
    ? new mongoose.Types.ObjectId(String(resolvedInviterUserId))
    : null;

  if (!inviterObjectId) {
    throw new HttpError(401, "Invalid authentication token. Please log in again.");
  }

  const inviter = await User.findById(inviterObjectId).select("_id");
  if (!inviter) {
    throw new HttpError(401, "Invalid authentication token. Please log in again.");
  }

  const teamMemberIds = resolveProjectMemberIds(project);

  if (
    teamMemberIds.length > 0 &&
    !teamMemberIds.some((memberId) => serializeId(memberId) === serializeId(inviterObjectId))
  ) {
    throw new HttpError(403, "Only project members can invite others.");
  }

  const storedTeamMemberIds = Array.isArray(project.teamMemberIds) ? project.teamMemberIds : [];
  const needsSync =
    storedTeamMemberIds.length !== teamMemberIds.length ||
    teamMemberIds.some((memberId) => !storedTeamMemberIds.some((storedId) => serializeId(storedId) === serializeId(memberId)));
  if (needsSync) {
    project.teamMemberIds = teamMemberIds;
    await project.save();
  }

  const invitee = await User.findOne({ uniqueCode: inviteeUniqueCode.toUpperCase() });
  if (!invitee) {
    throw new HttpError(404, "No user found for the provided unique ID.");
  }

  if (teamMemberIds.some((memberId) => serializeId(memberId) === serializeId(invitee._id))) {
    throw new HttpError(409, "This user is already a team member.");
  }

  const pending = await Invitation.findOne({
    projectId,
    inviteeUserId: invitee._id,
    status: "PENDING",
  });
  if (pending) {
    throw new HttpError(409, "A pending invitation already exists for this user.");
  }

  const invitationPayload = {
    projectId,
    inviteeUserId: invitee._id,
    inviteeUniqueCode: invitee.uniqueCode,
    invitedByUserId: inviterObjectId,
    role: payload.role ?? "DEVELOPER",
  };

  if (!invitationPayload.invitedByUserId) {
    throw new HttpError(400, "Inviter identity missing.");
  }

  const invitation = await Invitation.create(invitationPayload);

  publishLiveUpdate({
    userIds: [...teamMemberIds, invitee._id],
    channels: getInvitationRealtimeChannels(projectId, [invitee._id, inviterObjectId]),
    type: "invitation.created",
    projectId: serializeId(projectId),
    invitationId: serializeId(invitation._id),
  });

  return invitation;
};

export const getProjectInvitations = async (projectId, requester) => {
  await getProjectForRequester(projectId, requester, { lean: true });

  const invitations = await Invitation.find({ projectId })
    .populate("inviteeUserId", "-passwordHash")
    .populate("invitedByUserId", "-passwordHash")
    .sort({ createdAt: -1 });

  return invitations.map((invite) => {
    const invitee =
      invite.inviteeUserId && typeof invite.inviteeUserId === "object" && invite.inviteeUserId._id
        ? invite.inviteeUserId
        : null;
    const inviter =
      invite.invitedByUserId && typeof invite.invitedByUserId === "object" && invite.invitedByUserId._id
        ? invite.invitedByUserId
        : null;

    const inviteeId = serializeId(invitee?._id ?? invite.inviteeUserId);
    const inviterId = serializeId(inviter?._id ?? invite.invitedByUserId);

    return {
      ...invite.toObject(),
      id: serializeId(invite._id),
      projectId: serializeId(invite.projectId),
      inviteeUserId: inviteeId,
      invitedByUserId: inviterId,
      invitee: invitee ? { ...invitee.toObject(), id: inviteeId } : null,
      inviter: inviter ? { ...inviter.toObject(), id: inviterId } : null,
    };
  });
};
