import { sendSuccess } from "../../utils/apiResponse.js";
import { getUserInvitations, respondToInvitation } from "./invitation.service.js";

export const getUserInvitationsController = async (req, res) =>
  sendSuccess(res, await getUserInvitations(req.params.id));

export const respondToInvitationController = async (req, res) =>
  sendSuccess(
    res,
    await respondToInvitation(req.params.id, req.user.id, req.body.action),
    "Invitation updated successfully.",
  );
