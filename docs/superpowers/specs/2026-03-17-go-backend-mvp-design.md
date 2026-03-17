# Go Backend MVP Design

**Date:** 2026-03-17
**Scope:** Phase 1 backend — Auth (email/password + JWT), CRUD API for Sections, Tasks, Sub-tasks, Reminders

## 1. Project Structure

```
server/
├── cmd/server/main.go          # Entry point: load config, connect DB, register routes, start server
├── internal/
│   ├── config/config.go        # Env-based config (DB_URL, JWT_SECRET, PORT)
│   ├── middleware/auth.go       # JWT verification middleware
│   ├── model/                   # Structs matching DB schema
│   │   ├── user.go
│   │   ├── section.go
│   │   ├── task.go
│   │   ├── subtask.go
│   │   └── reminder.go
│   ├── handler/                 # HTTP handlers (request parsing, response writing)
│   │   ├── auth.go             # POST /register, POST /login
│   │   ├── section.go          # CRUD + reorder
│   │   ├── task.go             # CRUD + reorder + toggle
│   │   ├── subtask.go          # CRUD + toggle
│   │   └── reminder.go         # Create, List, Delete
│   └── repository/             # Database queries (pgx)
│       ├── user.go
│       ├── section.go
│       ├── task.go
│       ├── subtask.go
│       └── reminder.go
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_sections.sql
│   ├── 003_create_tasks.sql
│   ├── 004_create_subtasks.sql
│   └── 005_create_reminders.sql
└── go.mod
```

### Dependencies

- `github.com/jackc/pgx/v5` — PostgreSQL driver
- `github.com/golang-jwt/jwt/v5` — JWT signing/verification
- `golang.org/x/crypto` — bcrypt for password hashing
- Go 1.22+ standard library `net/http` with `{id}` pattern syntax for routing (no third-party router)

## 2. Auth Flow

- **POST `/api/v1/register`** — `{ email, password, name }` → hash password with bcrypt, insert user, return JWT + user object
- **POST `/api/v1/login`** — `{ email, password }` → verify bcrypt hash, return JWT + user object
- JWT payload: `{ user_id, email, exp }` — signed with HS256, 7-day expiry
- Auth middleware extracts `user_id` from `Authorization: Bearer <token>` header on all protected routes
- **GET `/api/v1/me`** — returns the authenticated user object (derived from JWT `user_id`). Used by the frontend to hydrate session after page refresh.
- Public routes: `/api/v1/register`, `/api/v1/login`

## 3. API Endpoints

All endpoints under `/api/v1`. All except register/login require valid JWT.

### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/register` | `{ email, password, name }` | `{ token, user }` |
| POST | `/login` | `{ email, password }` | `{ token, user }` |
| GET | `/me` | — | `User` |

### Sections

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/sections` | — | `Section[]` |
| POST | `/sections` | `{ title }` | `Section` |
| PATCH | `/sections/:id` | `{ title?, order_index? }` | `Section` |
| DELETE | `/sections/:id` | — | `204 No Content` |

### Tasks

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/sections/:sectionId/tasks` | — | `Task[]` |
| GET | `/tasks/:id` | — | `Task` |
| POST | `/tasks` | `{ section_id, title, description?, due_date?, priority? }` | `Task` |

**Order assignment:** On create, the server assigns `order_index = MAX(order_index) + 1` within the parent scope (e.g., tasks within section, subtasks within task, sections within user). This appends new items at the end of the list.
| PATCH | `/tasks/:id` | `{ title?, description?, due_date?, priority?, is_completed?, order_index?, section_id? }` | `Task` |

**Completion behavior:** When `is_completed` changes to `true`, the server sets `completed_at = NOW()`. When it changes to `false`, `completed_at` is cleared to `NULL`. The client cannot set `completed_at` directly. Same applies to sub-tasks.
| DELETE | `/tasks/:id` | — | `204 No Content` |

