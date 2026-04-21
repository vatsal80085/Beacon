import { sendSuccess } from "../../utils/apiResponse.js";
import { createTask, getTask, listTasks, removeTask, updateTask, updateTaskStatus } from "./task.service.js";

export const listTasksController = async (req, res) => sendSuccess(res, await listTasks(req.query, req.user));
export const getTaskController = async (req, res) => sendSuccess(res, await getTask(req.params.id, req.user));
export const createTaskController = async (req, res) =>
  sendSuccess(res, await createTask(req.body, req.user), "Task created successfully.", 201);
export const updateTaskController = async (req, res) =>
  sendSuccess(res, await updateTask(req.params.id, req.body, req.user), "Task updated successfully.");
export const updateTaskStatusController = async (req, res) =>
  sendSuccess(res, await updateTaskStatus(req.params.id, req.body.status, req.user), "Task status updated.");
export const deleteTaskController = async (req, res) =>
  sendSuccess(res, await removeTask(req.params.id, req.user), "Task deleted successfully.");
