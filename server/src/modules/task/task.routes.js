import express from "express";
import { authMiddleWare } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  listTasksController,
  updateTaskController,
  updateTaskStatusController,
} from "./task.controller.js";

const router = express.Router();

router.use(authMiddleWare);
router.get("/", asyncHandler(listTasksController));
router.post("/", asyncHandler(createTaskController));
router.get("/:id", asyncHandler(getTaskController));
router.patch("/:id", asyncHandler(updateTaskController));
router.patch("/:id/status", asyncHandler(updateTaskStatusController));
router.delete("/:id", asyncHandler(deleteTaskController));

export default router;
