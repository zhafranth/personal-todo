# Go Backend MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Go REST API with email/password JWT auth and CRUD endpoints for sections, tasks, sub-tasks, and reminders — matching the existing frontend hooks exactly.

**Architecture:** Layered Go project (`cmd/server`, `internal/handler`, `internal/repository`, `internal/model`, `internal/middleware`, `internal/config`). Standard library `net/http` with Go 1.22+ pattern routing. PostgreSQL via `pgx/v5`. JWT via `golang-jwt/v5`. No ORM.

**Tech Stack:** Go 1.22+, PostgreSQL 14, pgx/v5, golang-jwt/v5, bcrypt

**Spec:** `docs/superpowers/specs/2026-03-17-go-backend-mvp-design.md`

---

## File Map

### New files to create

```
server/
├── cmd/server/main.go                  # Entry point: config, DB pool, router, server start
├── internal/
│   ├── config/config.go                # Load env vars (PORT, DATABASE_URL, JWT_SECRET)
│   ├── middleware/auth.go              # JWT extraction middleware, context helper
│   ├── handler/
│   │   ├── helpers.go                  # JSON response/error helpers, path param extraction
│   │   ├── auth.go                     # POST /register, POST /login, GET /me
│   │   ├── section.go                  # Sections CRUD
│   │   ├── task.go                     # Tasks CRUD
│   │   ├── subtask.go                  # Sub-tasks CRUD
│   │   └── reminder.go                 # Reminders CRUD
│   ├── model/
│   │   ├── user.go                     # User struct
│   │   ├── section.go                  # Section struct
│   │   ├── task.go                     # Task struct
│   │   ├── subtask.go                  # SubTask struct
│   │   └── reminder.go                 # Reminder struct
│   └── repository/
│       ├── errors.go                   # Shared repository errors (ErrNotFound)
│       ├── user.go                     # User DB queries
│       ├── section.go                  # Section DB queries
│       ├── task.go                     # Task DB queries
│       ├── subtask.go                  # SubTask DB queries
│       └── reminder.go                 # Reminder DB queries
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_sections.sql
│   ├── 003_create_tasks.sql
│   ├── 004_create_subtasks.sql
│   └── 005_create_reminders.sql
└── go.mod
```

### Existing files to modify

- `web/vite.config.ts` — add proxy for `/api` → Go server (Task 9)

---

## Chunk 1: Foundation (Tasks 1-3)

### Task 1: Go module init, config, and dependencies

**Files:**
- Create: `server/go.mod`
- Create: `server/internal/config/config.go`

- [ ] **Step 1: Initialize Go module**

```bash
cd server && go mod init github.com/zhafrantharif/personal-todo/server
```

- [ ] **Step 2: Create config loader**

Create `server/internal/config/config.go`:

```go
package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return Config{
		Port:        port,
		DatabaseURL: os.Getenv("DATABASE_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
	}
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd server && go get github.com/jackc/pgx/v5/pgxpool
cd server && go get github.com/golang-jwt/jwt/v5
cd server && go get golang.org/x/crypto/bcrypt
cd server && go mod tidy
```

- [ ] **Step 4: Commit**

```bash
git add server/
git commit -m "feat(server): init Go module with config and dependencies"
```

---

### Task 2: Database migrations

**Files:**
- Create: `server/migrations/001_create_users.sql`
- Create: `server/migrations/002_create_sections.sql`
- Create: `server/migrations/003_create_tasks.sql`
- Create: `server/migrations/004_create_subtasks.sql`
- Create: `server/migrations/005_create_reminders.sql`

- [ ] **Step 1: Create PostgreSQL database**

```bash
createdb personal_todo
```

- [ ] **Step 2: Write migration files**

`server/migrations/001_create_users.sql`:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`server/migrations/002_create_sections.sql`:
```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_user_id ON sections(user_id);
```

`server/migrations/003_create_tasks.sql`:
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_section_id ON tasks(section_id);
```

`server/migrations/004_create_subtasks.sql`:
```sql
CREATE TABLE sub_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_tasks_task_id ON sub_tasks(task_id);
```

`server/migrations/005_create_reminders.sql`:
```sql
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_task_id ON reminders(task_id);
```

- [ ] **Step 3: Run migrations**

```bash
psql personal_todo -f server/migrations/001_create_users.sql
psql personal_todo -f server/migrations/002_create_sections.sql
psql personal_todo -f server/migrations/003_create_tasks.sql
psql personal_todo -f server/migrations/004_create_subtasks.sql
psql personal_todo -f server/migrations/005_create_reminders.sql
```

- [ ] **Step 4: Verify tables exist**

```bash
psql personal_todo -c "\dt"
```

Expected: tables `users`, `sections`, `tasks`, `sub_tasks`, `reminders` listed.

- [ ] **Step 5: Commit**

```bash
git add server/migrations/
git commit -m "feat(server): add database migration files"
```

---

### Task 3: Models, handler helpers, and server entry point

**Files:**
- Create: `server/internal/model/user.go`
- Create: `server/internal/model/section.go`
- Create: `server/internal/model/task.go`
- Create: `server/internal/model/subtask.go`
- Create: `server/internal/model/reminder.go`
- Create: `server/internal/handler/helpers.go`
- Create: `server/cmd/server/main.go`

- [ ] **Step 1: Create model structs**

`server/internal/model/user.go`:
```go
package model

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	AvatarURL    *string   `json:"avatar_url,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
```

