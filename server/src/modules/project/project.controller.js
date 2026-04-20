import { sendSuccess } from "../../utils/apiResponse.js";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjectInvitations,
  getProjects,
  inviteMemberByUniqueCode,
  updateProject,
} from "./project.service.js";

export const listProjects = async (req, res) => sendSuccess(res, await getProjects(req.user.id));
export const readProject = async (req, res) => sendSuccess(res, await getProjectById(req.params.id, req.user.id));
export const createProjectController = async (req, res) =>
  sendSuccess(res, await createProject(req.body, req.user?.id), "Project created successfully.", 201);
export const updateProjectController = async (req, res) =>
  sendSuccess(res, await updateProject(req.params.id, req.body), "Project updated successfully.");
export const deleteProjectController = async (req, res) =>
  sendSuccess(res, await deleteProject(req.params.id), "Project deleted successfully.");
export const inviteMemberController = async (req, res) =>
  sendSuccess(res, await inviteMemberByUniqueCode(req.params.id, req.body), "Invitation sent.", 201);
export const getProjectInvitationsController = async (req, res) =>
  sendSuccess(res, await getProjectInvitations(req.params.id));
