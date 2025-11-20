# Task Manager API – Frontend Integration Guide

This document explains how the Flutter client should interact with the Task Manager backend hosted at `https://tm-p91y.onrender.com`. All endpoints are versioned under `/api/v1`, so the full base URL is:

```
https://tm-p91y.onrender.com/api/v1
```

The API speaks JSON exclusively, enforces JWT authentication on protected routes, and returns errors in a consistent envelope (see **Error Handling**).

---

## 1. Authentication Flow

| Endpoint | Method | Body | Notes |
| --- | --- | --- | --- |
| `/auth/register` | POST | `{ "name": "John", "email": "john@acme.com", "password": "Secret123" }` | Create a new user. |
| `/auth/login` | POST | `{ "email": "john@acme.com", "password": "Secret123" }` | Obtain access + refresh tokens. |
| `/auth/refresh` | POST | `{ "refreshToken": "<refresh>" }` | Returns a new access token. |
| `/auth/logout` | POST | `{ "refreshToken": "<refresh>" }` | Requires `Authorization` header. Invalidates the refresh token. |

**Tokens**

- `accessToken`: expires after **30 minutes**. Include it in every protected call via `Authorization: Bearer <token>`.
- `refreshToken`: expires after **7 days** and is stored server‑side. Keep it in the client’s secure SQLite store and exchange it for a new access token via `/auth/refresh`.

**Successful login/register response**

```json
{
  "user": { "id": "clxyz", "name": "John", "email": "john@acme.com" },
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

---

## 2. Users

All user lookup calls require the `Authorization` header.

### Search users
`GET /users?q=<searchTerm>`

- `q` is required, trimmed, and must have at least **2 characters**.
- Search is case-insensitive and matches both `name` and `email`.
- Results are sorted alphabetically by name and limited to 20 entries.

Response `200`:
```json
[
  { "id": "clu1", "name": "Ana Ionescu", "email": "ana@example.com" },
  { "id": "clu2", "name": "Andrei Pop", "email": "andrei@acme.com" }
]
```

Use this endpoint to power auto-complete fields (e.g., adding workspace members). When there are no matches the API returns an empty array.

---

## 3. Workspaces

All workspace routes require the `Authorization` header.

### Create workspace
`POST /workspaces`
```json
{ "name": "Operations" }
```
Response `201`: full workspace object. The creator is automatically the `OWNER` and added as a member.

### List my workspaces
`GET /workspaces`

Response `200`:
```json
[
  { "id": "clw1", "name": "Ops", "ownerId": "clu1", "createdAt": "...", "role": "OWNER" }
]
```

### Workspace details
`GET /workspaces/:id`

Only members can view. Includes member roster with roles.

### Add member
`POST /workspaces/:id/members`
```json
{ "userId": "clu2", "role": "LEADER" }
```
Only `OWNER` or `LEADER` in that workspace can call this. `role` must be `LEADER` or `MEMBER`.

---

## 4. Tasks

All task routes require authentication. A user must belong to the target workspace.

### Create task
`POST /tasks`
```json
{
  "workspaceId": "clw1",
  "title": "Prepare deck",
  "description": "Key points...",
  "dueDate": "2024-08-01T12:00:00.000Z",
  "assigneeId": "clu2"
}
```
Response `201` includes the task with the initial `delegationChain: ["creatorId", "assigneeId"]`.

### List tasks
`GET /tasks?filter=today|week|all|delegated`

- `today`, `week`: filter by due date.
- `all`: default (no filter).
- `delegated`: returns tasks created by the caller but currently assigned to someone else.

### Task details
`GET /tasks/:id`

Returns the task with:
- `subTasks`
- `assignments` (assignee objects)
- `delegationChain` hydrated with `{ id, name }`

### Delegate task
`POST /tasks/:id/delegate`
```json
{ "newAssigneeId": "clu3" }
```
Rules:
- Only the **current assignee** can delegate.
- Max delegation chain length is **3**.
- No duplicate users in the chain.
- New assignee must be a workspace member.
Creates activity logs for every user in the chain.

### Create sub-task
`POST /tasks/:id/subtasks`
```json
{
  "title": "Draft slides",
  "assigneeId": "clu4",
  "description": "First draft",
  "dueDate": "2024-07-28T10:00:00.000Z"
}
```
Only `OWNER` or `LEADER` (within the parent task’s workspace) can create sub-tasks. Sub-tasks behave like normal tasks but keep `parentId`.

### Update status
`PATCH /tasks/:id/status`
```json
{ "status": "DONE" }
```
Only the current assignee may update status. When a sub-task is marked `DONE`, the parent task auto-closes once **all** sub-tasks are done. Every status change emits activity logs to the entire delegation chain.

---

## 5. Activity Logs

`GET /logs`

Returns the caller’s activity feed sorted newest first:

```json
[
  { "id": "log1", "actorName": "Ana", "action": "Ana a delegat...", "timestamp": "2024-07-15T09:32:11.000Z" }
]
```

Use this endpoint to sync the mobile SQLite log table. Since logs are append-only, fetching the whole list periodically (or with `If-Modified-Since` once supported) keeps the offline cache consistent.

---

## 6. Error Handling

All failures follow the same schema:

```json
{
  "error": {
    "message": "Un mesaj clar"
  }
}
```

Common status codes:
- `400` – validation problems (missing fields, invalid status, delegation limits).
- `401` – missing/invalid access token.
- `403` – user lacks membership/role or refresh token invalid.
- `404` – resource not found (workspace/task).
- `409` – duplicate email on register.
- `500` – unexpected server error.

---

## 7. Client Responsibilities & Tips

- **Token storage**: keep both tokens in the app’s secure SQLite store. Refresh tokens must never be sent with regular calls—only to `/auth/refresh` or `/auth/logout`.
- **Offline caching**: treat workspaces, tasks, and logs stored locally as eventual caches. On connectivity regain, fetch fresh lists (`/workspaces`, `/tasks`, `/logs`) and reconcile.
- **Date handling**: all timestamps are ISO strings in UTC. Convert to local time zones on the device.
- **Concurrency**: after delegating or completing tasks, re-fetch the relevant task or workspace to sync the client view, since delegation chains and assignments may change.
- **Pagination**: not yet implemented; clients should guard against large payloads (e.g., display loading indicators).

This guide should give you everything needed to integrate the mobile frontend with the backend API. Reach out if new endpoints or query capabilities are required.