`server/internal/model/section.go`:
```go
package model

import "time"

type Section struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Title      string    `json:"title"`
	OrderIndex int       `json:"order_index"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
```

`server/internal/model/task.go`:
```go
package model

import "time"

type Task struct {
	ID          string     `json:"id"`
	SectionID   string     `json:"section_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	DueDate     *time.Time `json:"due_date,omitempty"`
	Priority    string     `json:"priority"`
	IsCompleted bool       `json:"is_completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	OrderIndex  int        `json:"order_index"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
```

`server/internal/model/subtask.go`:
```go
package model

import "time"

type SubTask struct {
	ID          string     `json:"id"`
	TaskID      string     `json:"task_id"`
	Title       string     `json:"title"`
	IsCompleted bool       `json:"is_completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	OrderIndex  int        `json:"order_index"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
```

`server/internal/model/reminder.go`:
```go
package model

import "time"

type Reminder struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	RemindAt  time.Time `json:"remind_at"`
	IsSent    bool      `json:"is_sent"`
	CreatedAt time.Time `json:"created_at"`
}
```

- [ ] **Step 2: Create handler helpers**

`server/internal/handler/helpers.go`:
```go
package handler

import (
	"encoding/json"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}
```

- [ ] **Step 3: Create server entry point**

`server/cmd/server/main.go`:
```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/config"
)

func main() {
	cfg := config.Load()

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("Unable to ping database: %v", err)
	}
	log.Println("Connected to database")

	mux := http.NewServeMux()

	// Routes will be registered here in subsequent tasks

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd server && go build ./cmd/server/
```

Expected: no errors, binary created.

- [ ] **Step 5: Verify server starts and connects to DB**

```bash
cd server && DATABASE_URL="postgres://zhafrantharif@localhost:5432/personal_todo?sslmode=disable" JWT_SECRET="dev-secret" go run ./cmd/server/ &
sleep 1
kill %1
```

Expected: "Connected to database" and "Server starting on :8080" in logs.

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat(server): add models, handler helpers, and server entry point"
```

---

## Chunk 2: Auth (Task 4)

### Task 4: Auth — register, login, JWT middleware, GET /me

**Files:**
- Create: `server/internal/repository/user.go`
- Create: `server/internal/middleware/auth.go`
- Create: `server/internal/handler/auth.go`
- Modify: `server/cmd/server/main.go` (register auth routes)

- [ ] **Step 1: Create user repository**

`server/internal/repository/user.go`:
```go
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) Create(ctx context.Context, email, passwordHash, name string) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
		 RETURNING id, email, password_hash, name, avatar_url, created_at, updated_at`,
		email, passwordHash, name,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, avatar_url, created_at, updated_at FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, avatar_url, created_at, updated_at FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}
```

- [ ] **Step 2: Create JWT middleware**

`server/internal/middleware/auth.go`:
```go
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"

func Auth(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"missing or invalid authorization header"}`))
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
			return []byte(secret), nil
		}, jwt.WithValidMethods([]string{"HS256"}))
		if err != nil || !token.Valid {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"invalid or expired token"}`))
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"invalid token claims"}`))
			return
		}

		userID, ok := claims["user_id"].(string)
		if !ok {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"invalid user_id in token"}`))
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserID(ctx context.Context) string {
	return ctx.Value(UserIDKey).(string)
}
```

- [ ] **Step 3: Create auth handler**

`server/internal/handler/auth.go`:
```go
package handler

import (
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	users     *repository.UserRepo
	jwtSecret string
}

func NewAuthHandler(users *repository.UserRepo, jwtSecret string) *AuthHandler {
	return &AuthHandler{users: users, jwtSecret: jwtSecret}
}

