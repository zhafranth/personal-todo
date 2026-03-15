# Fase 1: Core Backend & Mobile UI — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Skill directives:**
> - All Backend tasks: invoke `/senior-backend` before implementation
> - All Frontend design/slicing tasks: invoke `/frontend-design` before implementation
> - All Frontend development tasks: invoke `/senior-frontend` before implementation

**Goal:** Build the core backend API (Go) with Google OAuth, PostgreSQL schema, and CRUD endpoints, plus a mobile-first React SPA with task management UI.

**Architecture:** Go REST API server with PostgreSQL (pgx, raw SQL). React SPA (Vite) with Zustand for state, TanStack Query for data fetching, Tailwind CSS for styling. Google OAuth 2.0 for authentication. Backend serves API on `/api/v1/*`, frontend is a separate Vite build.

**Tech Stack:** Go, pgx, PostgreSQL, Vite, React, TypeScript, Zustand, TanStack Query, Tailwind CSS, Google OAuth 2.0

---

## File Structure

### Backend (`server/`)

```
server/
├── cmd/
│   └── api/
│       └── main.go                  # Entry point, server bootstrap
├── internal/
│   ├── config/
│   │   └── config.go               # Env/config loading
│   ├── database/
│   │   └── postgres.go             # DB connection pool setup
│   ├── middleware/
│   │   ├── auth.go                 # JWT auth middleware
│   │   └── cors.go                 # CORS middleware
│   ├── auth/
│   │   ├── handler.go              # OAuth login/callback handlers
│   │   ├── jwt.go                  # JWT token creation/validation
│   │   └── google.go              # Google OAuth client logic
│   ├── user/
│   │   ├── repository.go           # User DB queries
│   │   └── model.go                # User struct
│   ├── section/
│   │   ├── handler.go              # Section CRUD handlers
│   │   ├── repository.go           # Section DB queries
│   │   └── model.go                # Section struct
│   ├── task/
│   │   ├── handler.go              # Task CRUD handlers
│   │   ├── repository.go           # Task DB queries
│   │   └── model.go                # Task struct
│   └── subtask/
│       ├── handler.go              # Sub-task CRUD handlers
│       ├── repository.go           # Sub-task DB queries
│       └── model.go                # Sub-task struct
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_sections.sql
│   ├── 003_create_tasks.sql
│   ├── 004_create_subtasks.sql
│   └── 005_create_reminders_and_push.sql
├── go.mod
└── go.sum
```

### Frontend (`web/`)

```
web/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── manifest.json
├── src/
│   ├── main.tsx                     # App entry point
│   ├── App.tsx                      # Router + layout shell
│   ├── api/
│   │   └── client.ts                # Axios/fetch wrapper with auth
│   ├── stores/
│   │   └── auth-store.ts            # Zustand auth state
│   ├── hooks/
│   │   ├── use-sections.ts          # TanStack Query hooks for sections
│   │   ├── use-tasks.ts             # TanStack Query hooks for tasks
│   │   └── use-subtasks.ts          # TanStack Query hooks for subtasks
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript types
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx        # Bottom navigation bar
│   │   │   ├── AppShell.tsx         # Main layout wrapper
│   │   │   └── FAB.tsx              # Floating action button
│   │   ├── sections/
│   │   │   ├── SectionList.tsx      # List of sections
│   │   │   ├── SectionItem.tsx      # Single section row
│   │   │   └── SectionForm.tsx      # Create/edit section modal
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx         # List of tasks within a section
│   │   │   ├── TaskItem.tsx         # Single task row with swipe
│   │   │   ├── TaskForm.tsx         # Create/edit task modal/sheet
│   │   │   └── TaskDetail.tsx       # Task detail view with subtasks
│   │   └── subtasks/
│   │       ├── SubtaskList.tsx      # List of subtasks
│   │       └── SubtaskItem.tsx      # Single subtask checkbox row
│   ├── pages/
│   │   ├── TasksPage.tsx            # Main tasks view (sections + tasks)
│   │   ├── CalendarPage.tsx         # Placeholder for Fase 3
│   │   ├── SettingsPage.tsx         # Placeholder settings page
│   │   └── LoginPage.tsx            # OAuth login page
│   └── lib/
│       └── utils.ts                 # Shared utility functions
└── tests/                           # Vitest test files (mirrors src/)
```

---

## Chunk 1: Backend Foundation

### Task BE-1: Project Scaffolding & Database Schema

**Skill:** `@senior-backend`

**Files:**
- Create: `server/go.mod`
- Create: `server/cmd/api/main.go`
- Create: `server/internal/config/config.go`
- Create: `server/internal/database/postgres.go`
- Create: `server/migrations/001_create_users.sql`
- Create: `server/migrations/002_create_sections.sql`
- Create: `server/migrations/003_create_tasks.sql`
- Create: `server/migrations/004_create_subtasks.sql`
- Create: `server/migrations/005_create_reminders_and_push.sql`

- [ ] **Step 1: Initialize Go module**

```bash
cd server && go mod init github.com/zhafrantharif/personal-todo
```

- [ ] **Step 2: Create config loader**

Create `server/internal/config/config.go`:
```go
package config

import "os"

type Config struct {
	Port         string
	DatabaseURL  string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	JWTSecret    string
	FrontendURL  string
}

func Load() *Config {
	return &Config{
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://localhost:5432/personal_todo?sslmode=disable"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:5173"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
```

- [ ] **Step 3: Create database connection**

Create `server/internal/database/postgres.go`:
```go
package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}
	return pool, nil
}
```

- [ ] **Step 4: Write migration SQL files**

Create `server/migrations/001_create_users.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    oauth_provider VARCHAR(50) NOT NULL,
    oauth_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
```

Create `server/migrations/002_create_sections.sql`:
```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_user ON sections(user_id);
```

