import express from "express";
import { authMiddleWare } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getUserInvitationsController, respondToInvitationController } from "./invitation.controller.js";

const router = express.Router();

router.use(authMiddleWare);
router.get("/users/:id/invitations", asyncHandler(getUserInvitationsController));
router.patch("/invitations/:id", asyncHandler(respondToInvitationController));

export default router;