func (h *AuthHandler) generateToken(user *model.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" || req.Name == "" {
		writeError(w, http.StatusBadRequest, "email, password, and name are required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	user, err := h.users.Create(r.Context(), req.Email, string(hash), req.Name)
	if err != nil {
		writeError(w, http.StatusBadRequest, "email already exists")
		return
	}

	token, err := h.generateToken(user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"token": token, "user": user})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	user, err := h.users.GetByEmail(r.Context(), req.Email)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := h.generateToken(user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}
```

- [ ] **Step 4: Wire auth routes in main.go**

Update `server/cmd/server/main.go` — replace the `// Routes will be registered here` comment:

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/config"
	"github.com/zhafrantharif/personal-todo/server/internal/handler"
	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

func main() {
	cfg := config.Load()

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("Unable to ping database: %v", err)
	}
	log.Println("Connected to database")

	// Repositories
	userRepo := repository.NewUserRepo(pool)

	// Handlers
	authHandler := handler.NewAuthHandler(userRepo, cfg.JWTSecret)

	// Router
	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("POST /api/v1/register", authHandler.Register)
	mux.HandleFunc("POST /api/v1/login", authHandler.Login)

	// Protected routes
	protected := http.NewServeMux()
	protected.HandleFunc("GET /api/v1/me", authHandler.Me)

	// More protected routes will be added here

	mux.Handle("/api/v1/", middleware.Auth(cfg.JWTSecret, protected))

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
```

- [ ] **Step 5: Verify it compiles**

```bash
cd server && go build ./cmd/server/
```

- [ ] **Step 6: Manual smoke test**

```bash
cd server && DATABASE_URL="postgres://zhafrantharif@localhost:5432/personal_todo?sslmode=disable" JWT_SECRET="dev-secret" go run ./cmd/server/ &
sleep 1

# Register
curl -s -X POST http://localhost:8080/api/v1/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"pass123","name":"Test User"}' | python3 -m json.tool

# Login
curl -s -X POST http://localhost:8080/api/v1/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"pass123"}' | python3 -m json.tool

# Copy the token from login response, test /me
# curl -s http://localhost:8080/api/v1/me -H 'Authorization: Bearer <TOKEN>' | python3 -m json.tool

kill %1
```

Expected: register returns `{ token, user }`, login returns `{ token, user }`.

- [ ] **Step 7: Commit**

```bash
git add server/
git commit -m "feat(server): add auth with register, login, JWT middleware, and GET /me"
```

---

## Chunk 3: Sections & Tasks CRUD (Tasks 5-6)

### Task 5: Sections CRUD

**Files:**
- Create: `server/internal/repository/section.go`
- Create: `server/internal/handler/section.go`
- Modify: `server/cmd/server/main.go` (register section routes)

- [ ] **Step 1: Create section repository**

`server/internal/repository/section.go`:
```go
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type SectionRepo struct {
	pool *pgxpool.Pool
}

func NewSectionRepo(pool *pgxpool.Pool) *SectionRepo {
	return &SectionRepo{pool: pool}
}

func (r *SectionRepo) List(ctx context.Context, userID string) ([]model.Section, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, title, order_index, created_at, updated_at
		 FROM sections WHERE user_id = $1 ORDER BY order_index`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sections []model.Section
	for rows.Next() {
		var s model.Section
		if err := rows.Scan(&s.ID, &s.UserID, &s.Title, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		sections = append(sections, s)
	}
	if sections == nil {
		sections = []model.Section{}
	}
	return sections, rows.Err()
}

func (r *SectionRepo) Create(ctx context.Context, userID, title string) (*model.Section, error) {
	var s model.Section
	err := r.pool.QueryRow(ctx,
		`INSERT INTO sections (user_id, title, order_index)
		 VALUES ($1, $2, COALESCE((SELECT MAX(order_index) + 1 FROM sections WHERE user_id = $1), 0))
		 RETURNING id, user_id, title, order_index, created_at, updated_at`,
		userID, title,
	).Scan(&s.ID, &s.UserID, &s.Title, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt)
	return &s, err
}

func (r *SectionRepo) GetByID(ctx context.Context, id, userID string) (*model.Section, error) {
	var s model.Section
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, order_index, created_at, updated_at
		 FROM sections WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&s.ID, &s.UserID, &s.Title, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt)
	return &s, err
}

func (r *SectionRepo) Update(ctx context.Context, id, userID string, title *string, orderIndex *int) (*model.Section, error) {
	var s model.Section
	err := r.pool.QueryRow(ctx,
		`UPDATE sections SET
			title = COALESCE($3, title),
			order_index = COALESCE($4, order_index),
			updated_at = NOW()
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, title, order_index, created_at, updated_at`,
		id, userID, title, orderIndex,
	).Scan(&s.ID, &s.UserID, &s.Title, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt)
	return &s, err
}

func (r *SectionRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM sections WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
```

Also create `server/internal/repository/errors.go` for shared errors:

```go
package repository

import "errors"

var ErrNotFound = errors.New("not found")
```

- [ ] **Step 2: Create section handler**

`server/internal/handler/section.go`:
```go
package handler

import (
	"errors"
	"net/http"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type SectionHandler struct {
	sections *repository.SectionRepo
}

func NewSectionHandler(sections *repository.SectionRepo) *SectionHandler {
	return &SectionHandler{sections: sections}
}

func (h *SectionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	sections, err := h.sections.List(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list sections")
		return
	}
	writeJSON(w, http.StatusOK, sections)
}

type createSectionRequest struct {
	Title string `json:"title"`
}

func (h *SectionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createSectionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	section, err := h.sections.Create(r.Context(), userID, req.Title)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create section")
		return
	}
	writeJSON(w, http.StatusCreated, section)
}

type updateSectionRequest struct {
	Title      *string `json:"title"`
	OrderIndex *int    `json:"order_index"`
}

func (h *SectionHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	var req updateSectionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	section, err := h.sections.Update(r.Context(), id, userID, req.Title, req.OrderIndex)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "section not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update section")
		return
	}
	writeJSON(w, http.StatusOK, section)
}

func (h *SectionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	err := h.sections.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "section not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete section")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 3: Wire section routes in main.go**

Add to `server/cmd/server/main.go` after `userRepo`:
```go
sectionRepo := repository.NewSectionRepo(pool)
sectionHandler := handler.NewSectionHandler(sectionRepo)
```

Add to the `protected` mux:
```go
protected.HandleFunc("GET /api/v1/sections", sectionHandler.List)
protected.HandleFunc("POST /api/v1/sections", sectionHandler.Create)
protected.HandleFunc("PATCH /api/v1/sections/{id}", sectionHandler.Update)
protected.HandleFunc("DELETE /api/v1/sections/{id}", sectionHandler.Delete)
```

- [ ] **Step 4: Verify it compiles**

```bash
cd server && go build ./cmd/server/
```

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat(server): add sections CRUD endpoints"
```

---

### Task 6: Tasks CRUD

**Files:**
- Create: `server/internal/repository/task.go`
- Create: `server/internal/handler/task.go`
- Modify: `server/cmd/server/main.go` (register task routes)

- [ ] **Step 1: Create task repository**

`server/internal/repository/task.go`:
```go
package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type TaskRepo struct {
	pool *pgxpool.Pool
}

func NewTaskRepo(pool *pgxpool.Pool) *TaskRepo {
	return &TaskRepo{pool: pool}
}

func (r *TaskRepo) ListBySection(ctx context.Context, sectionID, userID string) ([]model.Task, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT t.id, t.section_id, t.title, t.description, t.due_date, t.priority,
		        t.is_completed, t.completed_at, t.order_index, t.created_at, t.updated_at
		 FROM tasks t
		 JOIN sections s ON s.id = t.section_id
		 WHERE t.section_id = $1 AND s.user_id = $2
		 ORDER BY t.order_index`, sectionID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []model.Task
	for rows.Next() {
		var t model.Task
		if err := rows.Scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate,
			&t.Priority, &t.IsCompleted, &t.CompletedAt, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	if tasks == nil {
		tasks = []model.Task{}
	}
	return tasks, rows.Err()
}

func (r *TaskRepo) GetByID(ctx context.Context, id, userID string) (*model.Task, error) {
	var t model.Task
	err := r.pool.QueryRow(ctx,
		`SELECT t.id, t.section_id, t.title, t.description, t.due_date, t.priority,
		        t.is_completed, t.completed_at, t.order_index, t.created_at, t.updated_at
		 FROM tasks t
		 JOIN sections s ON s.id = t.section_id
		 WHERE t.id = $1 AND s.user_id = $2`, id, userID,
	).Scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate,
		&t.Priority, &t.IsCompleted, &t.CompletedAt, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt)
	return &t, err
}

func (r *TaskRepo) Create(ctx context.Context, userID, sectionID, title string, description *string, dueDate *time.Time, priority string) (*model.Task, error) {
	// Verify section ownership
	var ownerID string
	err := r.pool.QueryRow(ctx, `SELECT user_id FROM sections WHERE id = $1`, sectionID).Scan(&ownerID)
	if err != nil || ownerID != userID {
		return nil, ErrNotFound
	}

	if priority == "" {
		priority = "medium"
	}

	var t model.Task
	err = r.pool.QueryRow(ctx,
		`INSERT INTO tasks (section_id, title, description, due_date, priority, order_index)
		 VALUES ($1, $2, $3, $4, $5, COALESCE((SELECT MAX(order_index) + 1 FROM tasks WHERE section_id = $1), 0))
		 RETURNING id, section_id, title, description, due_date, priority,
		           is_completed, completed_at, order_index, created_at, updated_at`,
		sectionID, title, description, dueDate, priority,
	).Scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate,
		&t.Priority, &t.IsCompleted, &t.CompletedAt, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt)
	return &t, err
}

