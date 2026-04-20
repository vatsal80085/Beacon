import express from "express";
import { authMiddleWare } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getDashboardOverviewController } from "./analytics.controller.js";

const router = express.Router();

router.use(authMiddleWare);
router.get("/dashboard", asyncHandler(getDashboardOverviewController));

export default router;
