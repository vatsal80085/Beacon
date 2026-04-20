import { sendSuccess } from "../../utils/apiResponse.js";
import { createTask, getTask, listTasks, removeTask, updateTask } from "./task.service.js";

export const listTasksController = async (req, res) => sendSuccess(res, await listTasks(req.query, req.user.id));
export const getTaskController = async (req, res) => sendSuccess(res, await getTask(req.params.id, req.user.id));
export const createTaskController = async (req, res) =>
  sendSuccess(res, await createTask(req.body), "Task created successfully.", 201);
export const updateTaskController = async (req, res) =>
  sendSuccess(res, await updateTask(req.params.id, req.body), "Task updated successfully.");
export const updateTaskStatusController = async (req, res) =>
  sendSuccess(res, await updateTask(req.params.id, { status: req.body.status }), "Task status updated.");
export const deleteTaskController = async (req, res) =>
  sendSuccess(res, await removeTask(req.params.id), "Task deleted successfully.");
