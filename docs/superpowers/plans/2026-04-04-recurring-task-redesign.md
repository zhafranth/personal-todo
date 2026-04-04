# Recurring Task Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign recurring tasks from auto-advance-on-completion to scheduler-generated instances, driven by a `recurring_definitions` table, with support for `monthly_last_day` rule.

**Architecture:** New `recurring_definitions` table stores blueprints. A dedicated in-process goroutine generates task instances daily at 00:00 WIB. Tasks are passive — marking done has no side effects. New CRUD endpoints for definitions. Frontend updated to create definitions instead of setting recurrence on tasks directly.

**Tech Stack:** Go (pgx, net/http), PostgreSQL, React, TanStack Query, Tailwind CSS, react-day-picker

---

## File Map

### Backend — Create
- `server/migrations/008_recurring_definitions.sql` — migration for new table + FK on tasks
- `server/internal/model/recurring_definition.go` — model struct
- `server/internal/repository/recurring_definition.go` — CRUD + scheduler queries
- `server/internal/handler/recurring_definition.go` — HTTP handlers
- `server/internal/scheduler/recurring.go` — recurring task scheduler goroutine

### Backend — Modify
- `server/internal/recurrence/recurrence.go` — add `monthly_last_day` rule
- `server/internal/model/task.go` — add `RecurringDefinitionID` field
- `server/internal/repository/task.go` — remove auto-advance logic, add `recurring_definition_id` to queries
- `server/cmd/server/main.go` — wire up new repo, handler, scheduler, routes

### Frontend — Create
- `web/src/hooks/use-recurring-definitions.ts` — TanStack Query hooks for definitions

### Frontend — Modify
- `web/src/types/index.ts` — add `RecurringDefinition` interface, update `RecurrenceRule` and `Task` types
- `web/src/components/recurrence/RecurrencePicker.tsx` — add `monthly_last_day` preset
- `web/src/components/ui/DatePicker.tsx` — add "Last day of month" chip
- `web/src/pages/CreateTaskPage.tsx` — route to recurring-definitions endpoint when recurrence is set
- `web/src/components/tasks/TaskDetail.tsx` — make recurrence read-only for linked tasks

---

### Task 1: Database Migration

**Files:**
- Create: `server/migrations/008_recurring_definitions.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Create recurring_definitions table
CREATE TABLE recurring_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  recurrence_rule TEXT NOT NULL,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from tasks to recurring_definitions
ALTER TABLE tasks
  ADD COLUMN recurring_definition_id UUID REFERENCES recurring_definitions(id) ON DELETE SET NULL;

-- Index for scheduler: find active definitions due today or earlier
CREATE INDEX idx_recurring_definitions_active_due ON recurring_definitions(next_due_date)
  WHERE is_active = true;

-- Index for idempotency check: find tasks by definition + due_date
CREATE INDEX idx_tasks_recurring_def_due ON tasks(recurring_definition_id, due_date)
  WHERE recurring_definition_id IS NOT NULL;

-- Migrate existing recurring tasks to recurring_definitions
-- For each incomplete task with a recurrence_rule and due_date, create a definition
INSERT INTO recurring_definitions (user_id, section_id, title, description, priority, recurrence_rule, next_due_date)
SELECT
  s.user_id,
  t.section_id,
  t.title,
  t.description,
  t.priority,
  t.recurrence_rule,
  CASE
    WHEN t.recurrence_rule = 'daily' THEN t.due_date + INTERVAL '1 day'
    WHEN t.recurrence_rule = 'weekly' THEN t.due_date + INTERVAL '7 days'
    WHEN t.recurrence_rule = 'monthly' THEN t.due_date + INTERVAL '1 month'
    WHEN t.recurrence_rule = 'yearly' THEN t.due_date + INTERVAL '1 year'
    ELSE t.due_date + INTERVAL '1 month'
  END
FROM tasks t
JOIN sections s ON s.id = t.section_id
WHERE t.recurrence_rule IS NOT NULL
  AND t.is_completed = false
  AND t.due_date IS NOT NULL;

-- Link existing tasks to their new definitions
UPDATE tasks t SET recurring_definition_id = rd.id
FROM recurring_definitions rd
WHERE rd.section_id = t.section_id
  AND rd.title = t.title
  AND rd.recurrence_rule = t.recurrence_rule
  AND t.recurrence_rule IS NOT NULL
  AND t.is_completed = false
  AND t.due_date IS NOT NULL;
```

- [ ] **Step 2: Run the migration**

Run: `psql "$DATABASE_URL" -f server/migrations/008_recurring_definitions.sql`
Expected: tables created, indexes added, existing data migrated without errors.

- [ ] **Step 3: Verify migration**

