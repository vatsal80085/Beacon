import { projectsSeed, sprintsSeed, tasksSeed, usersSeed } from '../utils/mockData'

let users = structuredClone(usersSeed)
let projects = structuredClone(projectsSeed)
let sprints = structuredClone(sprintsSeed)
let tasks = structuredClone(tasksSeed)

const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))

const ok = async (data, message = '') => {
  await wait()
  return { success: true, data, message }
}

const getUser = (id) => users.find((user) => user.id === id)
const getProject = (id) => projects.find((project) => project.id === id)
const getSprint = (id) => sprints.find((sprint) => sprint.id === id)

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

const formatRange = (startDate, endDate) => `${formatDate(startDate)} - ${formatDate(endDate)}`

const getPriorityScore = (task) =>
  task.businessValue * 0.4 + task.riskFactor * 0.2 + task.urgency * 0.2 - task.storyPoints * 0.2

const getSprintTasks = (sprintId) => tasks.filter((task) => task.sprintId === sprintId)
const getProjectTasks = (projectId) => tasks.filter((task) => task.projectId === projectId)

function getSprintAnalytics(sprint) {
  const sprintTasks = getSprintTasks(sprint.id)
  const donePoints = sprintTasks
    .filter((task) => task.status === 'DONE')
    .reduce((sum, task) => sum + task.storyPoints, 0)
  const totalAssignedPoints = sprintTasks.reduce((sum, task) => sum + task.storyPoints, 0)
  const blockedTasks = sprintTasks.filter((task) => task.status === 'BLOCKED').length
  const duration =
    Math.max(1, Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24)))
  const velocity = Number((donePoints / duration).toFixed(1))
  const completionRatio = sprint.committedStoryPoints ? donePoints / sprint.committedStoryPoints : 0
  const capacity = sprint.projectId
    ? getProject(sprint.projectId)?.teamMembers.reduce((sum, memberId) => sum + (getUser(memberId)?.capacityPerSprint ?? 0), 0)
    : 0
  const capacityUtilization = capacity ? totalAssignedPoints / capacity : 0
  const riskScore = sprintTasks.length ? blockedTasks / sprintTasks.length : 0
  const healthScore = Math.round(
    ((completionRatio * 0.5 + capacityUtilization * 0.3 + (1 - riskScore) * 0.2) * 100),
  )
  const overloadMap = {}

  sprintTasks.forEach((task) => {
    overloadMap[task.assignedTo] = (overloadMap[task.assignedTo] ?? 0) + task.storyPoints
  })

  const overloadedUsers = Object.entries(overloadMap)
    .filter(([userId, points]) => points > (getUser(userId)?.capacityPerSprint ?? 0))
    .map(([userId, points]) => ({
      ...getUser(userId),
      assignedStoryPoints: points,
    }))

  return {
    sprintId: sprint.id,
    velocity,
    healthScore,
    riskScore: Number(riskScore.toFixed(2)),
    overloadedUsers,
    completionRatio: Number((completionRatio * 100).toFixed(0)),
    capacityUtilization: Number((capacityUtilization * 100).toFixed(0)),
    committedStoryPoints: sprint.committedStoryPoints,
    completedStoryPoints: donePoints,
  }
}

function getProjectAnalytics(projectId) {
  const projectSprints = sprints.filter((sprint) => sprint.projectId === projectId)
  const analytics = projectSprints.map(getSprintAnalytics)
  const averageVelocity = analytics.length
    ? Number((analytics.reduce((sum, item) => sum + item.velocity, 0) / analytics.length).toFixed(1))
    : 0

  return {
    projectId,
    averageVelocity,
    totalSprints: projectSprints.length,
    activeSprint: projectSprints.find((sprint) => sprint.status === 'ACTIVE') ?? null,
    latestHealthScore: analytics[0]?.healthScore ?? 0,
    riskTrend: analytics.map((item) => ({ sprintId: item.sprintId, riskScore: item.riskScore })),
  }
}