Create `server/migrations/003_create_tasks.sql`:
```sql
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority task_priority NOT NULL DEFAULT 'medium',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_section ON tasks(section_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
```

Create `server/migrations/004_create_subtasks.sql`:
```sql
CREATE TABLE sub_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subtasks_task ON sub_tasks(task_id);
```

Create `server/migrations/005_create_reminders_and_push.sql`:
```sql
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_task ON reminders(task_id);
CREATE INDEX idx_reminders_pending ON reminders(remind_at) WHERE is_sent = FALSE;

CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
```

- [ ] **Step 5: Create main.go entry point (minimal, just boots and connects to DB)**

Create `server/cmd/api/main.go`:
```go
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/zhafrantharif/personal-todo/internal/config"
	"github.com/zhafrantharif/personal-todo/internal/database"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	srv.Shutdown(shutdownCtx)
	log.Println("Server stopped")
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd server && go get github.com/jackc/pgx/v5
```

- [ ] **Step 7: Verify it compiles**

```bash
cd server && go build ./cmd/api/
```

- [ ] **Step 8: Run migrations against local PostgreSQL**

```bash
cd server && for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

- [ ] **Step 9: Commit**

```bash
git add server/
git commit -m "feat(be): scaffold Go project with config, DB connection, and migrations"
```

---

### Task BE-2: Google OAuth Authentication

**Skill:** `@senior-backend`

**Files:**
- Create: `server/internal/auth/google.go`
- Create: `server/internal/auth/jwt.go`
- Create: `server/internal/auth/handler.go`
- Create: `server/internal/user/model.go`
- Create: `server/internal/user/repository.go`
- Create: `server/internal/middleware/auth.go`
- Create: `server/internal/middleware/cors.go`
- Modify: `server/cmd/api/main.go`

- [ ] **Step 1: Create User model**

Create `server/internal/user/model.go`:
```go
package user

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	AvatarURL     *string   `json:"avatar_url,omitempty"`
	OAuthProvider string    `json:"-"`
	OAuthID       string    `json:"-"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
```

- [ ] **Step 2: Create User repository**

Create `server/internal/user/repository.go`:
```go
package user

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindByOAuth(ctx context.Context, provider, oauthID string) (*User, error) {
	var u User
	err := r.db.QueryRow(ctx,
		`SELECT id, email, name, avatar_url, oauth_provider, oauth_id, created_at, updated_at
		 FROM users WHERE oauth_provider = $1 AND oauth_id = $2`, provider, oauthID,
	).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.OAuthProvider, &u.OAuthID, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) Upsert(ctx context.Context, email, name, avatarURL, provider, oauthID string) (*User, error) {
	var u User
	err := r.db.QueryRow(ctx,
		`INSERT INTO users (email, name, avatar_url, oauth_provider, oauth_id)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (oauth_provider, oauth_id)
		 DO UPDATE SET email = $1, name = $2, avatar_url = $3, updated_at = NOW()
		 RETURNING id, email, name, avatar_url, oauth_provider, oauth_id, created_at, updated_at`,
		email, name, avatarURL, provider, oauthID,
	).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.OAuthProvider, &u.OAuthID, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("upsert user: %w", err)
	}
	return &u, nil
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var u User
	err := r.db.QueryRow(ctx,
		`SELECT id, email, name, avatar_url, oauth_provider, oauth_id, created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.OAuthProvider, &u.OAuthID, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}
```

- [ ] **Step 3: Create JWT utilities**

Create `server/internal/auth/jwt.go`:
```go
package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uuid.UUID, secret string) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}
```

- [ ] **Step 4: Create Google OAuth client**

Create `server/internal/auth/google.go`:
```go
package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type GoogleUser struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func NewGoogleOAuthConfig(clientID, clientSecret, redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

func FetchGoogleUser(ctx context.Context, cfg *oauth2.Config, code string) (*GoogleUser, error) {
	token, err := cfg.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}

	client := cfg.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("fetch user info: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var gu GoogleUser
	if err := json.Unmarshal(body, &gu); err != nil {
		return nil, fmt.Errorf("unmarshal user: %w", err)
	}
	return &gu, nil
}
```

- [ ] **Step 5: Create auth handler (login redirect + callback)**

Create `server/internal/auth/handler.go`:
```go
package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"github.com/zhafrantharif/personal-todo/internal/config"
	"github.com/zhafrantharif/personal-todo/internal/middleware"
	"github.com/zhafrantharif/personal-todo/internal/user"
	"golang.org/x/oauth2"
)

type Handler struct {
	oauthCfg *oauth2.Config
	userRepo *user.Repository
	cfg      *config.Config
}

func NewHandler(oauthCfg *oauth2.Config, userRepo *user.Repository, cfg *config.Config) *Handler {
	return &Handler{oauthCfg: oauthCfg, userRepo: userRepo, cfg: cfg}
}

func (h *Handler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	state := generateState()
	// In production, store state in a cookie for CSRF validation
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   600,
	})
	url := h.oauthCfg.AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (h *Handler) HandleCallback(w http.ResponseWriter, r *http.Request) {
	// Validate state
	cookie, err := r.Cookie("oauth_state")
	if err != nil || cookie.Value != r.URL.Query().Get("state") {
		http.Error(w, "invalid state", http.StatusBadRequest)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "missing code", http.StatusBadRequest)
		return
	}

	gu, err := FetchGoogleUser(r.Context(), h.oauthCfg, code)
	if err != nil {
		http.Error(w, "oauth failed", http.StatusInternalServerError)
		return
	}

	u, err := h.userRepo.Upsert(r.Context(), gu.Email, gu.Name, gu.Picture, "google", gu.ID)
	if err != nil {
		http.Error(w, "user creation failed", http.StatusInternalServerError)
		return
	}

	token, err := GenerateToken(u.ID, h.cfg.JWTSecret)
	if err != nil {
		http.Error(w, "token generation failed", http.StatusInternalServerError)
		return
	}

	// Redirect to frontend with token
	http.Redirect(w, r, h.cfg.FrontendURL+"/auth/callback?token="+token, http.StatusTemporaryRedirect)
}

