const unique = (items) => [...new Set(items.filter(Boolean).map((item) => String(item)))];

export const LIVE_CHANNELS = {
  analytics: "analytics",
  backlog: "backlog",
  dashboard: "dashboard",
  invitations: "invitations",
  projects: "projects",
  sprints: "sprints",
};

export const buildProjectChannel = (projectId) => (projectId ? `project:${projectId}` : "");
export const buildSprintChannel = (sprintId) => (sprintId ? `sprint:${sprintId}` : "");
export const buildUserChannel = (userId) => (userId ? `user:${userId}` : "");

export const normalizeLiveChannels = (...collections) => unique(collections.flat());