### Sub-tasks

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/tasks/:taskId/subtasks` | — | `SubTask[]` |
| POST | `/subtasks` | `{ task_id, title }` | `SubTask` |
| PATCH | `/subtasks/:id` | `{ title?, is_completed?, order_index? }` | `SubTask` |
| DELETE | `/subtasks/:id` | — | `204 No Content` |

### Reminders

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/tasks/:taskId/reminders` | — | `Reminder[]` |
| POST | `/reminders` | `{ task_id, remind_at }` | `Reminder` |
| DELETE | `/reminders/:id` | — | `204 No Content` |

## 4. Database Schema

All tables use `UUID` primary keys (generated via `gen_random_uuid()`). All timestamps are `TIMESTAMPTZ` with `DEFAULT NOW()`.

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| avatar_url | VARCHAR(500) | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

Note: `oauth_provider` and `oauth_id` from PRD are deferred — MVP uses email/password only.

### sections

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL |
| title | VARCHAR(255) | NOT NULL |
| order_index | INTEGER | NOT NULL, DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### tasks

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| section_id | UUID | FK → sections(id) ON DELETE CASCADE, NOT NULL |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| due_date | TIMESTAMPTZ | |
| priority | TEXT | NOT NULL, DEFAULT 'medium', CHECK IN ('low','medium','high') |
| is_completed | BOOLEAN | NOT NULL, DEFAULT FALSE |
| completed_at | TIMESTAMPTZ | |
| order_index | INTEGER | NOT NULL, DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### sub_tasks

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| task_id | UUID | FK → tasks(id) ON DELETE CASCADE, NOT NULL |
| title | VARCHAR(255) | NOT NULL |
| is_completed | BOOLEAN | NOT NULL, DEFAULT FALSE |
| completed_at | TIMESTAMPTZ | |
| order_index | INTEGER | NOT NULL, DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### reminders

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| task_id | UUID | FK → tasks(id) ON DELETE CASCADE, NOT NULL |
| remind_at | TIMESTAMPTZ | NOT NULL |
| is_sent | BOOLEAN | NOT NULL, DEFAULT FALSE |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### push_subscriptions (schema only — not used in MVP)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL |
| endpoint | TEXT | NOT NULL |
| p256dh_key | VARCHAR(255) | NOT NULL |
| auth_key | VARCHAR(255) | NOT NULL |
| device_name | VARCHAR(255) | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

## 5. Configuration

Environment variables with no `.env` file loader — set them directly or use a `.env` with shell sourcing.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8080` | HTTP server port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (e.g. `postgres://user:pass@localhost:5432/personal_todo`) |
| `JWT_SECRET` | Yes | — | HMAC-SHA256 signing key for JWT tokens |

## 6. Error Handling

All errors returned as JSON: `{ "error": "human-readable message" }`.

| Status | Usage |
|--------|-------|
| 400 | Validation errors, malformed input |
| 401 | Missing/invalid JWT, wrong credentials |
| 404 | Resource not found or not owned by user |
| 500 | Unexpected server errors |

## 7. Ownership Verification

Every mutating and read endpoint verifies that the authenticated user owns the resource. For nested resources (tasks, subtasks, reminders), ownership is traced up through the chain: reminder → task → section → user.

When `section_id` is supplied in a `PATCH /tasks/:id` request (moving a task), the server must also verify the **target** section belongs to the authenticated user before updating.

## 8. Frontend Compatibility

The API is designed to match the existing frontend hooks exactly:
- API base path: `/api/v1` (matches `web/src/api/client.ts`)
- Auth: `Authorization: Bearer <token>` header (matches `api/client.ts`)
- Response shapes match `web/src/types/index.ts` (User, Section, Task, SubTask, Reminder)
- `204 No Content` for DELETE operations (handled by frontend's `res.status === 204` check)
- PATCH for partial updates (frontend uses `api.patch`)

## 9. CORS

For local development, use Vite's proxy config to forward `/api` requests to the Go server — this avoids CORS entirely.

For production, the Go server serves the built `web/dist` static files directly (single origin), eliminating the need for CORS middleware.