type TaskUpdate struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	DueDate     *time.Time `json:"due_date"`
	ClearDueDate bool      `json:"-"` // set by handler when client sends due_date: null
	Priority    *string    `json:"priority"`
	IsCompleted *bool      `json:"is_completed"`
	OrderIndex  *int       `json:"order_index"`
	SectionID   *string    `json:"section_id"`
}

func (r *TaskRepo) Update(ctx context.Context, id, userID string, upd TaskUpdate) (*model.Task, error) {
	// Verify ownership
	_, err := r.GetByID(ctx, id, userID)
	if err != nil {
		return nil, ErrNotFound
	}

	// If moving to a new section, verify target section ownership
	if upd.SectionID != nil {
		var ownerID string
		err := r.pool.QueryRow(ctx, `SELECT user_id FROM sections WHERE id = $1`, *upd.SectionID).Scan(&ownerID)
		if err != nil || ownerID != userID {
			return nil, ErrNotFound
		}
	}

	var t model.Task
	err = r.pool.QueryRow(ctx,
		`UPDATE tasks SET
			title = COALESCE($3, title),
			description = COALESCE($4, description),
			due_date = CASE WHEN $10 = true THEN NULL ELSE COALESCE($5, due_date) END,
			priority = COALESCE($6, priority),
			is_completed = COALESCE($7, is_completed),
			completed_at = CASE
				WHEN $7 = true AND is_completed = false THEN NOW()
				WHEN $7 = false AND is_completed = true THEN NULL
				ELSE completed_at
			END,
			order_index = COALESCE($8, order_index),
			section_id = COALESCE($9, section_id),
			updated_at = NOW()
		 WHERE id = $1 AND section_id IN (SELECT id FROM sections WHERE user_id = $2)
		 RETURNING id, section_id, title, description, due_date, priority,
		           is_completed, completed_at, order_index, created_at, updated_at`,
		id, userID, upd.Title, upd.Description, upd.DueDate, upd.Priority,
		upd.IsCompleted, upd.OrderIndex, upd.SectionID, upd.ClearDueDate,
	).Scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate,
		&t.Priority, &t.IsCompleted, &t.CompletedAt, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt)
	return &t, err
}