func (h *Handler) HandleMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	u, err := h.userRepo.FindByID(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}

func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
```

- [ ] **Step 6: Create auth middleware**

Create `server/internal/middleware/auth.go`:
```go
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/zhafrantharif/personal-todo/internal/auth"
)

type contextKey string

const ContextKeyUserID contextKey = "user_id"

func Auth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, `{"error":"missing authorization"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(header, "Bearer ")
			claims, err := auth.ValidateToken(tokenStr, jwtSecret)
			if err != nil {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) uuid.UUID {
	return ctx.Value(ContextKeyUserID).(uuid.UUID)
}
```

- [ ] **Step 7: Create CORS middleware**

Create `server/internal/middleware/cors.go`:
```go
package middleware

import "net/http"

func CORS(frontendURL string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", frontendURL)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
```

- [ ] **Step 8: Wire auth routes into main.go**

Replace the entire `server/cmd/api/main.go` with:
```go
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/zhafrantharif/personal-todo/internal/auth"
	"github.com/zhafrantharif/personal-todo/internal/config"
	"github.com/zhafrantharif/personal-todo/internal/database"
	"github.com/zhafrantharif/personal-todo/internal/middleware"
	"github.com/zhafrantharif/personal-todo/internal/user"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	userRepo := user.NewRepository(pool)
	oauthCfg := auth.NewGoogleOAuthConfig(cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleRedirectURL)
	authHandler := auth.NewHandler(oauthCfg, userRepo, cfg)

	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("GET /api/v1/auth/google/login", authHandler.HandleLogin)
	mux.HandleFunc("GET /api/v1/auth/google/callback", authHandler.HandleCallback)

	// Protected route
	authMw := middleware.Auth(cfg.JWTSecret)
	mux.Handle("GET /api/v1/auth/me", authMw(http.HandlerFunc(authHandler.HandleMe)))

	// Apply CORS
	handler := middleware.CORS(cfg.FrontendURL)(mux)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: handler,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	srv.Shutdown(shutdownCtx)
	log.Println("Server stopped")
}
```

- [ ] **Step 9: Install new dependencies**

```bash
cd server && go get github.com/google/uuid github.com/golang-jwt/jwt/v5 golang.org/x/oauth2
```

- [ ] **Step 10: Verify it compiles**

```bash
cd server && go build ./cmd/api/
```

- [ ] **Step 11: Commit**

```bash
git add server/
git commit -m "feat(be): add Google OAuth login, JWT auth, and CORS middleware"
```

---

### Task BE-3: Section CRUD API

**Skill:** `@senior-backend`

**Files:**
- Create: `server/internal/section/model.go`
- Create: `server/internal/section/repository.go`
- Create: `server/internal/section/handler.go`
- Modify: `server/cmd/api/main.go`

- [ ] **Step 1: Create Section model**

Create `server/internal/section/model.go`:
```go
package section

import (
	"time"

	"github.com/google/uuid"
)

type Section struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	Title      string    `json:"title"`
	OrderIndex int       `json:"order_index"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type CreateRequest struct {
	Title string `json:"title"`
}

type UpdateRequest struct {
	Title      *string `json:"title,omitempty"`
	OrderIndex *int    `json:"order_index,omitempty"`
}
```

- [ ] **Step 2: Create Section repository**

Create `server/internal/section/repository.go`:
```go
package section

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListByUser(ctx context.Context, userID uuid.UUID) ([]Section, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, title, order_index, created_at, updated_at
		 FROM sections WHERE user_id = $1 ORDER BY order_index`, userID)
	if err != nil {
		return nil, fmt.Errorf("list sections: %w", err)
	}
	defer rows.Close()

	var sections []Section
	for rows.Next() {
		var s Section
		if err := rows.Scan(&s.ID, &s.UserID, &s.Title, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan section: %w", err)
		}
		sections = append(sections, s)
	}
	return sections, nil
}

func (r *Repository) Create(ctx context.Context, userID uuid.UUID, title string) (*Section, error) {
	var s Section
	err := r.db.QueryRow(ctx,
		`INSERT INTO sections (user_id, title, order_index)
		 VALUES ($1, $2, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM sections WHERE user_id = $1))
		 RETURNING id, user_id, title, order_index, created_at, updated_at`,
		userID, title,
	).Scan(&s.ID, &s.UserID, &s.Title, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create section: %w", err)
	}
	return &s, nil
}

func (r *Repository) Update(ctx context.Context, id, userID uuid.UUID, req UpdateRequest) (*Section, error) {
	var s Section
	err := r.db.QueryRow(ctx,
		`UPDATE sections SET
			title = COALESCE($3, title),
			order_index = COALESCE($4, order_index),
			updated_at = NOW()
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, title, order_index, created_at, updated_at`,
		id, userID, req.Title, req.OrderIndex,
	).Scan(&s.ID, &s.UserID, &s.Title, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update section: %w", err)
	}
	return &s, nil
}

func (r *Repository) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM sections WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete section: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("section not found")
	}
	return nil
}
```

- [ ] **Step 3: Create Section handler**

