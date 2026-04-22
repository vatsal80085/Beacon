import Sprint from "../sprint/sprint.model.js";
import Project from "./project.model.js";
import { HttpError } from "../../utils/httpError.js";

const MANAGER_ROLES = new Set(["ADMIN", "MANAGER"]);

export const buildAccessibleProjectsQuery = (userId) => ({
  $or: [{ teamMemberIds: userId }, { teamMembers: userId }, { createdBy: userId }],
});

export const resolveProjectMemberIds = (project) => {
  const deduped = new Map();

  const registerId = (value) => {
    if (!value) {
      return;
    }

    const key = String(value);
    if (!deduped.has(key)) {
      deduped.set(key, value);
    }
  };

  (project?.teamMemberIds ?? []).forEach(registerId);
  (project?.teamMembers ?? []).forEach(registerId);
  registerId(project?.createdBy);

  return [...deduped.values()];
};

export const canManageProject = (requester) => MANAGER_ROLES.has(requester?.role);

export const isProjectMember = (project, userId) =>
  Boolean(userId) && resolveProjectMemberIds(project).some((memberId) => String(memberId) === String(userId));

export const ensureProjectAccess = (project, requester, { requireManager = false } = {}) => {
  if (!project) {
    throw new HttpError(404, "Project not found.");
  }

  if (!isProjectMember(project, requester?.id)) {
    throw new HttpError(403, "Forbidden");
  }

  if (requireManager && !canManageProject(requester)) {
    throw new HttpError(403, "Only managers can perform this action.");
  }

  return project;
};

export const getAccessibleProjectIds = async (requester) => {
  if (!requester?.id) {
    throw new HttpError(401, "Authentication required.");
  }

  const projects = await Project.find(buildAccessibleProjectsQuery(requester.id), { _id: 1 }).lean();
  return projects.map((project) => project._id);
};

export const getProjectForRequester = async (projectId, requester, { requireManager = false, lean = false } = {}) => {
  const query = lean ? Project.findById(projectId).lean() : Project.findById(projectId);
  const project = await query;
  return ensureProjectAccess(project, requester, { requireManager });
};

export const getSprintForRequester = async (sprintId, requester, { requireManager = false } = {}) => {
  const sprint = await Sprint.findById(sprintId);

  if (!sprint) {
    throw new HttpError(404, "Sprint not found.");
  }

  const project = await Project.findById(sprint.projectId);
  ensureProjectAccess(project, requester, { requireManager });

  return { sprint, project };
};