func (r *TaskRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM tasks WHERE id = $1 AND section_id IN (SELECT id FROM sections WHERE user_id = $2)`,
		id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
```

- [ ] **Step 2: Create task handler**

`server/internal/handler/task.go`:
```go
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type TaskHandler struct {
	tasks *repository.TaskRepo
}

func NewTaskHandler(tasks *repository.TaskRepo) *TaskHandler {
	return &TaskHandler{tasks: tasks}
}

func (h *TaskHandler) ListBySection(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	sectionID := r.PathValue("sectionId")

	tasks, err := h.tasks.ListBySection(r.Context(), sectionID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list tasks")
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (h *TaskHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	task, err := h.tasks.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	writeJSON(w, http.StatusOK, task)
}

type createTaskRequest struct {
	SectionID   string  `json:"section_id"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
	DueDate     *string `json:"due_date"`
	Priority    string  `json:"priority"`
}

func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.SectionID == "" || req.Title == "" {
		writeError(w, http.StatusBadRequest, "section_id and title are required")
		return
	}

	var dueDate *time.Time
	if req.DueDate != nil {
		t, err := time.Parse(time.RFC3339, *req.DueDate)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid due_date format, use RFC3339")
			return
		}
		dueDate = &t
	}

	task, err := h.tasks.Create(r.Context(), userID, req.SectionID, req.Title, req.Description, dueDate, req.Priority)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "section not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create task")
		return
	}
	writeJSON(w, http.StatusCreated, task)
}

type updateTaskRequest struct {
	Title       *string         `json:"title"`
	Description *string         `json:"description"`
	DueDate     json.RawMessage `json:"due_date"` // string or null
	Priority    *string         `json:"priority"`
	IsCompleted *bool           `json:"is_completed"`
	OrderIndex  *int            `json:"order_index"`
	SectionID   *string         `json:"section_id"`
}

func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	var req updateTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	upd := repository.TaskUpdate{
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		IsCompleted: req.IsCompleted,
		OrderIndex:  req.OrderIndex,
		SectionID:   req.SectionID,
	}

	// Handle due_date: explicit null clears, string parses, absent keeps
	if req.DueDate != nil {
		if string(req.DueDate) == "null" {
			upd.ClearDueDate = true
		} else {
			var dateStr string
			if err := json.Unmarshal(req.DueDate, &dateStr); err != nil {
				writeError(w, http.StatusBadRequest, "invalid due_date format")
				return
			}
			t, err := time.Parse(time.RFC3339, dateStr)
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid due_date format, use RFC3339")
				return
			}
			upd.DueDate = &t
		}
	}

	task, err := h.tasks.Update(r.Context(), id, userID, upd)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update task")
		return
	}
	writeJSON(w, http.StatusOK, task)
}