function optimizeSprint(sprintId) {
  const sprint = getSprint(sprintId)
  const sprintTasks = getSprintTasks(sprintId).map((task) => ({
    ...task,
    priorityScore: Number(getPriorityScore(task).toFixed(1)),
    assignee: getUser(task.assignedTo)?.name ?? 'Unassigned',
  }))
  const capacity =
    getProject(sprint.projectId)?.teamMembers.reduce((sum, memberId) => sum + (getUser(memberId)?.capacityPerSprint ?? 0), 0) ?? 0

  const sorted = [...sprintTasks].sort((a, b) => b.priorityScore - a.priorityScore)
  const recommendedTasks = []
  let totalStoryPoints = 0

  sorted.forEach((task) => {
    if (totalStoryPoints + task.storyPoints <= capacity) {
      recommendedTasks.push(task)
      totalStoryPoints += task.storyPoints
    }
  })

  const capacityUtilization = capacity ? Math.round((totalStoryPoints / capacity) * 100) : 0
  const feasibilityScore = totalStoryPoints ? capacity / totalStoryPoints : 1
  const predictedSuccessProbability = Math.max(52, Math.min(97, Math.round(feasibilityScore * 84)))

  return {
    recommendedTasks,
    totalStoryPoints,
    capacityUtilization,
    predictedSuccessProbability,
  }
}

export async function getDashboardData() {
  const activeProjects = projects.filter((project) => project.status !== 'COMPLETED')
  const activeSprint = sprints.find((sprint) => sprint.status === 'ACTIVE') ?? sprints[0]
  const sprintAnalytics = getSprintAnalytics(activeSprint)
  const openTasks = tasks.filter((task) => task.status !== 'DONE').length
  const dashboardStats = [
    { label: 'Active Projects', value: activeProjects.length, detail: 'Across platform, mobile, and analytics' },
    { label: 'Open Tasks', value: openTasks, detail: 'Visible across active sprints and backlog' },
    { label: 'Sprint Health', value: `${sprintAnalytics.healthScore}%`, detail: 'Weighted by completion, capacity, and risk' },
    { label: 'Team Velocity', value: sprintAnalytics.velocity, detail: 'Story points per day in the current sprint' },
  ]

  const topRisks = tasks
    .filter((task) => task.risk >= 0.5 || task.status === 'BLOCKED')
    .map((task) => ({
      ...task,
      assignee: getUser(task.assignedTo)?.name ?? 'Unassigned',
      projectName: getProject(task.projectId)?.name ?? 'Unknown project',
    }))

  return ok({
    dashboardStats,
    spotlightProject: {
      ...projects[0],
      owner: getUser(projects[0].createdBy)?.name ?? 'Unknown',
      progress: sprintAnalytics.completionRatio,
    },
    sprint: {
      ...activeSprint,
      duration: formatRange(activeSprint.startDate, activeSprint.endDate),
      goal: 'Stabilize the refreshed workspace and complete planning handoff for notifications.',
      analytics: sprintAnalytics,
      optimization: optimizeSprint(activeSprint.id),
    },
    topRisks,
  })
}

export async function getProjects() {
  const data = projects.map((project) => {
    const analytics = getProjectAnalytics(project.id)
    const activeSprint = analytics.activeSprint
    const sprintAnalytics = activeSprint ? getSprintAnalytics(activeSprint) : null

    return {
      ...project,
      owner: getUser(project.createdBy)?.name ?? 'Unknown',
      teamSize: project.teamMembers.length,
      sprint: activeSprint?.name ?? 'No active sprint',
      progress: sprintAnalytics?.completionRatio ?? 0,
      deadline: formatDate(project.deadline),
    }
  })

  return ok(data)
}

export async function createProject(payload) {
  const next = {
    id: `proj-${projects.length + 1}`,
    name: payload.name,
    description: payload.description,
    createdBy: users.find((user) => user.name === payload.owner)?.id ?? users[0].id,
    teamMembers: [users[0].id, users[1].id],
    status: 'PLANNED',
    summary: payload.description,
    deadline: payload.deadline || '2026-05-20',
  }

  projects = [next, ...projects]

  return ok(next, 'Project created successfully')
}

