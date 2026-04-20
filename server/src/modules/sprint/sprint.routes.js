import express from "express";
import { authMiddleWare } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  completeSprintController,
  createSprintController,
  getSprintController,
  listSprintsController,
  startSprintController,
  updateSprintController,
} from "./sprint.controller.js";

const router = express.Router();

router.use(authMiddleWare);
router.get("/", asyncHandler(listSprintsController));
router.post("/", asyncHandler(createSprintController));
router.get("/:id", asyncHandler(getSprintController));
router.patch("/:id", asyncHandler(updateSprintController));
router.patch("/:id/start", asyncHandler(startSprintController));
router.patch("/:id/complete", asyncHandler(completeSprintController));

export default router;