func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	err := h.tasks.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete task")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 3: Wire task routes in main.go**

Add to `server/cmd/server/main.go`:
```go
taskRepo := repository.NewTaskRepo(pool)
taskHandler := handler.NewTaskHandler(taskRepo)
```

Add to `protected` mux:
```go
protected.HandleFunc("GET /api/v1/sections/{sectionId}/tasks", taskHandler.ListBySection)
protected.HandleFunc("GET /api/v1/tasks/{id}", taskHandler.GetByID)
protected.HandleFunc("POST /api/v1/tasks", taskHandler.Create)
protected.HandleFunc("PATCH /api/v1/tasks/{id}", taskHandler.Update)
protected.HandleFunc("DELETE /api/v1/tasks/{id}", taskHandler.Delete)
```

- [ ] **Step 4: Verify it compiles**

```bash
cd server && go build ./cmd/server/
```

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat(server): add tasks CRUD endpoints"
```

---

## Chunk 4: Sub-tasks, Reminders, and Vite Proxy (Tasks 7-9)

### Task 7: Sub-tasks CRUD

**Files:**
- Create: `server/internal/repository/subtask.go`
- Create: `server/internal/handler/subtask.go`
- Modify: `server/cmd/server/main.go` (register subtask routes)

- [ ] **Step 1: Create subtask repository**

`server/internal/repository/subtask.go`:
```go
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type SubTaskRepo struct {
	pool *pgxpool.Pool
}

func NewSubTaskRepo(pool *pgxpool.Pool) *SubTaskRepo {
	return &SubTaskRepo{pool: pool}
}

func (r *SubTaskRepo) ListByTask(ctx context.Context, taskID, userID string) ([]model.SubTask, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT st.id, st.task_id, st.title, st.is_completed, st.completed_at, st.order_index, st.created_at, st.updated_at
		 FROM sub_tasks st
		 JOIN tasks t ON t.id = st.task_id
		 JOIN sections s ON s.id = t.section_id
		 WHERE st.task_id = $1 AND s.user_id = $2
		 ORDER BY st.order_index`, taskID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subtasks []model.SubTask
	for rows.Next() {
		var st model.SubTask
		if err := rows.Scan(&st.ID, &st.TaskID, &st.Title, &st.IsCompleted, &st.CompletedAt,
			&st.OrderIndex, &st.CreatedAt, &st.UpdatedAt); err != nil {
			return nil, err
		}
		subtasks = append(subtasks, st)
	}
	if subtasks == nil {
		subtasks = []model.SubTask{}
	}
	return subtasks, rows.Err()
}

func (r *SubTaskRepo) Create(ctx context.Context, userID, taskID, title string) (*model.SubTask, error) {
	// Verify task ownership
	var ownerID string
	err := r.pool.QueryRow(ctx,
		`SELECT s.user_id FROM tasks t JOIN sections s ON s.id = t.section_id WHERE t.id = $1`, taskID,
	).Scan(&ownerID)
	if err != nil || ownerID != userID {
		return nil, ErrNotFound
	}

	var st model.SubTask
	err = r.pool.QueryRow(ctx,
		`INSERT INTO sub_tasks (task_id, title, order_index)
		 VALUES ($1, $2, COALESCE((SELECT MAX(order_index) + 1 FROM sub_tasks WHERE task_id = $1), 0))
		 RETURNING id, task_id, title, is_completed, completed_at, order_index, created_at, updated_at`,
		taskID, title,
	).Scan(&st.ID, &st.TaskID, &st.Title, &st.IsCompleted, &st.CompletedAt,
		&st.OrderIndex, &st.CreatedAt, &st.UpdatedAt)
	return &st, err
}

func (r *SubTaskRepo) Update(ctx context.Context, id, userID string, title *string, isCompleted *bool, orderIndex *int) (*model.SubTask, error) {
	var st model.SubTask
	err := r.pool.QueryRow(ctx,
		`UPDATE sub_tasks SET
			title = COALESCE($3, title),
			is_completed = COALESCE($4, is_completed),
			completed_at = CASE
				WHEN $4 = true AND is_completed = false THEN NOW()
				WHEN $4 = false AND is_completed = true THEN NULL
				ELSE completed_at
			END,
			order_index = COALESCE($5, order_index),
			updated_at = NOW()
		 WHERE id = $1 AND task_id IN (
			SELECT t.id FROM tasks t JOIN sections s ON s.id = t.section_id WHERE s.user_id = $2
		 )
		 RETURNING id, task_id, title, is_completed, completed_at, order_index, created_at, updated_at`,
		id, userID, title, isCompleted, orderIndex,
	).Scan(&st.ID, &st.TaskID, &st.Title, &st.IsCompleted, &st.CompletedAt,
		&st.OrderIndex, &st.CreatedAt, &st.UpdatedAt)
	if err != nil {
		return nil, ErrNotFound
	}
	return &st, nil
}

func (r *SubTaskRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM sub_tasks WHERE id = $1 AND task_id IN (
			SELECT t.id FROM tasks t JOIN sections s ON s.id = t.section_id WHERE s.user_id = $2
		)`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
```

- [ ] **Step 2: Create subtask handler**

`server/internal/handler/subtask.go`:
```go
package handler

import (
	"errors"
	"net/http"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type SubTaskHandler struct {
	subtasks *repository.SubTaskRepo
}

func NewSubTaskHandler(subtasks *repository.SubTaskRepo) *SubTaskHandler {
	return &SubTaskHandler{subtasks: subtasks}
}

func (h *SubTaskHandler) ListByTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := r.PathValue("taskId")

	subtasks, err := h.subtasks.ListByTask(r.Context(), taskID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list subtasks")
		return
	}
	writeJSON(w, http.StatusOK, subtasks)
}

type createSubTaskRequest struct {
	TaskID string `json:"task_id"`
	Title  string `json:"title"`
}

func (h *SubTaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createSubTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.TaskID == "" || req.Title == "" {
		writeError(w, http.StatusBadRequest, "task_id and title are required")
		return
	}

	subtask, err := h.subtasks.Create(r.Context(), userID, req.TaskID, req.Title)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create subtask")
		return
	}
	writeJSON(w, http.StatusCreated, subtask)
}