Create `server/internal/section/handler.go`:
```go
package section

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/zhafrantharif/personal-todo/internal/middleware"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	sections, err := h.repo.ListByUser(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"failed to list sections"}`, http.StatusInternalServerError)
		return
	}
	if sections == nil {
		sections = []Section{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sections)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		http.Error(w, `{"error":"title is required"}`, http.StatusBadRequest)
		return
	}
	s, err := h.repo.Create(r.Context(), userID, req.Title)
	if err != nil {
		http.Error(w, `{"error":"failed to create section"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(s)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, `{"error":"invalid section id"}`, http.StatusBadRequest)
		return
	}
	var req UpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	s, err := h.repo.Update(r.Context(), id, userID, req)
	if err != nil {
		http.Error(w, `{"error":"failed to update section"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, `{"error":"invalid section id"}`, http.StatusBadRequest)
		return
	}
	if err := h.repo.Delete(r.Context(), id, userID); err != nil {
		http.Error(w, `{"error":"failed to delete section"}`, http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 4: Register section routes in main.go**

Add to `server/cmd/api/main.go` — import `section` package and add after existing protected routes:
```go
// In main(), after authHandler setup:
sectionRepo := section.NewRepository(pool)
sectionHandler := section.NewHandler(sectionRepo)

// After existing mux.Handle lines, add:
mux.Handle("GET /api/v1/sections", authMw(http.HandlerFunc(sectionHandler.List)))
mux.Handle("POST /api/v1/sections", authMw(http.HandlerFunc(sectionHandler.Create)))
mux.Handle("PATCH /api/v1/sections/{id}", authMw(http.HandlerFunc(sectionHandler.Update)))
mux.Handle("DELETE /api/v1/sections/{id}", authMw(http.HandlerFunc(sectionHandler.Delete)))
```

- [ ] **Step 5: Verify it compiles**

```bash
cd server && go build ./cmd/api/
```

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat(be): add Section CRUD API endpoints"
```

---

### Task BE-4: Task CRUD API

**Skill:** `@senior-backend`

**Files:**
- Create: `server/internal/task/model.go`
- Create: `server/internal/task/repository.go`
- Create: `server/internal/task/handler.go`
- Modify: `server/cmd/api/main.go`

- [ ] **Step 1: Create Task model**

Create `server/internal/task/model.go`:
```go
package task

import (
	"time"

	"github.com/google/uuid"
)

type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
)

type Task struct {
	ID          uuid.UUID  `json:"id"`
	SectionID   uuid.UUID  `json:"section_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	DueDate     *time.Time `json:"due_date,omitempty"`
	Priority    Priority   `json:"priority"`
	IsCompleted bool       `json:"is_completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	OrderIndex  int        `json:"order_index"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CreateRequest struct {
	SectionID   uuid.UUID  `json:"section_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	DueDate     *time.Time `json:"due_date,omitempty"`
	Priority    Priority   `json:"priority"`
}

type UpdateRequest struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	DueDate     *time.Time `json:"due_date,omitempty"`
	Priority    *Priority  `json:"priority,omitempty"`
	IsCompleted *bool      `json:"is_completed,omitempty"`
	OrderIndex  *int       `json:"order_index,omitempty"`
	SectionID   *uuid.UUID `json:"section_id,omitempty"`
}
```

- [ ] **Step 2: Create Task repository**

Create `server/internal/task/repository.go`:
```go
package task

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListBySection(ctx context.Context, sectionID uuid.UUID, userID uuid.UUID) ([]Task, error) {
	rows, err := r.db.Query(ctx,
		`SELECT t.id, t.section_id, t.title, t.description, t.due_date, t.priority, t.is_completed, t.completed_at, t.order_index, t.created_at, t.updated_at
		 FROM tasks t JOIN sections s ON t.section_id = s.id
		 WHERE t.section_id = $1 AND s.user_id = $2
		 ORDER BY t.order_index`, sectionID, userID)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate, &t.Priority, &t.IsCompleted, &t.CompletedAt, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan task: %w", err)
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*Task, error) {
	var t Task
	err := r.db.QueryRow(ctx,
		`SELECT t.id, t.section_id, t.title, t.description, t.due_date, t.priority, t.is_completed, t.completed_at, t.order_index, t.created_at, t.updated_at
		 FROM tasks t JOIN sections s ON t.section_id = s.id
		 WHERE t.id = $1 AND s.user_id = $2`, id, userID,
	).Scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate, &t.Priority, &t.IsCompleted, &t.CompletedAt, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get task: %w", err)
	}
	return &t, nil
}

func (r *Repository) Create(ctx context.Context, userID uuid.UUID, req CreateRequest) (*Task, error) {
	priority := req.Priority
	if priority == "" {
		priority = PriorityMedium
	}
	var t Task
	err := r.db.QueryRow(ctx,
		`INSERT INTO tasks (section_id, title, description, due_date, priority, order_index)
		 SELECT $1, $2, $3, $4, $5, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM tasks WHERE section_id = $1)
		 FROM sections WHERE id = $1 AND user_id = $6
		 RETURNING id, section_id, title, description, due_date, priority, is_completed, completed_at, order_index, created_at, updated_at`,
		req.SectionID, req.Title, req.Description, req.DueDate, priority, userID,
	).Scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate, &t.Priority, &t.IsCompleted, &t.CompletedAt, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create task: %w", err)
	}
	return &t, nil
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, req UpdateRequest) (*Task, error) {
	// Handle completed_at logic
	var completedAt *time.Time
	if req.IsCompleted != nil && *req.IsCompleted {
		now := time.Now()
		completedAt = &now
	}

	var t Task
	err := r.db.QueryRow(ctx,
		`UPDATE tasks SET
			title = COALESCE($2, title),
			description = COALESCE($3, description),
			due_date = COALESCE($4, due_date),
			priority = COALESCE($5, priority),
			is_completed = COALESCE($6, is_completed),
			completed_at = CASE WHEN $6 = true THEN $7 WHEN $6 = false THEN NULL ELSE completed_at END,
			order_index = COALESCE($8, order_index),
			section_id = COALESCE($9, section_id),
			updated_at = NOW()
		 WHERE id = $1
		   AND section_id IN (SELECT id FROM sections WHERE user_id = $10)
		 RETURNING id, section_id, title, description, due_date, priority, is_completed, completed_at, order_index, created_at, updated_at`,
		id, req.Title, req.Description, req.DueDate, req.Priority, req.IsCompleted, completedAt, req.OrderIndex, req.SectionID, userID,
	).Scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate, &t.Priority, &t.IsCompleted, &t.CompletedAt, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update task: %w", err)
	}
	return &t, nil
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM tasks WHERE id = $1
		 AND section_id IN (SELECT id FROM sections WHERE user_id = $2)`, id, userID)
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("task not found")
	}
	return nil
}
```

- [ ] **Step 3: Create Task handler**

Create `server/internal/task/handler.go`:
```go
package task

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/zhafrantharif/personal-todo/internal/middleware"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) ListBySection(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	sectionID, err := uuid.Parse(r.PathValue("sectionId"))
	if err != nil {
		http.Error(w, `{"error":"invalid section id"}`, http.StatusBadRequest)
		return
	}
	tasks, err := h.repo.ListBySection(r.Context(), sectionID, userID)
	if err != nil {
		http.Error(w, `{"error":"failed to list tasks"}`, http.StatusInternalServerError)
		return
	}
	if tasks == nil {
		tasks = []Task{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, `{"error":"invalid task id"}`, http.StatusBadRequest)
		return
	}
	t, err := h.repo.GetByID(r.Context(), id, userID)
	if err != nil {
		http.Error(w, `{"error":"task not found"}`, http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		http.Error(w, `{"error":"title is required"}`, http.StatusBadRequest)
		return
	}
	t, err := h.repo.Create(r.Context(), userID, req)
	if err != nil {
		http.Error(w, `{"error":"failed to create task"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, `{"error":"invalid task id"}`, http.StatusBadRequest)
		return
	}
	var req UpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	t, err := h.repo.Update(r.Context(), id, userID, req)
	if err != nil {
		http.Error(w, `{"error":"failed to update task"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, `{"error":"invalid task id"}`, http.StatusBadRequest)
		return
	}
	if err := h.repo.Delete(r.Context(), id, userID); err != nil {
		http.Error(w, `{"error":"failed to delete task"}`, http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 4: Register task routes in main.go**

Add to `server/cmd/api/main.go` — import `task` package and add:
```go
// In main(), after sectionHandler setup:
taskRepo := task.NewRepository(pool)
taskHandler := task.NewHandler(taskRepo)

// Routes:
mux.Handle("GET /api/v1/sections/{sectionId}/tasks", authMw(http.HandlerFunc(taskHandler.ListBySection)))
mux.Handle("POST /api/v1/tasks", authMw(http.HandlerFunc(taskHandler.Create)))
mux.Handle("GET /api/v1/tasks/{id}", authMw(http.HandlerFunc(taskHandler.Get)))
mux.Handle("PATCH /api/v1/tasks/{id}", authMw(http.HandlerFunc(taskHandler.Update)))
mux.Handle("DELETE /api/v1/tasks/{id}", authMw(http.HandlerFunc(taskHandler.Delete)))
```

- [ ] **Step 5: Verify it compiles**

```bash
cd server && go build ./cmd/api/
```

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat(be): add Task CRUD API endpoints"
```

---

### Task BE-5: Sub-task CRUD API

**Skill:** `@senior-backend`

**Files:**
- Create: `server/internal/subtask/model.go`
- Create: `server/internal/subtask/repository.go`
- Create: `server/internal/subtask/handler.go`
- Modify: `server/cmd/api/main.go`

- [ ] **Step 1: Create Sub-task model**

Create `server/internal/subtask/model.go`:
```go
package subtask

import (
	"time"

	"github.com/google/uuid"
)

type SubTask struct {
	ID          uuid.UUID  `json:"id"`
	TaskID      uuid.UUID  `json:"task_id"`
	Title       string     `json:"title"`
	IsCompleted bool       `json:"is_completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	OrderIndex  int        `json:"order_index"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CreateRequest struct {
	TaskID uuid.UUID `json:"task_id"`
	Title  string    `json:"title"`
}

type UpdateRequest struct {
	Title       *string `json:"title,omitempty"`
	IsCompleted *bool   `json:"is_completed,omitempty"`
	OrderIndex  *int    `json:"order_index,omitempty"`
}
```

- [ ] **Step 2: Create Sub-task repository**

Create `server/internal/subtask/repository.go`:
```go
package subtask

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListByTask(ctx context.Context, taskID uuid.UUID, userID uuid.UUID) ([]SubTask, error) {
	rows, err := r.db.Query(ctx,
		`SELECT st.id, st.task_id, st.title, st.is_completed, st.completed_at, st.order_index, st.created_at, st.updated_at
		 FROM sub_tasks st
		 JOIN tasks t ON st.task_id = t.id
		 JOIN sections s ON t.section_id = s.id
		 WHERE st.task_id = $1 AND s.user_id = $2
		 ORDER BY st.order_index`, taskID, userID)
	if err != nil {
		return nil, fmt.Errorf("list subtasks: %w", err)
	}
	defer rows.Close()

	var subtasks []SubTask
	for rows.Next() {
		var s SubTask
		if err := rows.Scan(&s.ID, &s.TaskID, &s.Title, &s.IsCompleted, &s.CompletedAt, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan subtask: %w", err)
		}
		subtasks = append(subtasks, s)
	}
	return subtasks, nil
}

func (r *Repository) Create(ctx context.Context, userID uuid.UUID, req CreateRequest) (*SubTask, error) {
	var s SubTask
	err := r.db.QueryRow(ctx,
		`INSERT INTO sub_tasks (task_id, title, order_index)
		 SELECT $1, $2, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM sub_tasks WHERE task_id = $1)
		 FROM tasks t JOIN sections s ON t.section_id = s.id
		 WHERE t.id = $1 AND s.user_id = $3
		 RETURNING id, task_id, title, is_completed, completed_at, order_index, created_at, updated_at`,
		req.TaskID, req.Title, userID,
	).Scan(&s.ID, &s.TaskID, &s.Title, &s.IsCompleted, &s.CompletedAt, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create subtask: %w", err)
	}
	return &s, nil
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, req UpdateRequest) (*SubTask, error) {
	var completedAt *time.Time
	if req.IsCompleted != nil && *req.IsCompleted {
		now := time.Now()
		completedAt = &now
	}

	var s SubTask
	err := r.db.QueryRow(ctx,
		`UPDATE sub_tasks SET
			title = COALESCE($2, title),
			is_completed = COALESCE($3, is_completed),
			completed_at = CASE WHEN $3 = true THEN $4 WHEN $3 = false THEN NULL ELSE completed_at END,
			order_index = COALESCE($5, order_index),
			updated_at = NOW()
		 WHERE id = $1
		   AND task_id IN (SELECT t.id FROM tasks t JOIN sections s ON t.section_id = s.id WHERE s.user_id = $6)
		 RETURNING id, task_id, title, is_completed, completed_at, order_index, created_at, updated_at`,
		id, req.Title, req.IsCompleted, completedAt, req.OrderIndex, userID,
	).Scan(&s.ID, &s.TaskID, &s.Title, &s.IsCompleted, &s.CompletedAt, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update subtask: %w", err)
	}
	return &s, nil
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM sub_tasks WHERE id = $1
		 AND task_id IN (SELECT t.id FROM tasks t JOIN sections s ON t.section_id = s.id WHERE s.user_id = $2)`,
		id, userID)
	if err != nil {
		return fmt.Errorf("delete subtask: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("subtask not found")
	}
	return nil
}
```

- [ ] **Step 3: Create Sub-task handler**

Create `server/internal/subtask/handler.go`:
```go
package subtask

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/zhafrantharif/personal-todo/internal/middleware"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) ListByTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID, err := uuid.Parse(r.PathValue("taskId"))
	if err != nil {
		http.Error(w, `{"error":"invalid task id"}`, http.StatusBadRequest)
		return
	}
	subtasks, err := h.repo.ListByTask(r.Context(), taskID, userID)
	if err != nil {
		http.Error(w, `{"error":"failed to list subtasks"}`, http.StatusInternalServerError)
		return
	}
	if subtasks == nil {
		subtasks = []SubTask{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(subtasks)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		http.Error(w, `{"error":"title is required"}`, http.StatusBadRequest)
		return
	}
	s, err := h.repo.Create(r.Context(), userID, req)
	if err != nil {
		http.Error(w, `{"error":"failed to create subtask"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(s)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, `{"error":"invalid subtask id"}`, http.StatusBadRequest)
		return
	}
	var req UpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	s, err := h.repo.Update(r.Context(), id, userID, req)
	if err != nil {
		http.Error(w, `{"error":"failed to update subtask"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, `{"error":"invalid subtask id"}`, http.StatusBadRequest)
		return
	}
	if err := h.repo.Delete(r.Context(), id, userID); err != nil {
		http.Error(w, `{"error":"failed to delete subtask"}`, http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 4: Register subtask routes in main.go**

Add to `server/cmd/api/main.go` — import `subtask` package and add:
```go
// In main(), after taskHandler setup:
subtaskRepo := subtask.NewRepository(pool)
subtaskHandler := subtask.NewHandler(subtaskRepo)

// Routes:
mux.Handle("GET /api/v1/tasks/{taskId}/subtasks", authMw(http.HandlerFunc(subtaskHandler.ListByTask)))
mux.Handle("POST /api/v1/subtasks", authMw(http.HandlerFunc(subtaskHandler.Create)))
mux.Handle("PATCH /api/v1/subtasks/{id}", authMw(http.HandlerFunc(subtaskHandler.Update)))
mux.Handle("DELETE /api/v1/subtasks/{id}", authMw(http.HandlerFunc(subtaskHandler.Delete)))
```

- [ ] **Step 5: Verify it compiles**

```bash
cd server && go build ./cmd/api/
```

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat(be): add Sub-task CRUD API endpoints"
```

---

## Chunk 2: Frontend Foundation

### Task FE-1: Project Scaffolding

**Skill:** `@senior-frontend`

**Files:**
- Create: `web/package.json`
- Create: `web/index.html`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Create: `web/public/manifest.json`

- [x] **Step 1: Initialize Vite + React + TypeScript project**

```bash
cd web && npm create vite@latest . -- --template react-ts
```

- [x] **Step 2: Install dependencies**

```bash
cd web && npm install zustand @tanstack/react-query react-router-dom axios
npm install -D tailwindcss @tailwindcss/vite
```

- [x] **Step 3: Configure Tailwind CSS**

Update `web/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
```

Update `web/src/index.css`:
```css
@import "tailwindcss";
```

- [x] **Step 4: Create PWA manifest**

Create `web/public/manifest.json`:
```json
{
  "name": "Personal Todo & Reminder",
  "short_name": "Todo",
  "description": "Personal task management with reminders",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [x] **Step 5: Create TypeScript types**

Create `web/src/types/index.ts`:
```ts
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  user_id: string
  title: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  section_id: string
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high'
  is_completed: boolean
  completed_at?: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface SubTask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  completed_at?: string
  order_index: number
  created_at: string
  updated_at: string
}
```

- [x] **Step 6: Create API client**

Create `web/src/api/client.ts`:
```ts
const API_BASE = '/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) =>
    request<void>(path, { method: 'DELETE' }),
}
```

- [x] **Step 7: Create auth store (Zustand)**

Create `web/src/stores/auth-store.ts`:
```ts
import { create } from 'zustand'
import type { User } from '../types'
import { api } from '../api/client'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  setToken: (token: string) => void
  fetchUser: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  setToken: (token: string) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  fetchUser: async () => {
    try {
      const user = await api.get<User>('/auth/me')
      set({ user, isLoading: false })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null, isLoading: false })
    }
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))
```

- [x] **Step 8: Create basic App with routing**

Update `web/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth-store'

const queryClient = new QueryClient()

function AuthCallback() {
  const setToken = useAuthStore((s) => s.setToken)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setToken(token)
      window.location.href = '/'
    }
  }, [setToken])
  return <div className="flex h-screen items-center justify-center">Logging in...</div>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { token, fetchUser } = useAuthStore()

  useEffect(() => {
    if (token) fetchUser()
  }, [token, fetchUser])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<div className="flex h-screen items-center justify-center"><a href="/api/v1/auth/google/login" className="rounded-lg bg-blue-500 px-6 py-3 text-white">Login with Google</a></div>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<ProtectedRoute><div>App Shell (placeholder)</div></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [x] **Step 9: Update main.tsx entry**

