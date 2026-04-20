import axios from "axios";

const DEFAULT_API_BASE_URL = "http://localhost:5050/api";
const REQUEST_TIMEOUT_MS = 6000;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("beacon:auth_token");
  if (token && !token.startsWith("demo-token:")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const unwrapResponse = (response) => response?.data?.data ?? response?.data ?? null;
const toClientId = (item) => (item ? { ...item, id: item.id ?? item._id } : item);
const toClientCollection = (items) => (Array.isArray(items) ? items.map(toClientId) : []);

export const PRIORITY_META = {
  HIGH: { label: "High", className: "priority-high" },
  MEDIUM: { label: "Medium", className: "priority-medium" },
  LOW: { label: "Low", className: "priority-low" },
};

export const STATUS_META = {
  TODO: { label: "To Do", className: "status-todo" },
  IN_PROGRESS: { label: "In Progress", className: "status-in-progress" },
  DONE: { label: "Done", className: "status-done" },
  BLOCKED: { label: "Blocked", className: "status-blocked" },
  ACTIVE: { label: "Active", className: "status-active" },
  PLANNED: { label: "Planned", className: "status-planned" },
  COMPLETED: { label: "Completed", className: "status-completed" },
};

export const authApi = {
  async login(credentials) {
    const response = await api.post("/auth/login", credentials);
    const payload = unwrapResponse(response);
    return {
      token: payload?.token ?? payload?.accessToken ?? "",
      user: toClientId(payload?.user),
      isDemo: false,
    };
  },
  async register(details) {
    const response = await api.post("/auth/register", details);
    const payload = unwrapResponse(response);
    return {
      token: payload?.token ?? payload?.accessToken ?? "",
      user: toClientId(payload?.user),
      isDemo: false,
    };
  },
  async getMe(token) {
    if (!token) return null;
    const response = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = unwrapResponse(response);
    return toClientId(payload?.user ?? payload);
  },
};

export const projectApi = {
  async getProjects() {
    const response = await api.get("/projects");
    return toClientCollection(unwrapResponse(response));
  },
  async getProjectById(projectId) {
    const response = await api.get(`/projects/${projectId}`);
    const payload = toClientId(unwrapResponse(response));
    if (!payload) return null;
    return {
      ...payload,
      teamMembers: toClientCollection(payload.teamMembers),
      sprints: toClientCollection(payload.sprints),
    };
  },
  async createProject(payload) {
    const response = await api.post("/projects", payload);
    return toClientId(unwrapResponse(response));
  },
  async updateProject(projectId, updates) {
    const response = await api.patch(`/projects/${projectId}`, updates);
    return toClientId(unwrapResponse(response));
  },
  async deleteProject(projectId) {
    const response = await api.delete(`/projects/${projectId}`);
    return unwrapResponse(response);
  },
  async inviteMemberByUniqueCode(projectId, payload) {
    const response = await api.post(`/projects/${projectId}/members/invite`, payload);
    return toClientId(unwrapResponse(response));
  },
  async getProjectInvitations(projectId) {
    const response = await api.get(`/projects/${projectId}/invitations`);
    return toClientCollection(unwrapResponse(response));
  },
};

export const sprintApi = {
  async getSprintsByProject(projectId) {
    const response = await api.get("/sprints", { params: { projectId } });
    return toClientCollection(unwrapResponse(response));
  },
  async getSprintById(sprintId) {
    const response = await api.get(`/sprints/${sprintId}`);
    return toClientId(unwrapResponse(response));
  },
  async createSprint(payload) {
    const response = await api.post("/sprints", payload);
    return toClientId(unwrapResponse(response));
  },
  async updateSprint(sprintId, updates) {
    const response = await api.patch(`/sprints/${sprintId}`, updates);
    return toClientId(unwrapResponse(response));
  },
  async updateSprintStatus(sprintId, status) {
    const endpoint = status === "ACTIVE" ? "start" : status === "COMPLETED" ? "complete" : "";
    if (endpoint) {
      const response = await api.patch(`/sprints/${sprintId}/${endpoint}`);
      return toClientId(unwrapResponse(response));
    }
    const response = await api.patch(`/sprints/${sprintId}`, { status });
    return toClientId(unwrapResponse(response));
  },
};

export const taskApi = {
  async getTasksByProject(projectId) {
    const response = await api.get("/tasks", { params: { projectId } });
    return toClientCollection(unwrapResponse(response));
  },
  async getBacklogByProject(projectId) {
    const response = await api.get("/tasks", { params: { projectId, sprintId: "backlog" } });
    return toClientCollection(unwrapResponse(response));
  },
  async getSprintTasks(sprintId) {
    const response = await api.get("/tasks", { params: { sprintId } });
    return toClientCollection(unwrapResponse(response));
  },
  async createTask(payload) {
    const response = await api.post("/tasks", payload);
    return toClientId(unwrapResponse(response));
  },
  async updateTask(taskId, updates) {
    const response = await api.patch(`/tasks/${taskId}`, updates);
    return toClientId(unwrapResponse(response));
  },
  async updateTaskStatus(taskId, status) {
    const response = await api.patch(`/tasks/${taskId}/status`, { status });
    return toClientId(unwrapResponse(response));
  },
  async deleteTask(taskId) {
    const response = await api.delete(`/tasks/${taskId}`);
    return unwrapResponse(response);
  },
};

export const analyticsApi = {
  async getProjectAnalytics(projectId) {
    const response = await api.get(`/projects/${projectId}/analytics`);
    return unwrapResponse(response);
  },
  async getSprintAnalytics(sprintId) {
    const response = await api.get(`/sprints/${sprintId}/analytics`);
    return unwrapResponse(response);
  },
  async getDashboardOverview() {
    const response = await api.get("/analytics/dashboard");
    return unwrapResponse(response);
  },
};

export const optimizationApi = {
  async optimizeSprint(sprintId) {
    const response = await api.post(`/sprints/${sprintId}/optimize`);
    const payload = unwrapResponse(response);
    return {
      ...payload,
      recommendedTasks: toClientCollection(payload?.recommendedTasks),
    };
  },
};

export const invitationApi = {
  async getMyInvitations(userId) {
    const response = await api.get(`/users/${userId}/invitations`);
    return toClientCollection(unwrapResponse(response));
  },
  async respondToInvitation(invitationId, userId, action) {
    const response = await api.patch(`/invitations/${invitationId}`, { action });
    return toClientId(unwrapResponse(response));
  },
};

export const userApi = {
  async getProjectUsers(projectId) {
    const project = await projectApi.getProjectById(projectId);
    return project?.teamMembers ?? [];
  },
};