Run: `psql "$DATABASE_URL" -c "\d recurring_definitions" && psql "$DATABASE_URL" -c "\d tasks" | grep recurring_definition_id`
Expected: table structure matches spec, `recurring_definition_id` column visible on tasks.

- [ ] **Step 4: Commit**

```bash
git add server/migrations/008_recurring_definitions.sql
git commit -m "feat: add recurring_definitions table and migrate existing recurring tasks"
```

---

### Task 2: Add `monthly_last_day` Recurrence Rule

**Files:**
- Modify: `server/internal/recurrence/recurrence.go`

- [ ] **Step 1: Update `Validate` to accept `monthly_last_day`**

In `server/internal/recurrence/recurrence.go`, change the switch statement in `Validate`:

```go
func Validate(rule string) error {
	switch rule {
	case "daily", "weekly", "monthly", "yearly", "monthly_last_day":
		return nil
	}
	// ... rest unchanged
}
```

- [ ] **Step 2: Update `Next` to handle `monthly_last_day`**

In the same file, add the case to `Next`:

```go
func Next(rule string, base time.Time) (time.Time, error) {
	switch rule {
	case "daily":
		return base.AddDate(0, 0, 1), nil
	case "weekly":
		return base.AddDate(0, 0, 7), nil
	case "monthly":
		return base.AddDate(0, 1, 0), nil
	case "yearly":
		return base.AddDate(1, 0, 0), nil
	case "monthly_last_day":
		return LastDayOfNextMonth(base), nil
	}
	// ... rest unchanged
}

// LastDayOfNextMonth returns the last day of the month following base's month,
// preserving the time-of-day from base.
func LastDayOfNextMonth(base time.Time) time.Time {
	// Move to the 1st of the month after next, then subtract one day.
	firstOfNextNextMonth := time.Date(base.Year(), base.Month()+2, 1, base.Hour(), base.Minute(), base.Second(), base.Nanosecond(), base.Location())
	return firstOfNextNextMonth.AddDate(0, 0, -1)
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd server && go build ./...`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/internal/recurrence/recurrence.go
git commit -m "feat: add monthly_last_day recurrence rule"
```

---

### Task 3: RecurringDefinition Model & Task Model Update

**Files:**
- Create: `server/internal/model/recurring_definition.go`
- Modify: `server/internal/model/task.go`

- [ ] **Step 1: Create the model file**

Create `server/internal/model/recurring_definition.go`:

```go
package model

import "time"

type RecurringDefinition struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	SectionID      string    `json:"section_id"`
	Title          string    `json:"title"`
	Description    *string   `json:"description,omitempty"`
	Priority       string    `json:"priority"`
	RecurrenceRule string    `json:"recurrence_rule"`
	NextDueDate    time.Time `json:"next_due_date"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
```

- [ ] **Step 2: Add `RecurringDefinitionID` to Task model**

In `server/internal/model/task.go`, add the field after `RecurrenceRule`:

```go
type Task struct {
	ID                     string     `json:"id"`
	SectionID              string     `json:"section_id"`
	Title                  string     `json:"title"`
	Description            *string    `json:"description,omitempty"`
	DueDate                *time.Time `json:"due_date,omitempty"`
	Priority               string     `json:"priority"`
	IsCompleted            bool       `json:"is_completed"`
	CompletedAt            *time.Time `json:"completed_at,omitempty"`
	RecurrenceRule         *string    `json:"recurrence_rule,omitempty"`
	RecurringDefinitionID  *string    `json:"recurring_definition_id,omitempty"`
	OrderIndex             int        `json:"order_index"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd server && go build ./...`
Expected: compilation errors in `repository/task.go` because `scanTask` doesn't scan the new column yet. That's expected — we fix it in the next task.

- [ ] **Step 4: Commit**

```bash
git add server/internal/model/recurring_definition.go server/internal/model/task.go
git commit -m "feat: add RecurringDefinition model and RecurringDefinitionID to Task"
```

---

### Task 4: Update Task Repository (scan + remove auto-advance)

**Files:**
- Modify: `server/internal/repository/task.go`

- [ ] **Step 1: Update `taskColumns` and `scanTask` to include `recurring_definition_id`**

In `server/internal/repository/task.go`, update:

```go
var taskColumns = `t.id, t.section_id, t.title, t.description, t.due_date, t.priority,
		t.is_completed, t.completed_at, t.recurrence_rule, t.recurring_definition_id, t.order_index, t.created_at, t.updated_at`

