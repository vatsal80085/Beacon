import { sendSuccess } from "../../utils/apiResponse.js";
import { createSprint, getSprint, listSprints, updateSprint } from "./sprint.service.js";

export const listSprintsController = async (req, res) => sendSuccess(res, await listSprints(req.query.projectId));
export const getSprintController = async (req, res) => sendSuccess(res, await getSprint(req.params.id));
export const createSprintController = async (req, res) =>
  sendSuccess(res, await createSprint(req.body), "Sprint created successfully.", 201);
export const updateSprintController = async (req, res) =>
  sendSuccess(res, await updateSprint(req.params.id, req.body), "Sprint updated successfully.");
export const startSprintController = async (req, res) =>
  sendSuccess(res, await updateSprint(req.params.id, { status: "ACTIVE" }), "Sprint started successfully.");
export const completeSprintController = async (req, res) =>
  sendSuccess(res, await updateSprint(req.params.id, { status: "COMPLETED" }), "Sprint completed successfully.");
