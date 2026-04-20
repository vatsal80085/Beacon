import cors from "cors";
import express from "express";
import authRouter from "./routes/auth.routes.js";
import analyticsRouter from "./modules/analytics/analytics.routes.js";
import invitationRouter from "./modules/invitation/invitation.routes.js";
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

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "Server is running" } });
});

app.use("/api/auth", authRouter);
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

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  sendError(res, error.message || "Something went wrong.", status);
});

export default app;