func scanTask(scan func(dest ...any) error) (*model.Task, error) {
	var t model.Task
	err := scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate,
		&t.Priority, &t.IsCompleted, &t.CompletedAt, &t.RecurrenceRule, &t.RecurringDefinitionID, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt)
	return &t, err
}
```

- [ ] **Step 2: Remove the auto-advance logic from `Update`**

In the `Update` method, remove the entire block after `tx.QueryRow` that checks for recurring tasks and advances them (lines 147-161 in the current file). The method should go straight from scanning the update result to `tx.Commit`:

```go
	t, err := scanTask(tx.QueryRow(ctx,
		`UPDATE tasks AS t SET
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
			recurrence_rule = CASE WHEN $12 = true THEN NULL ELSE COALESCE($11, recurrence_rule) END,
			updated_at = NOW()
		 WHERE id = $1 AND section_id IN (SELECT id FROM sections WHERE user_id = $2)
		 RETURNING `+taskColumns,
		id, userID, upd.Title, upd.Description, upd.DueDate, upd.Priority,
		upd.IsCompleted, upd.OrderIndex, upd.SectionID, upd.ClearDueDate,
		upd.RecurrenceRule, upd.ClearRecurrenceRule,
	).Scan)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return t, nil
```

Also remove the `recurrence` import from this file since it's no longer used here.

- [ ] **Step 3: Verify it compiles**

Run: `cd server && go build ./...`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/internal/repository/task.go
git commit -m "refactor: add recurring_definition_id to task queries, remove auto-advance logic"
```

---

### Task 5: RecurringDefinition Repository

**Files:**
- Create: `server/internal/repository/recurring_definition.go`

- [ ] **Step 1: Create the repository file**

Create `server/internal/repository/recurring_definition.go`:

```go
package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
	"github.com/zhafrantharif/personal-todo/server/internal/recurrence"
)

type RecurringDefinitionRepo struct {
	pool *pgxpool.Pool
}

func NewRecurringDefinitionRepo(pool *pgxpool.Pool) *RecurringDefinitionRepo {
	return &RecurringDefinitionRepo{pool: pool}
}

var rdColumns = `rd.id, rd.user_id, rd.section_id, rd.title, rd.description, rd.priority,
		rd.recurrence_rule, rd.next_due_date, rd.is_active, rd.created_at, rd.updated_at`

func scanRD(scan func(dest ...any) error) (*model.RecurringDefinition, error) {
	var rd model.RecurringDefinition
	err := scan(&rd.ID, &rd.UserID, &rd.SectionID, &rd.Title, &rd.Description, &rd.Priority,
		&rd.RecurrenceRule, &rd.NextDueDate, &rd.IsActive, &rd.CreatedAt, &rd.UpdatedAt)
	return &rd, err
}

func (r *RecurringDefinitionRepo) ListByUser(ctx context.Context, userID string) ([]model.RecurringDefinition, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+rdColumns+`
		 FROM recurring_definitions rd
		 WHERE rd.user_id = $1
		 ORDER BY rd.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var defs []model.RecurringDefinition
	for rows.Next() {
		rd, err := scanRD(rows.Scan)
		if err != nil {
			return nil, err
		}
		defs = append(defs, *rd)
	}
	if defs == nil {
		defs = []model.RecurringDefinition{}
	}
	return defs, rows.Err()
}

func (r *RecurringDefinitionRepo) GetByID(ctx context.Context, id, userID string) (*model.RecurringDefinition, error) {
	return scanRD(r.pool.QueryRow(ctx,
		`SELECT `+rdColumns+`
		 FROM recurring_definitions rd
		 WHERE rd.id = $1 AND rd.user_id = $2`, id, userID,
	).Scan)
}

