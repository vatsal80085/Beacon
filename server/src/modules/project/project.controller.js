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

const getAuthenticatedUserId = (req) => req.user?.id ?? req.user?.userId ?? req.user?._id ?? null;

export const listProjects = async (req, res) => sendSuccess(res, await getProjects(req.user.id));
export const readProject = async (req, res) => sendSuccess(res, await getProjectById(req.params.id, req.user.id));
export const createProjectController = async (req, res) =>
  sendSuccess(res, await createProject(req.body, req.user?.id), "Project created successfully.", 201);
export const updateProjectController = async (req, res) =>
  sendSuccess(res, await updateProject(req.params.id, req.body, req.user), "Project updated successfully.");
export const deleteProjectController = async (req, res) =>
  sendSuccess(res, await deleteProject(req.params.id, req.user), "Project deleted successfully.");
export const inviteMemberController = async (req, res) => {
  const authenticatedUserId = getAuthenticatedUserId(req);

  try {
    sendSuccess(
      res,
      await inviteMemberByUniqueCode(
        req.params.id,
        {
          ...req.body,
          invitedByUserId: authenticatedUserId,
        },
        authenticatedUserId,
      ),
      "Invitation sent.",
      201,
    );
  } catch (error) {
    console.error("Invite request failed.", {
      projectId: req.params.id,
      hasAuthenticatedUserId: Boolean(authenticatedUserId),
      authenticatedUserId: authenticatedUserId ? String(authenticatedUserId) : null,
      inviteeUniqueCode:
        typeof req.body?.inviteeUniqueCode === "string" ? req.body.inviteeUniqueCode.trim().toUpperCase() : null,
      role: typeof req.body?.role === "string" ? req.body.role : null,
      errorName: error?.name ?? "UnknownError",
      errorMessage: error?.message ?? "Unknown error.",
    });
    throw error;
  }
};
export const getProjectInvitationsController = async (req, res) =>
  sendSuccess(res, await getProjectInvitations(req.params.id, req.user));
