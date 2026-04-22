import Invitation from "./invitation.model.js";
import Project from "../project/project.model.js";
import User from "../user/user.model.js";
import { HttpError } from "../../utils/httpError.js";
import { serializeId } from "../analytics/analytics.service.js";
import { getInvitationRealtimeChannels, getProjectRealtimeChannels } from "../live/live.channels.js";
import { publishLiveUpdate } from "../live/live.service.js";
import { resolveProjectMemberIds } from "../project/project.permissions.js";

export const getUserInvitations = async (userId, requester = null) => {
  if (requester && requester.role !== "ADMIN" && serializeId(requester.id) !== serializeId(userId)) {
    throw new HttpError(403, "Forbidden");
  }

  const invitations = await Invitation.find({ inviteeUserId: userId })
    .populate("invitedByUserId", "-passwordHash")
    .populate("projectId")
    .sort({ createdAt: -1 });

  return invitations.map((invite) => {
    const inviter =
      invite.invitedByUserId && typeof invite.invitedByUserId === "object" && invite.invitedByUserId._id
        ? invite.invitedByUserId
        : null;
    const project =
      invite.projectId && typeof invite.projectId === "object" && invite.projectId._id ? invite.projectId : null;

    const inviterId = serializeId(inviter?._id ?? invite.invitedByUserId);
    const projectId = serializeId(project?._id ?? invite.projectId);

    return {
      ...invite.toObject(),
      id: serializeId(invite._id),
      inviteeUserId: serializeId(invite.inviteeUserId),
      invitedByUserId: inviterId,
      projectId,
      inviter: inviter ? { ...inviter.toObject(), id: inviterId } : null,
      project: project ? { ...project.toObject(), id: projectId } : null,
    };
  });
};

export const respondToInvitation = async (invitationId, userId, action) => {
  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw new HttpError(404, "Invitation not found.");
  }
  if (serializeId(invitation.inviteeUserId) !== String(userId)) {
    throw new HttpError(403, "You cannot respond to this invitation.");
  }

  const project = await Project.findById(invitation.projectId);
  const previousMemberIds = resolveProjectMemberIds(project);

  if (invitation.status === "PENDING") {
    invitation.status = action === "accept" ? "ACCEPTED" : "DECLINED";
    invitation.respondedAt = new Date();
    await invitation.save();

    if (invitation.status === "ACCEPTED") {
      await Promise.all([
        Project.findByIdAndUpdate(invitation.projectId, {
          $addToSet: { teamMemberIds: invitation.inviteeUserId },
        }),
        User.findByIdAndUpdate(invitation.inviteeUserId, {
          $addToSet: { projects: invitation.projectId },
        }),
      ]);
    }
  }

  const updatedProject = await Project.findById(invitation.projectId);
  const nextMemberIds = resolveProjectMemberIds(updatedProject);
  const baseChannels = getInvitationRealtimeChannels(invitation.projectId, [invitation.inviteeUserId, invitation.invitedByUserId]);
  const channels =
    invitation.status === "ACCEPTED" ? [...baseChannels, ...getProjectRealtimeChannels(invitation.projectId)] : baseChannels;

  publishLiveUpdate({
    userIds: [...previousMemberIds, ...nextMemberIds, invitation.inviteeUserId, invitation.invitedByUserId],
    channels,
    type: "invitation.responded",
    action,
    projectId: serializeId(invitation.projectId),
    invitationId: serializeId(invitation._id),
  });

  return {
    ...invitation.toObject(),
    id: serializeId(invitation._id),
    inviteeUserId: serializeId(invitation.inviteeUserId),
    invitedByUserId: serializeId(invitation.invitedByUserId),
    projectId: serializeId(invitation.projectId),
  };
};