// CreateWithFirstTask creates a recurring definition and its first task instance in one transaction.
func (r *RecurringDefinitionRepo) CreateWithFirstTask(ctx context.Context, userID, sectionID, title string, description *string, priority, rule string, dueDate time.Time) (*model.RecurringDefinition, *model.Task, error) {
	// Verify section ownership
	var ownerID string
	err := r.pool.QueryRow(ctx, `SELECT user_id FROM sections WHERE id = $1`, sectionID).Scan(&ownerID)
	if err != nil || ownerID != userID {
		return nil, nil, ErrNotFound
	}

	nextDue, err := recurrence.Next(rule, dueDate)
	if err != nil {
		return nil, nil, err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	// Insert definition
	rd, err := scanRD(tx.QueryRow(ctx,
		`INSERT INTO recurring_definitions (user_id, section_id, title, description, priority, recurrence_rule, next_due_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING `+rdColumns,
		userID, sectionID, title, description, priority, rule, nextDue,
	).Scan)
	if err != nil {
		return nil, nil, err
	}

	// Insert first task
	var taskColumns = `t.id, t.section_id, t.title, t.description, t.due_date, t.priority,
		t.is_completed, t.completed_at, t.recurrence_rule, t.recurring_definition_id, t.order_index, t.created_at, t.updated_at`

	var t model.Task
	err = tx.QueryRow(ctx,
		`INSERT INTO tasks AS t (section_id, title, description, due_date, priority, recurrence_rule, recurring_definition_id, order_index)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE((SELECT MAX(order_index) + 1 FROM tasks WHERE section_id = $1), 0))
		 RETURNING `+taskColumns,
		sectionID, title, description, dueDate, priority, rule, rd.ID,
	).Scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate,
		&t.Priority, &t.IsCompleted, &t.CompletedAt, &t.RecurrenceRule, &t.RecurringDefinitionID, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return rd, &t, nil
}

type RecurringDefinitionUpdate struct {
	Title          *string `json:"title"`
	Description    *string `json:"description"`
	Priority       *string `json:"priority"`
	SectionID      *string `json:"section_id"`
	RecurrenceRule *string `json:"recurrence_rule"`
	IsActive       *bool   `json:"is_active"`
}

func (r *RecurringDefinitionRepo) Update(ctx context.Context, id, userID string, upd RecurringDefinitionUpdate) (*model.RecurringDefinition, error) {
	_, err := r.GetByID(ctx, id, userID)
	if err != nil {
		return nil, ErrNotFound
	}

	return scanRD(r.pool.QueryRow(ctx,
		`UPDATE recurring_definitions AS rd SET
			title = COALESCE($3, title),
			description = COALESCE($4, description),
			priority = COALESCE($5, priority),
			section_id = COALESCE($6, section_id),
			recurrence_rule = COALESCE($7, recurrence_rule),
			is_active = COALESCE($8, is_active),
			updated_at = NOW()
		 WHERE rd.id = $1 AND rd.user_id = $2
		 RETURNING `+rdColumns,
		id, userID, upd.Title, upd.Description, upd.Priority, upd.SectionID, upd.RecurrenceRule, upd.IsActive,
	).Scan)
}

func (r *RecurringDefinitionRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM recurring_definitions WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ListDueForGeneration returns active definitions where next_due_date <= the given date.
// Used by the recurring scheduler.
func (r *RecurringDefinitionRepo) ListDueForGeneration(ctx context.Context, today time.Time) ([]model.RecurringDefinition, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+rdColumns+`
		 FROM recurring_definitions rd
		 WHERE rd.is_active = true AND rd.next_due_date <= $1
		 ORDER BY rd.next_due_date`, today)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var defs []model.RecurringDefinition
	for rows.Next() {
		rd, err := scanRD(rows.Scan)
		if err != nil {
			return nil, err
		}
		defs = append(defs, *rd)
	}
	return defs, rows.Err()
}

// GenerateTask creates a task for a definition if one doesn't already exist for that due date.
// Returns true if a task was created, false if skipped (idempotency).
func (r *RecurringDefinitionRepo) GenerateTask(ctx context.Context, def model.RecurringDefinition) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	// Idempotency: check if task already exists for this definition + due date
	var exists bool
	err = tx.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM tasks
			WHERE recurring_definition_id = $1 AND due_date::date = $2::date
		)`, def.ID, def.NextDueDate).Scan(&exists)
	if err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}

	// Create task
	_, err = tx.Exec(ctx,
		`INSERT INTO tasks (section_id, title, description, due_date, priority, recurrence_rule, recurring_definition_id, order_index)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE((SELECT MAX(order_index) + 1 FROM tasks WHERE section_id = $1), 0))`,
		def.SectionID, def.Title, def.Description, def.NextDueDate, def.Priority, def.RecurrenceRule, def.ID)
	if err != nil {
		return false, err
	}

	// Advance next_due_date
	nextDue, err := recurrence.Next(def.RecurrenceRule, def.NextDueDate)
	if err != nil {
		return false, err
	}

	_, err = tx.Exec(ctx,
		`UPDATE recurring_definitions SET next_due_date = $2, updated_at = NOW() WHERE id = $1`,
		def.ID, nextDue)
	if err != nil {
		return false, err
	}

	return true, tx.Commit(ctx)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd server && go build ./...`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/internal/repository/recurring_definition.go
git commit -m "feat: add RecurringDefinition repository with CRUD and scheduler queries"
```

---

### Task 6: RecurringDefinition Handler

**Files:**
- Create: `server/internal/handler/recurring_definition.go`

- [ ] **Step 1: Create the handler file**

Create `server/internal/handler/recurring_definition.go`:

```go
package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/recurrence"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type RecurringDefinitionHandler struct {
	repo *repository.RecurringDefinitionRepo
}

func NewRecurringDefinitionHandler(repo *repository.RecurringDefinitionRepo) *RecurringDefinitionHandler {
	return &RecurringDefinitionHandler{repo: repo}
}

