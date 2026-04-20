import express from "express";
import {
  createProjectController,
  deleteProjectController,
  getProjectInvitationsController,
  inviteMemberController,
  listProjects,
  readProject,
  updateProjectController,
} from "./project.controller.js";
import { authMiddleWare } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = express.Router();

router.use(authMiddleWare);
router.get("/", asyncHandler(listProjects));
router.post("/", asyncHandler(createProjectController));
router.get("/:id", asyncHandler(readProject));
router.patch("/:id", asyncHandler(updateProjectController));
router.delete("/:id", asyncHandler(deleteProjectController));
router.post("/:id/members/invite", asyncHandler(inviteMemberController));
router.get("/:id/invitations", asyncHandler(getProjectInvitationsController));

export default router;
