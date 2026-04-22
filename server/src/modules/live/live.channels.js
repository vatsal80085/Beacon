const unique = (items) => [...new Set(items.filter(Boolean).map((item) => String(item)))];

export const LIVE_CHANNELS = {
  analytics: "analytics",
  backlog: "backlog",
  dashboard: "dashboard",
  invitations: "invitations",
  projects: "projects",
  sprints: "sprints",
  project: (projectId) => (projectId ? `project:${projectId}` : ""),
  sprint: (sprintId) => (sprintId ? `sprint:${sprintId}` : ""),
  user: (userId) => (userId ? `user:${userId}` : ""),
};

export const getProjectRealtimeChannels = (projectId) =>
  unique([
    LIVE_CHANNELS.dashboard,
    LIVE_CHANNELS.projects,
    LIVE_CHANNELS.backlog,
    LIVE_CHANNELS.sprints,
    LIVE_CHANNELS.analytics,
    LIVE_CHANNELS.project(projectId),
  ]);

export const getSprintRealtimeChannels = (projectId, sprintIds = []) =>
  unique([
    ...getProjectRealtimeChannels(projectId),
    ...[].concat(sprintIds).map((sprintId) => LIVE_CHANNELS.sprint(sprintId)),
  ]);

export const getInvitationRealtimeChannels = (projectId, userIds = []) =>
  unique([
    LIVE_CHANNELS.invitations,
    LIVE_CHANNELS.project(projectId),
    ...[].concat(userIds).map((userId) => LIVE_CHANNELS.user(userId)),
  ]);