type updateSubTaskRequest struct {
	Title       *string `json:"title"`
	IsCompleted *bool   `json:"is_completed"`
	OrderIndex  *int    `json:"order_index"`
}

func (h *SubTaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	var req updateSubTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	subtask, err := h.subtasks.Update(r.Context(), id, userID, req.Title, req.IsCompleted, req.OrderIndex)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "subtask not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update subtask")
		return
	}
	writeJSON(w, http.StatusOK, subtask)
}

func (h *SubTaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	err := h.subtasks.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "subtask not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete subtask")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 3: Wire subtask routes in main.go**

Add to `server/cmd/server/main.go`:
```go
subtaskRepo := repository.NewSubTaskRepo(pool)
subtaskHandler := handler.NewSubTaskHandler(subtaskRepo)
```

Add to `protected` mux:
```go
protected.HandleFunc("GET /api/v1/tasks/{taskId}/subtasks", subtaskHandler.ListByTask)
protected.HandleFunc("POST /api/v1/subtasks", subtaskHandler.Create)
protected.HandleFunc("PATCH /api/v1/subtasks/{id}", subtaskHandler.Update)
protected.HandleFunc("DELETE /api/v1/subtasks/{id}", subtaskHandler.Delete)
```

- [ ] **Step 4: Verify it compiles**

```bash
cd server && go build ./cmd/server/
```

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat(server): add sub-tasks CRUD endpoints"
```

---

### Task 8: Reminders CRUD

**Files:**
- Create: `server/internal/repository/reminder.go`
- Create: `server/internal/handler/reminder.go`
- Modify: `server/cmd/server/main.go` (register reminder routes)

- [ ] **Step 1: Create reminder repository**

`server/internal/repository/reminder.go`:
```go
package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type ReminderRepo struct {
	pool *pgxpool.Pool
}

func NewReminderRepo(pool *pgxpool.Pool) *ReminderRepo {
	return &ReminderRepo{pool: pool}
}

func (r *ReminderRepo) ListByTask(ctx context.Context, taskID, userID string) ([]model.Reminder, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT rm.id, rm.task_id, rm.remind_at, rm.is_sent, rm.created_at
		 FROM reminders rm
		 JOIN tasks t ON t.id = rm.task_id
		 JOIN sections s ON s.id = t.section_id
		 WHERE rm.task_id = $1 AND s.user_id = $2
		 ORDER BY rm.remind_at`, taskID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reminders []model.Reminder
	for rows.Next() {
		var rm model.Reminder
		if err := rows.Scan(&rm.ID, &rm.TaskID, &rm.RemindAt, &rm.IsSent, &rm.CreatedAt); err != nil {
			return nil, err
		}
		reminders = append(reminders, rm)
	}
	if reminders == nil {
		reminders = []model.Reminder{}
	}
	return reminders, rows.Err()
}

func (r *ReminderRepo) Create(ctx context.Context, userID, taskID string, remindAt time.Time) (*model.Reminder, error) {
	// Verify task ownership
	var ownerID string
	err := r.pool.QueryRow(ctx,
		`SELECT s.user_id FROM tasks t JOIN sections s ON s.id = t.section_id WHERE t.id = $1`, taskID,
	).Scan(&ownerID)
	if err != nil || ownerID != userID {
		return nil, ErrNotFound
	}

	var rm model.Reminder
	err = r.pool.QueryRow(ctx,
		`INSERT INTO reminders (task_id, remind_at)
		 VALUES ($1, $2)
		 RETURNING id, task_id, remind_at, is_sent, created_at`,
		taskID, remindAt,
	).Scan(&rm.ID, &rm.TaskID, &rm.RemindAt, &rm.IsSent, &rm.CreatedAt)
	return &rm, err
}

func (r *ReminderRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM reminders WHERE id = $1 AND task_id IN (
			SELECT t.id FROM tasks t JOIN sections s ON s.id = t.section_id WHERE s.user_id = $2
		)`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
```

- [ ] **Step 2: Create reminder handler**

`server/internal/handler/reminder.go`:
```go
package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type ReminderHandler struct {
	reminders *repository.ReminderRepo
}

func NewReminderHandler(reminders *repository.ReminderRepo) *ReminderHandler {
	return &ReminderHandler{reminders: reminders}
}

func (h *ReminderHandler) ListByTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := r.PathValue("taskId")

	reminders, err := h.reminders.ListByTask(r.Context(), taskID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list reminders")
		return
	}
	writeJSON(w, http.StatusOK, reminders)
}