func (h *RecurringDefinitionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	defs, err := h.repo.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list recurring definitions")
		return
	}
	writeJSON(w, http.StatusOK, defs)
}

type createRecurringDefRequest struct {
	SectionID      string  `json:"section_id"`
	Title          string  `json:"title"`
	Description    *string `json:"description"`
	Priority       string  `json:"priority"`
	RecurrenceRule string  `json:"recurrence_rule"`
	DueDate        string  `json:"due_date"`
}

func (h *RecurringDefinitionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createRecurringDefRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.SectionID == "" || req.Title == "" || req.RecurrenceRule == "" || req.DueDate == "" {
		writeError(w, http.StatusBadRequest, "section_id, title, recurrence_rule, and due_date are required")
		return
	}
	if err := recurrence.Validate(req.RecurrenceRule); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	dueDate, err := time.Parse(time.RFC3339, req.DueDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid due_date format, use RFC3339")
		return
	}

	if req.Priority == "" {
		req.Priority = "medium"
	}

	def, task, err := h.repo.CreateWithFirstTask(r.Context(), userID, req.SectionID, req.Title, req.Description, req.Priority, req.RecurrenceRule, dueDate)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "section not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create recurring definition")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"definition": def,
		"task":       task,
	})
}

type updateRecurringDefRequest struct {
	Title          *string `json:"title"`
	Description    *string `json:"description"`
	Priority       *string `json:"priority"`
	SectionID      *string `json:"section_id"`
	RecurrenceRule *string `json:"recurrence_rule"`
	IsActive       *bool   `json:"is_active"`
}

func (h *RecurringDefinitionHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	var req updateRecurringDefRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RecurrenceRule != nil {
		if err := recurrence.Validate(*req.RecurrenceRule); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	upd := repository.RecurringDefinitionUpdate{
		Title:          req.Title,
		Description:    req.Description,
		Priority:       req.Priority,
		SectionID:      req.SectionID,
		RecurrenceRule: req.RecurrenceRule,
		IsActive:       req.IsActive,
	}

	def, err := h.repo.Update(r.Context(), id, userID, upd)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "recurring definition not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update recurring definition")
		return
	}
	writeJSON(w, http.StatusOK, def)
}

func (h *RecurringDefinitionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	err := h.repo.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "recurring definition not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete recurring definition")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd server && go build ./...`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/internal/handler/recurring_definition.go
git commit -m "feat: add RecurringDefinition HTTP handler"
```

---

### Task 7: Recurring Task Scheduler

**Files:**
- Create: `server/internal/scheduler/recurring.go`

- [ ] **Step 1: Create the scheduler file**

Create `server/internal/scheduler/recurring.go`:

```go
package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

var wibLocation *time.Location

func init() {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Fatalf("failed to load Asia/Jakarta timezone: %v", err)
	}
	wibLocation = loc
}

type RecurringScheduler struct {
	repo *repository.RecurringDefinitionRepo
}

func NewRecurringScheduler(repo *repository.RecurringDefinitionRepo) *RecurringScheduler {
	return &RecurringScheduler{repo: repo}
}

// Start launches the recurring task scheduler. It runs immediately on start (catch-up),
// then every day at 00:00 WIB.
func (s *RecurringScheduler) Start(ctx context.Context) {
	log.Println("[recurring-scheduler] started, running catch-up check")
	s.generate(ctx)

	for {
		now := time.Now().In(wibLocation)
		nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, wibLocation)
		sleepDuration := nextMidnight.Sub(now)

		log.Printf("[recurring-scheduler] next run at %s (in %s)", nextMidnight.Format(time.RFC3339), sleepDuration)

		select {
		case <-ctx.Done():
			log.Println("[recurring-scheduler] stopped")
			return
		case <-time.After(sleepDuration):
			s.generate(ctx)
		}
	}
}

func (s *RecurringScheduler) generate(ctx context.Context) {
	today := time.Now().In(wibLocation)
	todayDate := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, wibLocation)

	defs, err := s.repo.ListDueForGeneration(ctx, todayDate)
	if err != nil {
		log.Printf("[recurring-scheduler] error listing definitions: %v", err)
		return
	}

	if len(defs) == 0 {
		log.Println("[recurring-scheduler] no definitions due for generation")
		return
	}

	log.Printf("[recurring-scheduler] found %d definitions to process", len(defs))

	for _, def := range defs {
		created, err := s.repo.GenerateTask(ctx, def)
		if err != nil {
			log.Printf("[recurring-scheduler] error generating task for definition %s: %v", def.ID, err)
			continue
		}
		if created {
			log.Printf("[recurring-scheduler] generated task for definition %s (title=%s, due=%s)",
				def.ID, def.Title, def.NextDueDate.Format("2006-01-02"))
		} else {
			log.Printf("[recurring-scheduler] skipped definition %s (task already exists)", def.ID)
		}
	}
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd server && go build ./...`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/internal/scheduler/recurring.go
git commit -m "feat: add recurring task scheduler goroutine"
```

---

### Task 8: Wire Everything in main.go

**Files:**
- Modify: `server/cmd/server/main.go`

- [ ] **Step 1: Add the new repo, handler, scheduler, and routes**

In `server/cmd/server/main.go`, make these changes:

After `noteRepo := repository.NewNoteRepo(pool)`, add:
```go
	recurringDefRepo := repository.NewRecurringDefinitionRepo(pool)
