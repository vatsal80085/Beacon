import Invitation from "./invitation.model.js";
import Project from "../project/project.model.js";
import { HttpError } from "../../utils/httpError.js";
import { serializeId } from "../analytics/analytics.service.js";

export const getUserInvitations = async (userId) => {
  const invitations = await Invitation.find({ inviteeUserId: userId })
    .populate("invitedByUserId", "-passwordHash")
    .populate("projectId")
    .sort({ createdAt: -1 });

  return invitations.map((invite) => ({
    ...invite.toObject(),
    id: serializeId(invite._id),
    inviteeUserId: serializeId(invite.inviteeUserId),
    invitedByUserId: serializeId(invite.invitedByUserId._id),
    projectId: serializeId(invite.projectId._id),
    inviter: { ...invite.invitedByUserId.toObject(), id: serializeId(invite.invitedByUserId._id) },
    project: { ...invite.projectId.toObject(), id: serializeId(invite.projectId._id) },
  }));
};

export const respondToInvitation = async (invitationId, userId, action) => {
  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw new HttpError(404, "Invitation not found.");
  }
  if (serializeId(invitation.inviteeUserId) !== String(userId)) {
    throw new HttpError(403, "You cannot respond to this invitation.");
  }

  if (invitation.status === "PENDING") {
    invitation.status = action === "accept" ? "ACCEPTED" : "DECLINED";
    invitation.respondedAt = new Date();
    await invitation.save();

    if (invitation.status === "ACCEPTED") {
      await Project.findByIdAndUpdate(invitation.projectId, {
        $addToSet: { teamMemberIds: invitation.inviteeUserId },
      });
    }
  }

  return {
    ...invitation.toObject(),
    id: serializeId(invitation._id),
    inviteeUserId: serializeId(invitation.inviteeUserId),
    invitedByUserId: serializeId(invitation.invitedByUserId),
    projectId: serializeId(invitation.projectId),
  };
};