Update `web/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [x] **Step 10: Verify it runs**

```bash
cd web && npm run dev
```

Open browser, check login page loads at localhost:5173

- [x] **Step 11: Commit**

```bash
git add web/
git commit -m "feat(fe): scaffold Vite + React + Tailwind + Zustand + TanStack Query"
```

---

### Task FE-2: TanStack Query Hooks

**Skill:** `@senior-frontend`

**Files:**
- Create: `web/src/hooks/use-sections.ts`
- Create: `web/src/hooks/use-tasks.ts`
- Create: `web/src/hooks/use-subtasks.ts`

- [x] **Step 1: Create section hooks**

Create `web/src/hooks/use-sections.ts`:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Section } from '../types'

export function useSections() {
  return useQuery({
    queryKey: ['sections'],
    queryFn: () => api.get<Section[]>('/sections'),
  })
}

export function useCreateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => api.post<Section>('/sections', { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })
}

export function useUpdateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; order_index?: number }) =>
      api.patch<Section>(`/sections/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })
}

export function useDeleteSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })
}
```

- [x] **Step 2: Create task hooks**

Create `web/src/hooks/use-tasks.ts`:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Task } from '../types'

export function useTasks(sectionId: string) {
  return useQuery({
    queryKey: ['tasks', sectionId],
    queryFn: () => api.get<Task[]>(`/sections/${sectionId}/tasks`),
    enabled: !!sectionId,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get<Task>(`/tasks/${id}`),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { section_id: string; title: string; description?: string; due_date?: string; priority?: string }) =>
      api.post<Task>('/tasks', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.section_id] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; due_date?: string; priority?: string; is_completed?: boolean; order_index?: number; section_id?: string }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
```