export async function getProjectDetails(projectId) {
  const project = getProject(projectId)

  if (!project) {
    return ok(null)
  }

  const analytics = getProjectAnalytics(projectId)
  const relatedTasks = getProjectTasks(projectId).map((task) => ({
    ...task,
    assignee: getUser(task.assignedTo)?.name ?? 'Unassigned',
    priorityScore: Number(getPriorityScore(task).toFixed(1)),
  }))
  const activeSprint = analytics.activeSprint

  return ok({
    project: {
      ...project,
      owner: getUser(project.createdBy)?.name ?? 'Unknown',
      deadline: formatDate(project.deadline),
      members: project.teamMembers.map((memberId) => getUser(memberId)),
    },
    analytics,
    sprintAnalytics: activeSprint ? getSprintAnalytics(activeSprint) : null,
    tasks: relatedTasks,
  })
}

export async function getBacklogData() {
  const backlogTasks = tasks
    .filter((task) => !task.sprintId || task.status !== 'DONE')
    .map((task) => ({
      ...task,
      assignee: getUser(task.assignedTo)?.name ?? 'Unassigned',
      projectName: getProject(task.projectId)?.name ?? 'Unknown project',
      priorityScore: Number(getPriorityScore(task).toFixed(1)),
    }))

  const summary = {
    total: backlogTasks.length,
    blocked: backlogTasks.filter((task) => task.status === 'BLOCKED').length,
    highPriority: backlogTasks.filter((task) => task.priority === 'HIGH').length,
  }

  return ok({ items: backlogTasks, summary })
}

export async function createTask(payload) {
  const next = {
    id: `TSK-${100 + tasks.length + 1}`,
    projectId: payload.projectId,
    sprintId: payload.sprintId || null,
    title: payload.title,
    description: payload.description,
    assignedTo: payload.assignedTo,
    priority: payload.priority,
    storyPoints: Number(payload.storyPoints),
    status: payload.status,
    risk: Number(payload.risk),
    businessValue: Number(payload.businessValue),
    riskFactor: Number(payload.riskFactor),
    urgency: Number(payload.urgency),
  }

  tasks = [next, ...tasks]
  return ok(next, 'Task created successfully')
}

export async function getSprintWorkspace() {
  const sprint = sprints.find((item) => item.status === 'ACTIVE') ?? sprints[0]
  const sprintTasks = getSprintTasks(sprint.id).map((task) => ({
    ...task,
    assignee: getUser(task.assignedTo)?.name ?? 'Unassigned',
  }))
  const columns = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'].map((status) => ({
    status,
    items: sprintTasks.filter((task) => task.status === status),
  }))

  return ok({
    sprint: {
      ...sprint,
      duration: formatRange(sprint.startDate, sprint.endDate),
      goal: 'Stabilize the refreshed workspace and complete planning handoff for notifications.',
    },
    analytics: getSprintAnalytics(sprint),
    board: columns,
    optimization: optimizeSprint(sprint.id),
  })
}

export async function createSprint(payload) {
  const next = {
    id: `spr-${sprints.length + 11}`,
    projectId: payload.projectId,
    name: payload.name,
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: 'PLANNED',
    committedStoryPoints: Number(payload.committedStoryPoints),
    completedStoryPoints: 0,
  }

  sprints = [next, ...sprints]
  return ok(next, 'Sprint created successfully')
}

export async function getAnalyticsHub() {
  const sprintCards = sprints.map((sprint) => {
    const analytics = getSprintAnalytics(sprint)

    return {
      id: sprint.id,
      name: sprint.name,
      status: sprint.status,
      velocity: analytics.velocity,
      healthScore: analytics.healthScore,
      riskScore: analytics.riskScore,
      capacityUtilization: analytics.capacityUtilization,
    }
  })

  const overload = users
    .map((user) => {
      const assignedStoryPoints = tasks
        .filter((task) => task.assignedTo === user.id && task.status !== 'DONE')
        .reduce((sum, task) => sum + task.storyPoints, 0)

      return {
        ...user,
        assignedStoryPoints,
        overloaded: assignedStoryPoints > user.capacityPerSprint,
      }
    })
    .sort((a, b) => b.assignedStoryPoints - a.assignedStoryPoints)

  const projectCards = projects.map((project) => ({
    id: project.id,
    name: project.name,
    ...getProjectAnalytics(project.id),
  }))

  return ok({ sprintCards, overload, projectCards })
}