```

After `go sched.Start(context.Background())`, add:
```go
	recurringSched := scheduler.NewRecurringScheduler(recurringDefRepo)
	go recurringSched.Start(context.Background())
```

After `noteHandler := handler.NewNoteHandler(noteRepo)`, add:
```go
	recurringDefHandler := handler.NewRecurringDefinitionHandler(recurringDefRepo)
```

After the notes routes block, add:
```go
	protected.HandleFunc("GET /api/v1/recurring-definitions", recurringDefHandler.List)
	protected.HandleFunc("POST /api/v1/recurring-definitions", recurringDefHandler.Create)
	protected.HandleFunc("PATCH /api/v1/recurring-definitions/{id}", recurringDefHandler.Update)
	protected.HandleFunc("DELETE /api/v1/recurring-definitions/{id}", recurringDefHandler.Delete)
```

- [ ] **Step 2: Verify it compiles**

Run: `cd server && go build ./...`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/cmd/server/main.go
git commit -m "feat: wire recurring definitions repo, handler, scheduler, and routes"
```

---

### Task 9: Frontend Types Update

**Files:**
- Modify: `web/src/types/index.ts`

- [ ] **Step 1: Update RecurrenceRule type and Task interface, add RecurringDefinition**

In `web/src/types/index.ts`:

Update `RecurrenceRule` to include `monthly_last_day`:
```typescript
export type RecurrenceRule =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'monthly_last_day'
  | `every_${number}_days`
  | `every_${number}_weeks`
  | `every_${number}_months`
```

Add `recurring_definition_id` to `Task`:
```typescript
export interface Task {
  id: string
  section_id: string
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high'
  is_completed: boolean
  completed_at?: string
  recurrence_rule?: RecurrenceRule
  recurring_definition_id?: string
  order_index: number
  created_at: string
  updated_at: string
}
```

Add the new interface at the end of the file (before `NoteUpdate`):
```typescript
export interface RecurringDefinition {
  id: string
  user_id: string
  section_id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  recurrence_rule: RecurrenceRule
  next_due_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/types/index.ts
git commit -m "feat: add RecurringDefinition type, monthly_last_day rule, recurring_definition_id to Task"
```

---

### Task 10: Frontend Hooks for Recurring Definitions

**Files:**
- Create: `web/src/hooks/use-recurring-definitions.ts`

- [ ] **Step 1: Create the hooks file**

Create `web/src/hooks/use-recurring-definitions.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { RecurringDefinition, Task, RecurrenceRule } from '../types'

export function useRecurringDefinitions() {
  return useQuery({
    queryKey: ['recurring-definitions'],
    queryFn: () => api.get<RecurringDefinition[]>('/recurring-definitions'),
  })
}

export function useCreateRecurringDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      section_id: string
      title: string
      description?: string
      priority: string
      recurrence_rule: RecurrenceRule
      due_date: string
    }) => api.post<{ definition: RecurringDefinition; task: Task }>('/recurring-definitions', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['recurring-definitions'] })
      qc.invalidateQueries({ queryKey: ['tasks', vars.section_id] })
      qc.invalidateQueries({ queryKey: ['calendar-tasks'] })
    },
  })
}

export function useUpdateRecurringDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string
      title?: string
      description?: string
      priority?: string
      section_id?: string
      recurrence_rule?: RecurrenceRule
      is_active?: boolean
    }) => api.patch<RecurringDefinition>(`/recurring-definitions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-definitions'] })
    },
  })
}

