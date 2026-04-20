import bcrypt from "bcryptjs";
import Project from "../modules/project/project.model.js";
import Sprint from "../modules/sprint/sprint.model.js";
import Task from "../modules/task/task.model.js";
import User from "../modules/user/user.model.js";
import Invitation from "../modules/invitation/invitation.model.js";

const usersSeed = [
  { name: "Sarthak Tiwari", uniqueCode: "BCN-0001", email: "manager@beacon.dev", role: "MANAGER", capacityPerSprint: 28, avatarHue: 189 },
  { name: "Vatsal Agarwal", uniqueCode: "BCN-0002", email: "vatsal@beacon.dev", role: "DEVELOPER", capacityPerSprint: 24, avatarHue: 18 },
  { name: "Sparsh Agarwal", uniqueCode: "BCN-0003", email: "sparsh@beacon.dev", role: "DEVELOPER", capacityPerSprint: 22, avatarHue: 36 },
  { name: "Rudra Gupta", uniqueCode: "BCN-0004", email: "rudra@beacon.dev", role: "DEVELOPER", capacityPerSprint: 20, avatarHue: 212 },
  { name: "Yatender Kumar", uniqueCode: "BCN-0005", email: "yatender@beacon.dev", role: "QA", capacityPerSprint: 18, avatarHue: 148 },
];

export const seedDatabase = async () => {
  const hasUsers = await User.exists({});
  if (hasUsers) {
    return;
  }

  const passwordHash = await bcrypt.hash("beacon-demo", 10);
  const createdUsers = await User.insertMany(usersSeed.map((user) => ({ ...user, passwordHash })));
  const byCode = Object.fromEntries(createdUsers.map((user) => [user.uniqueCode, user]));

  const projects = await Project.insertMany([
    {
      name: "Beacon Core Intelligence",
      description: "Sprint optimization and predictive analytics engine for cross-functional agile teams.",
      status: "ACTIVE",
      startDate: new Date("2026-02-10"),
      endDate: new Date("2026-06-30"),
      createdBy: byCode["BCN-0001"]._id,
      teamMemberIds: createdUsers.map((user) => user._id),
    },
    {
      name: "Sprint Pulse Mobile",
      description: "Companion mobile dashboard for executive-level sprint tracking and alerts.",
      status: "PLANNED",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-08-20"),
      createdBy: byCode["BCN-0001"]._id,
      teamMemberIds: [byCode["BCN-0001"]._id, byCode["BCN-0002"]._id, byCode["BCN-0005"]._id],
    },
  ]);

  const coreProject = projects[0];
  const mobileProject = projects[1];

  const sprints = await Sprint.insertMany([
    {
      projectId: coreProject._id,
      name: "Sprint 12 - Predictive Accuracy",
      goal: "Increase success probability model precision and reduce blocker propagation.",
      status: "ACTIVE",
      startDate: new Date("2026-03-19"),
      endDate: new Date("2026-04-02"),
      committedStoryPoints: 56,
    },
    {
      projectId: coreProject._id,
      name: "Sprint 11 - Workload Balance",
      goal: "Tighten workload balancing heuristics and improve team utilization signals.",
      status: "COMPLETED",
      startDate: new Date("2026-03-05"),
      endDate: new Date("2026-03-18"),
      committedStoryPoints: 52,
    },
    {
      projectId: mobileProject._id,
      name: "Sprint 01 - Mobile Foundations",
      goal: "Establish mobile shell, API sync strategy, and authentication flow.",
      status: "PLANNED",
      startDate: new Date("2026-04-03"),
      endDate: new Date("2026-04-16"),
      committedStoryPoints: 38,
    },
  ]);

  await Task.insertMany([
    {
      projectId: coreProject._id,
      sprintId: sprints[0]._id,
      title: "Calibrate probability model weights",
      description: "Tune weighted features for risk, urgency, and completion confidence.",
      assignedTo: byCode["BCN-0002"]._id,
      priority: "HIGH",
      storyPoints: 8,
      status: "IN_PROGRESS",
      risk: { score: 0.32, level: "MEDIUM" },
      businessValue: 9,
      riskFactor: 7,
      urgency: 8,
    },
    {
      projectId: coreProject._id,
      sprintId: sprints[0]._id,
      title: "Build sprint health API contract",
      description: "Expose normalized health score response for dashboard rendering.",
      assignedTo: byCode["BCN-0003"]._id,
      priority: "HIGH",
      storyPoints: 5,
      status: "DONE",
      risk: { score: 0.11, level: "LOW" },
      businessValue: 8,
      riskFactor: 4,
      urgency: 7,
    },
    {
      projectId: coreProject._id,
      sprintId: sprints[0]._id,
      title: "Stabilize optimization endpoint validation",
      description: "Guard against malformed capacity payloads from project settings.",
      assignedTo: byCode["BCN-0005"]._id,
      priority: "HIGH",
      storyPoints: 8,
      status: "BLOCKED",
      risk: { score: 0.74, level: "HIGH" },
      businessValue: 8,
      riskFactor: 9,
      urgency: 8,
    },
    {
      projectId: coreProject._id,
      sprintId: null,
      title: "Design risk hotspot heatmap",
      description: "Surface high-volatility stories before sprint commitment.",
      assignedTo: byCode["BCN-0005"]._id,
      priority: "HIGH",
      storyPoints: 8,
      status: "TODO",
      risk: { score: 0.58, level: "HIGH" },
      businessValue: 9,
      riskFactor: 8,
      urgency: 7,
    },
    {
      projectId: mobileProject._id,
      sprintId: sprints[2]._id,
      title: "Implement secure token refresh on mobile",
      description: "Persist auth sessions with refresh token safeguards.",
      assignedTo: byCode["BCN-0002"]._id,
      priority: "HIGH",
      storyPoints: 8,
      status: "TODO",
      risk: { score: 0.34, level: "MEDIUM" },
      businessValue: 9,
      riskFactor: 7,
      urgency: 8,
    },
  ]);

  await Invitation.create({
    projectId: coreProject._id,
    inviteeUserId: byCode["BCN-0004"]._id,
    inviteeUniqueCode: byCode["BCN-0004"].uniqueCode,
    invitedByUserId: byCode["BCN-0001"]._id,
    role: "DEVELOPER",
  });
};
