import cors from "cors";
import express from "express";
import authRouter from "./routes/auth.routes.js";
import analyticsRouter from "./modules/analytics/analytics.routes.js";
import invitationRouter from "./modules/invitation/invitation.routes.js";
import liveRouter from "./modules/live/live.routes.js";
import projectRouter from "./modules/project/project.routes.js";
import sprintRouter from "./modules/sprint/sprint.routes.js";
import taskRouter from "./modules/task/task.routes.js";
import userRouter from "./modules/user/user.routes.js";
import { getProjectAnalyticsController, getSprintAnalyticsController } from "./modules/analytics/analytics.controller.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { sendError } from "./utils/apiResponse.js";
import { authMiddleWare } from "./middleware/auth.js";
import { optimizeSprint, buildAiInsights } from "./modules/optimization/optimization.service.js";

const app = express();
const startedAt = new Date().toISOString();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "Server is running", startedAt } });
});

app.use("/api/auth", authRouter);
app.use("/api/live", liveRouter);
app.use("/api/projects", projectRouter);
app.use("/api/sprints", sprintRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/users", userRouter);
app.use("/api", invitationRouter);
app.use("/api/analytics", analyticsRouter);

app.get("/api/projects/:id/analytics", authMiddleWare, asyncHandler(getProjectAnalyticsController));
app.get("/api/sprints/:id/analytics", authMiddleWare, asyncHandler(getSprintAnalyticsController));
app.post(
  "/api/sprints/:id/optimize",
  authMiddleWare,
  asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await optimizeSprint(req.params.id), message: "" });
  }),
);
app.get(
  "/api/sprints/:id/ai-insights",
  authMiddleWare,
  asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await buildAiInsights(req.params.id), message: "" });
  }),
);

const normalizeErrorStatus = (error) => {
  if (!error || typeof error !== "object") {
    return 500;
  }

  if (typeof error.status === "number") {
    return error.status;
  }

  
  if (error.name === "CastError") {
    return 400;
  }

  if (error.name === "ValidationError") {
    return 400;
  }

  if (error.code === 11000) {
    return 409;
  }

  return 500;
};

const normalizeErrorMessage = (error) => {
  if (!error || typeof error !== "object") {
    return "Something went wrong.";
  }

  if (error.name === "CastError") {
    return `Invalid ${error.path || "resource"} identifier.`;
  }

  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors ?? {})
      .map((item) => item?.message)
      .filter(Boolean);
    return messages.length ? messages.join(" ") : "Validation failed.";
  }

  if (error.code === 11000) {
    return "Duplicate record.";
  }

  return error.message || "Something went wrong.";
};

app.use((error, _req, res, _next) => {
  const status = normalizeErrorStatus(error);
  const message = normalizeErrorMessage(error);
 console.error(error);

  sendError(res, message, status);
});

export default app;