export function useDeleteRecurringDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recurring-definitions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-definitions'] })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/hooks/use-recurring-definitions.ts
git commit -m "feat: add TanStack Query hooks for recurring definitions"
```

---

### Task 11: RecurrencePicker — Add `monthly_last_day`

**Files:**
- Modify: `web/src/components/recurrence/RecurrencePicker.tsx`

- [ ] **Step 1: Add the preset and format**

In `web/src/components/recurrence/RecurrencePicker.tsx`:

Add `monthly_last_day` to `PRESETS` array (after Monthly, before Yearly):
```typescript
const PRESETS: { label: string; value: RecurrenceRule | null }[] = [
  { label: 'None', value: null },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Last day of month', value: 'monthly_last_day' },
  { label: 'Yearly', value: 'yearly' },
]
```

Update `formatRecurrenceRule` to handle the new rule (add a case before `default`):
```typescript
export function formatRecurrenceRule(rule: RecurrenceRule): string {
  switch (rule) {
    case 'daily': return 'Daily'
    case 'weekly': return 'Weekly'
    case 'monthly': return 'Monthly'
    case 'monthly_last_day': return 'Last day of month'
    case 'yearly': return 'Yearly'
    default: {
      if (rule.startsWith('every_')) {
        const { n, unit } = parseCustomRule(rule)
        return `Every ${n} ${unit}`
      }
      return rule
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/recurrence/RecurrencePicker.tsx
git commit -m "feat: add monthly_last_day preset to RecurrencePicker"
```

---

### Task 12: DatePicker — Add "Last day of month" Chip

**Files:**
- Modify: `web/src/components/ui/DatePicker.tsx`

- [ ] **Step 1: Update `CalendarPopup` to accept and emit last-day-of-month**

In `web/src/components/ui/DatePicker.tsx`, update `CalendarPopup` to track the viewed month and expose a callback:

```typescript
function CalendarPopup({
  selected,
  onSelect,
  showLastDayChip,
}: {
  selected: Date | undefined
  onSelect: (day: Date | undefined) => void
  showLastDayChip?: boolean
}) {
  const [month, setMonth] = useState<Date>(selected || new Date())

  const handleLastDay = () => {
    const year = month.getFullYear()
    const m = month.getMonth()
    const lastDay = new Date(year, m + 1, 0) // day 0 of next month = last day of current month
    onSelect(lastDay)
  }

  return (
    <div className="rdp-calendar">
      <style>{calendarStyles}</style>
      <DayPicker
        mode="single"
        captionLayout="dropdown"
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2035, 11)}
        selected={selected}
        onSelect={onSelect}
        month={month}
        onMonthChange={setMonth}
      />
      {showLastDayChip && (
        <div className="mt-1 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={handleLastDay}
            className="w-full rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 active:bg-violet-200"
          >
            Last day of {month.toLocaleString('en-US', { month: 'long' })}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Pass `showLastDayChip` through the DatePicker components**

Update the `DatePickerProps` interface and component:

```typescript
interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  showLastDayChip?: boolean
}

export default function DatePicker({ value, onChange, placeholder = 'Pick a date', className, autoFocus, showLastDayChip }: DatePickerProps) {
```

In the `Popover.Content` of `DatePicker`, pass the prop:

```tsx
<CalendarPopup selected={selected} onSelect={handleSelect} showLastDayChip={showLastDayChip} />
```

Similarly for `SmallDatePickerProps` and `SmallDatePicker`:

```typescript
interface SmallDatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  showLastDayChip?: boolean
}

export function SmallDatePicker({ value, onChange, placeholder = 'Pick date', autoFocus, showLastDayChip }: SmallDatePickerProps) {
```

And in its `Popover.Content`:
```tsx
<CalendarPopup selected={selected} onSelect={handleSelect} showLastDayChip={showLastDayChip} />
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/DatePicker.tsx
git commit -m "feat: add last-day-of-month chip to DatePicker"
```

---

### Task 13: Update CreateTaskPage to Use Recurring Definitions

**Files:**
- Modify: `web/src/pages/CreateTaskPage.tsx`

- [ ] **Step 1: Add recurrence state and conditional submit**

In `web/src/pages/CreateTaskPage.tsx`:

Add import for RecurrencePicker and the new hook:
```typescript
import RecurrencePicker from '../components/recurrence/RecurrencePicker'
import { useCreateRecurringDefinition } from '../hooks/use-recurring-definitions'
import type { RecurrenceRule } from '../types'
```

Add state for recurrence rule (after existing state declarations):
```typescript
const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null)
```

Add the mutation hook (after `createReminder`):
```typescript
const createRecurringDef = useCreateRecurringDefinition()
```

Replace `handleSubmit` with logic that branches based on recurrence:
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  const targetSection = sectionId || sections?.[0]?.id
  if (!title.trim() || !targetSection) return

  if (recurrenceRule && dueDate) {
    // Create via recurring definitions endpoint
    createRecurringDef.mutate(
      {
        section_id: targetSection,
        title: title.trim(),
        description: isEditorEmpty(description) ? undefined : description,
        due_date: `${dueDate}T23:59:59Z`,
        priority,
        recurrence_rule: recurrenceRule,
      },
      {
        onSuccess: (result) => {
          if (reminders.length > 0) {
            reminders.forEach((r) => {
              createReminder.mutate({
                task_id: result.task.id,
                remind_at: r.remindAt,
                ...(r.recurrenceRule ? { recurrence_rule: r.recurrenceRule } : {}),
              })
            })
          }
          goBack()
        },
      },
    )
  } else {
    // Create regular task
    createTask.mutate(
      {
        section_id: targetSection,
        title: title.trim(),
        description: isEditorEmpty(description) ? undefined : description,
        due_date: dueDate ? `${dueDate}T23:59:59Z` : undefined,
        priority,
      },
      {
        onSuccess: (task) => {
          if (reminders.length > 0) {
            reminders.forEach((r) => {
              createReminder.mutate({
                task_id: task.id,
                remind_at: r.remindAt,
                ...(r.recurrenceRule ? { recurrence_rule: r.recurrenceRule } : {}),
              })
            })
          }
          goBack()
        },
      },
    )
  }
}
```

- [ ] **Step 2: Add RecurrencePicker and update DatePicker in the form JSX**

Add the RecurrencePicker section in the form (after the Section select, before the Reminders section):
```tsx
{/* Recurrence */}
<div>
  <label className="mb-1 block text-xs font-medium text-slate-500">Repeat</label>
  <RecurrencePicker value={recurrenceRule} onChange={setRecurrenceRule} />
</div>
```

Update the DatePicker to pass `showLastDayChip`:
```tsx
<DatePicker
  value={dueDate}
  onChange={setDueDate}
  placeholder="Pick a date"
  showLastDayChip={recurrenceRule === 'monthly_last_day'}
/>
```

Update the submit button disabled state:
```tsx
disabled={!title.trim() || createTask.isPending || createRecurringDef.isPending}
```

Update the submit button text:
```tsx
{createTask.isPending || createRecurringDef.isPending ? 'Creating...' : 'Create'}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/CreateTaskPage.tsx
git commit -m "feat: route recurring task creation through recurring-definitions endpoint"
```

---

### Task 14: Update TaskDetail — Make Recurrence Read-Only for Linked Tasks

**Files:**
- Modify: `web/src/components/tasks/TaskDetail.tsx`

- [ ] **Step 1: Make RecurrencePicker read-only when task is linked to a definition**

In `web/src/components/tasks/TaskDetail.tsx`, update the recurrence section (around line 200-210):

Replace:
```tsx
{/* Task recurrence */}
<div className="mt-4">
  <p className="mb-2 text-xs font-medium text-slate-500">Repeat task</p>
  {task.recurrence_rule && !task.due_date && (
    <p className="mb-2 text-xs text-amber-600">Set a due date for recurrence to work</p>
  )}
  <RecurrencePicker
    value={task.recurrence_rule ?? null}
    onChange={(rule) => updateTask.mutate({ id: task.id, recurrence_rule: rule })}
  />
</div>
```

With:
```tsx
{/* Task recurrence */}
<div className="mt-4">
  <p className="mb-2 text-xs font-medium text-slate-500">Repeat task</p>
  {task.recurring_definition_id ? (
    <p className="text-xs text-slate-500">
      {task.recurrence_rule ? formatRecurrenceRule(task.recurrence_rule) : 'None'} — managed by recurring schedule
    </p>
  ) : (
    <>
      {task.recurrence_rule && !task.due_date && (
        <p className="mb-2 text-xs text-amber-600">Set a due date for recurrence to work</p>
      )}
      <RecurrencePicker
        value={task.recurrence_rule ?? null}
        onChange={(rule) => updateTask.mutate({ id: task.id, recurrence_rule: rule })}
      />
    </>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/tasks/TaskDetail.tsx
git commit -m "feat: make recurrence read-only for tasks linked to recurring definitions"
```

---

### Task 15: Final Verification

- [ ] **Step 1: Build backend**

Run: `cd server && go build ./...`
Expected: no errors.

- [ ] **Step 2: Build frontend**

Run: `cd web && npm run build`
Expected: no errors.

- [ ] **Step 3: Manual smoke test checklist**

1. Run migration against dev database
2. Start server — verify both schedulers log startup messages
3. Create a recurring task with "Monthly" rule and due date April 25 — verify definition created via `GET /api/v1/recurring-definitions`
4. Create a recurring task with "Last day of month" — verify DatePicker shows the chip, and definition stores `monthly_last_day`
5. Mark a recurring task complete — verify it stays completed (no auto-advance)
6. Check TaskDetail for a recurring task — verify RecurrencePicker shows read-only text

- [ ] **Step 4: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "chore: final cleanup for recurring task redesign"
```
