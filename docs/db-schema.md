# Database Schema – Beacon

All models are implemented using Mongoose.

---

## 1. User

- name: String (required)
- uniqueCode: String (required, unique) // format: BCN-0001
- email: String (required, unique)
- password: String (required, hashed)
- role: Enum ["ADMIN", "MANAGER", "DEVELOPER"]
- capacityPerSprint: Number (default: 0)
- createdAt
- updatedAt

---

## 2. Project

- name: String (required)
- description: String
- createdBy: ObjectId (User)
- teamMembers: [ObjectId (User)]
- createdAt
- updatedAt

Relationship:
Project → has many Sprints

---

## 3. Sprint

- projectId: ObjectId (Project)
- name: String
- startDate: Date
- endDate: Date
- status: Enum ["PLANNED", "ACTIVE", "COMPLETED"]
- committedStoryPoints: Number
- completedStoryPoints: Number
- healthScore: Number
- createdAt
- updatedAt

Relationship:
Sprint → has many Tasks

---

## 4. Task

- projectId: ObjectId (Project)
- sprintId: ObjectId (Sprint)
- title: String (required)
- description: String
- assignedTo: ObjectId (User)
- priority: Enum ["LOW", "MEDIUM", "HIGH"]
- storyPoints: Number
- status: Enum ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]
- risk: Number
- createdAt
- updatedAt

---

## 5. ProjectAnalytics

- projectId: ObjectId
- averageVelocity: Number
- totalSprints: Number
- createdAt

---

## 6. SprintAnalytics

- sprintId: ObjectId
- velocity: Number
- healthScore: Number
- riskScore: Number
- overloadedUsers: [ObjectId]
- generatedAt: Date

---

## 7. Invitation

- projectId: ObjectId (Project)
- inviteeUserId: ObjectId (User)
- inviteeUniqueCode: String (required)
- invitedByUserId: ObjectId (User)
- role: Enum ["MANAGER", "DEVELOPER", "QA"]
- status: Enum ["PENDING", "ACCEPTED", "DECLINED"]
- createdAt: Date
- respondedAt: Date | null