type createReminderRequest struct {
	TaskID   string `json:"task_id"`
	RemindAt string `json:"remind_at"`
}

func (h *ReminderHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createReminderRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.TaskID == "" || req.RemindAt == "" {
		writeError(w, http.StatusBadRequest, "task_id and remind_at are required")
		return
	}

	remindAt, err := time.Parse(time.RFC3339, req.RemindAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid remind_at format, use RFC3339")
		return
	}

	reminder, err := h.reminders.Create(r.Context(), userID, req.TaskID, remindAt)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create reminder")
		return
	}
	writeJSON(w, http.StatusCreated, reminder)
}

func (h *ReminderHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	err := h.reminders.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "reminder not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete reminder")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 3: Wire reminder routes in main.go**

Add to `server/cmd/server/main.go`:
```go
reminderRepo := repository.NewReminderRepo(pool)
reminderHandler := handler.NewReminderHandler(reminderRepo)
```

Add to `protected` mux:
```go
protected.HandleFunc("GET /api/v1/tasks/{taskId}/reminders", reminderHandler.ListByTask)
protected.HandleFunc("POST /api/v1/reminders", reminderHandler.Create)
protected.HandleFunc("DELETE /api/v1/reminders/{id}", reminderHandler.Delete)
```

- [ ] **Step 4: Verify it compiles**

```bash
cd server && go build ./cmd/server/
```

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat(server): add reminders CRUD endpoints"
```

---

### Task 9: Vite proxy configuration

**Files:**
- Modify: `web/vite.config.ts`

- [ ] **Step 1: Read current vite config**

Read `web/vite.config.ts` to see existing content.

- [ ] **Step 2: Add proxy config**

Add a `server.proxy` entry to the Vite config:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
},
```

- [ ] **Step 3: Commit**

```bash
git add web/vite.config.ts
git commit -m "feat(web): add Vite proxy for /api to Go backend"
```

---

### Task 10: End-to-end smoke test

- [ ] **Step 1: Start the Go server**

```bash
cd server && DATABASE_URL="postgres://zhafrantharif@localhost:5432/personal_todo?sslmode=disable" JWT_SECRET="dev-secret" go run ./cmd/server/ &
```

- [ ] **Step 2: Test full CRUD flow with curl**

```bash
# Register
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@test.com","password":"pass123","name":"Smoke Test"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# GET /me
curl -s http://localhost:8080/api/v1/me -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Create section
SECTION_ID=$(curl -s -X POST http://localhost:8080/api/v1/sections \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Work"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# List sections
curl -s http://localhost:8080/api/v1/sections -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Create task
TASK_ID=$(curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"section_id\":\"$SECTION_ID\",\"title\":\"My first task\",\"priority\":\"high\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# List tasks
curl -s "http://localhost:8080/api/v1/sections/$SECTION_ID/tasks" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Toggle complete
curl -s -X PATCH "http://localhost:8080/api/v1/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"is_completed":true}' | python3 -m json.tool

# Create subtask
curl -s -X POST http://localhost:8080/api/v1/subtasks \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"task_id\":\"$TASK_ID\",\"title\":\"Sub item\"}" | python3 -m json.tool

# Create reminder
curl -s -X POST http://localhost:8080/api/v1/reminders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"task_id\":\"$TASK_ID\",\"remind_at\":\"2026-03-18T09:00:00Z\"}" | python3 -m json.tool

# Cleanup
kill %1
```

Expected: All responses return valid JSON with correct shapes.

- [ ] **Step 3: Clean up test data**

```bash
psql personal_todo -c "DELETE FROM users WHERE email = 'smoke@test.com';"
psql personal_todo -c "DELETE FROM users WHERE email = 'test@test.com';"
```
