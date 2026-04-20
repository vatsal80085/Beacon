# API Specification – Beacon

Base URL: /api

All responses follow:

Success:
{
  "success": true,
  "data": {},
  "message": ""
}

Error:
{
  "success": false,
  "error": "Error message"
}

---

# AUTH

POST /auth/register
POST /auth/login

GET  /auth/me

---

# USERS

GET    /users
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id

---

# PROJECTS

POST   /projects
GET    /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id

POST   /projects/:id/members
POST   /projects/:id/members/invite
GET    /projects/:id/invitations

---

# INVITATIONS

GET    /users/:id/invitations
PATCH  /invitations/:id

---

# SPRINTS

POST   /sprints
GET    /sprints/:id
PATCH  /sprints/:id
DELETE /sprints/:id

PATCH  /sprints/:id/start
PATCH  /sprints/:id/complete

---

# TASKS

POST   /tasks
GET    /tasks?sprintId=<id>
GET    /tasks/:id
PATCH  /tasks/:id
PATCH  /tasks/:id/status
DELETE /tasks/:id

---

# ANALYTICS

GET /sprints/:id/analytics
GET /projects/:id/analytics

---

# OPTIMIZATION

POST /sprints/:id/optimize

Response:
{
  "recommendedTasks": [],
  "totalStoryPoints": Number,
  "capacityUtilization": Number,
  "predictedSuccessProbability": Number
}
