# REST API — Tasks Resource

## Overview

Build a RESTful CRUD API for a `tasks` resource. This is a self-contained feature demonstrating
a complete backend implementation: route handlers, validation, database access, error handling,
and tests. Use it as a smoke-test PRD to verify AgentOS end-to-end.

## Data Model

```typescript
interface Task {
  id: string;           // UUID v4
  title: string;        // 1–200 chars
  description: string;  // 0–2000 chars, optional
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}
```

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/tasks` | List all tasks (supports `?status=` filter) |
| POST | `/api/tasks` | Create a new task |
| GET | `/api/tasks/:id` | Get a single task |
| PATCH | `/api/tasks/:id` | Partial update |
| DELETE | `/api/tasks/:id` | Delete a task |

## Requirements

### Validation

- `title`: required, string, 1–200 characters — return 422 if invalid.
- `status`: must be one of `todo | in_progress | done` — return 422 if invalid.
- `priority`: must be one of `low | medium | high` — return 422 if invalid.
- Unknown fields in the request body must be stripped (not rejected).

### Error Responses

All errors return `{ error: string, details?: unknown }` with an appropriate HTTP status:

- 400 — malformed JSON
- 404 — task not found
- 422 — validation failure (include `details` with field errors)
- 500 — unexpected server error (log, never expose internals)

### Database

- Store tasks in a `tasks` table (SQLite via `better-sqlite3` for local dev).
- Use prepared statements — never interpolate user input into SQL strings.
- `createdAt` and `updatedAt` are set by the server, not the client.

## Acceptance Criteria

- [ ] `GET /api/tasks` returns `[]` when empty, array of tasks otherwise.
- [ ] `POST /api/tasks` with valid body returns 201 + created task.
- [ ] `POST /api/tasks` with missing `title` returns 422 with `details.title`.
- [ ] `GET /api/tasks/:id` returns 404 for unknown ID.
- [ ] `PATCH /api/tasks/:id` updates only provided fields, leaves others unchanged.
- [ ] `DELETE /api/tasks/:id` returns 204 on success, 404 if not found.
- [ ] All endpoints covered by Vitest tests using a real in-memory SQLite database.

## Stack Context

- Runtime: Node.js 20, TypeScript strict mode
- Framework: Express 5 (or Next.js App Router API routes — match existing project)
- Database: better-sqlite3
- Validation: Zod
- Testing: Vitest + supertest (or `fetch` against the running server)