- [x] **Step 3: Create subtask hooks**

Create `web/src/hooks/use-subtasks.ts`:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SubTask } from '../types'

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => api.get<SubTask[]>(`/tasks/${taskId}/subtasks`),
    enabled: !!taskId,
  })
}

export function useCreateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { task_id: string; title: string }) =>
      api.post<SubTask>('/subtasks', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['subtasks', vars.task_id] })
    },
  })
}

export function useUpdateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; is_completed?: boolean; order_index?: number }) =>
      api.patch<SubTask>(`/subtasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtasks'] }),
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/subtasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtasks'] }),
  })
}
```

- [x] **Step 4: Verify it compiles**

```bash
cd web && npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add web/src/hooks/
git commit -m "feat(fe): add TanStack Query hooks for sections, tasks, and subtasks"
```

---

### Task FE-3: Layout & Navigation Components (Design Slicing)

**Skill:** `@frontend-design` — invoke this skill to generate complete component code. Steps below describe WHAT to build; the skill produces the actual implementation.

**Files:**
- Create: `web/src/components/layout/AppShell.tsx`
- Create: `web/src/components/layout/BottomNav.tsx`
- Create: `web/src/components/layout/FAB.tsx`
- Create: `web/src/pages/TasksPage.tsx`
- Create: `web/src/pages/CalendarPage.tsx`
- Create: `web/src/pages/SettingsPage.tsx`
- Modify: `web/src/App.tsx`

**Design Requirements:**
- Mobile-first layout (max-w-lg centered on desktop)
- Bottom navigation with 3 tabs: Tasks, Calendar, Settings
- FAB (Floating Action Button) on bottom-right for quick task creation
- Clean, readable typography (Inter or system sans-serif)
- Color scheme: Blue primary (#3b82f6), neutral grays for background

- [x] **Step 1: Create BottomNav component**

Create `web/src/components/layout/BottomNav.tsx` — a fixed bottom bar with 3 icon tabs (Tasks, Calendar, Settings), highlights active route, uses react-router-dom NavLink.

- [x] **Step 2: Create FAB component**

Create `web/src/components/layout/FAB.tsx` — a floating blue circle button positioned `fixed bottom-20 right-4`, with a "+" icon, accepts `onClick` prop.

- [x] **Step 3: Create AppShell layout wrapper**

Create `web/src/components/layout/AppShell.tsx` — wraps page content with top padding, bottom padding for nav, and includes BottomNav + FAB.

- [x] **Step 4: Create placeholder pages**

Create `web/src/pages/TasksPage.tsx`, `web/src/pages/CalendarPage.tsx`, `web/src/pages/SettingsPage.tsx` — minimal placeholder pages with page title.

- [x] **Step 5: Wire up App.tsx with AppShell and page routes**

Update `web/src/App.tsx`:
- Protected routes render inside AppShell
- Routes: `/` -> TasksPage, `/calendar` -> CalendarPage, `/settings` -> SettingsPage

- [x] **Step 6: Verify visually in browser**

```bash
cd web && npm run dev
```

Open browser at localhost:5173, verify bottom nav and FAB render correctly on mobile viewport.

- [x] **Step 7: Commit**

```bash
git add web/src/
git commit -m "feat(fe): add AppShell layout with BottomNav and FAB"
```

---

### Task FE-4: Section & Task List UI

**Skill:** `@frontend-design` (for slicing — generates complete component code), then `@senior-frontend` (for wiring data)

**Files:**
- Create: `web/src/components/sections/SectionList.tsx`
- Create: `web/src/components/sections/SectionItem.tsx`
- Create: `web/src/components/sections/SectionForm.tsx`
- Create: `web/src/components/tasks/TaskList.tsx`
- Create: `web/src/components/tasks/TaskItem.tsx`
- Create: `web/src/components/tasks/TaskForm.tsx`
- Modify: `web/src/pages/TasksPage.tsx`

**Design Requirements:**
- Sections as collapsible headers/cards
- Tasks as list items with checkbox, title, priority indicator (colored dot), due date badge
- Swipe-to-complete and swipe-to-delete (touch gestures)
- TaskForm as a bottom sheet / modal for creating/editing tasks
- SectionForm as a simple inline input or modal

- [x] **Step 1: Create SectionItem component**

Renders a single section as a collapsible header: section title, task count badge, expand/collapse chevron.

- [x] **Step 2: Create TaskItem component**

Renders a single task row: checkbox (toggles is_completed), title (strikethrough when completed), priority dot (green/yellow/red), optional due date.

- [x] **Step 3: Create TaskList component**

Lists TaskItems for a given section. Uses `useTasks(sectionId)` hook. Shows empty state when no tasks.

- [x] **Step 4: Create SectionList component**

Lists SectionItems, each expanding to show its TaskList. Uses `useSections()` hook.

- [x] **Step 5: Create SectionForm component**

A simple modal/dialog for creating a new section. Input field + submit button.

- [x] **Step 6: Create TaskForm component**

A bottom sheet / modal for creating/editing a task. Fields: title, description (textarea), due date (date picker), priority (radio/select), section (dropdown). Uses `useCreateTask` or `useUpdateTask` hooks.

- [x] **Step 7: Wire TasksPage**

Update `web/src/pages/TasksPage.tsx` to render SectionList, connect FAB to open TaskForm for quick task creation.

- [x] **Step 8: Verify visually in browser**

```bash
cd web && npm run dev
```

Verify sections, tasks, create/edit flows work against the running backend.

- [x] **Step 9: Commit**

```bash
git add web/src/
git commit -m "feat(fe): add Section and Task list UI with create/edit forms"
```

---

### Task FE-5: Task Detail & Sub-tasks UI

**Skill:** `@frontend-design` (for slicing — generates complete component code), then `@senior-frontend` (for wiring data)

**Files:**
- Create: `web/src/components/tasks/TaskDetail.tsx`
- Create: `web/src/components/subtasks/SubtaskList.tsx`
- Create: `web/src/components/subtasks/SubtaskItem.tsx`
- Modify: `web/src/App.tsx` (add route)

**Design Requirements:**
- Task detail view as a full page or large bottom sheet
- Shows task title, description, due date, priority, completion status
- Below task info: sub-task list with inline add
- Each sub-task: checkbox + title, inline editing

- [x] **Step 1: Create SubtaskItem component**

Renders a single subtask: checkbox + editable title. Toggle completion calls `useUpdateSubtask`.

- [x] **Step 2: Create SubtaskList component**

Lists SubtaskItems for a task. Uses `useSubtasks(taskId)`. Includes inline "Add subtask" input at the bottom.

- [x] **Step 3: Create TaskDetail component**

Full task detail view: task info at top, SubtaskList below. Edit button opens TaskForm. Delete button with confirmation.

- [x] **Step 4: Add route for task detail**

Update `web/src/App.tsx`: add `/tasks/:id` route rendering TaskDetail inside AppShell.

- [x] **Step 5: Link TaskItem click to TaskDetail**

Update TaskItem so clicking on the title/row navigates to `/tasks/:id`.

- [x] **Step 6: Verify visually in browser**

Navigate to a task detail, add subtasks, toggle completion. Verify all works.

- [x] **Step 7: Commit**

```bash
git add web/src/
git commit -m "feat(fe): add TaskDetail view with sub-tasks"
```

---

### Task FE-6: Login Page Design

**Skill:** `@frontend-design`

**Files:**
- Create: `web/src/pages/LoginPage.tsx`
- Modify: `web/src/App.tsx`

**Design Requirements:**
- Clean, centered login page
- App logo/title at top
- "Sign in with Google" button (styled, not plain link)
- Brief tagline/description

- [x] **Step 1: Create LoginPage component**

Centered layout with app branding and a styled Google sign-in button that links to `/api/v1/auth/google/login`.

- [x] **Step 2: Replace inline login in App.tsx**

Update `web/src/App.tsx` to use LoginPage component at `/login` route.

- [x] **Step 3: Verify visually**

```bash
cd web && npm run dev
```

- [x] **Step 4: Commit**

```bash
git add web/src/
git commit -m "feat(fe): add styled Login page with Google OAuth"
```

---

## API Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/google/login` | Redirect to Google OAuth |
| GET | `/api/v1/auth/google/callback` | OAuth callback, returns JWT |
| GET | `/api/v1/auth/me` | Get current user profile |
| GET | `/api/v1/sections` | List user's sections |
| POST | `/api/v1/sections` | Create section |
| PATCH | `/api/v1/sections/{id}` | Update section |
| DELETE | `/api/v1/sections/{id}` | Delete section |
| GET | `/api/v1/sections/{sectionId}/tasks` | List tasks in section |
| POST | `/api/v1/tasks` | Create task |
| GET | `/api/v1/tasks/{id}` | Get task detail |
| PATCH | `/api/v1/tasks/{id}` | Update task |
| DELETE | `/api/v1/tasks/{id}` | Delete task |
| GET | `/api/v1/tasks/{taskId}/subtasks` | List subtasks |
| POST | `/api/v1/subtasks` | Create subtask |
| PATCH | `/api/v1/subtasks/{id}` | Update subtask |
| DELETE | `/api/v1/subtasks/{id}` | Delete subtask |
