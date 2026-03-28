package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
	"github.com/zhafrantharif/personal-todo/server/internal/recurrence"
)

type TaskRepo struct {
	pool *pgxpool.Pool
}

func NewTaskRepo(pool *pgxpool.Pool) *TaskRepo {
	return &TaskRepo{pool: pool}
}

var taskColumns = `t.id, t.section_id, t.title, t.description, t.due_date, t.priority,
		t.is_completed, t.completed_at, t.recurrence_rule, t.order_index, t.created_at, t.updated_at`

func scanTask(scan func(dest ...any) error) (*model.Task, error) {
	var t model.Task
	err := scan(&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate,
		&t.Priority, &t.IsCompleted, &t.CompletedAt, &t.RecurrenceRule, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt)
	return &t, err
}

func (r *TaskRepo) ListBySection(ctx context.Context, sectionID, userID string) ([]model.Task, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+taskColumns+`
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
		t, err := scanTask(rows.Scan)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, *t)
	}
	if tasks == nil {
		tasks = []model.Task{}
	}
	return tasks, rows.Err()
}

func (r *TaskRepo) GetByID(ctx context.Context, id, userID string) (*model.Task, error) {
	return scanTask(r.pool.QueryRow(ctx,
		`SELECT `+taskColumns+`
		 FROM tasks t
		 JOIN sections s ON s.id = t.section_id
		 WHERE t.id = $1 AND s.user_id = $2`, id, userID,
	).Scan)
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

	return scanTask(r.pool.QueryRow(ctx,
		`INSERT INTO tasks AS t (section_id, title, description, due_date, priority, order_index)
		 VALUES ($1, $2, $3, $4, $5, COALESCE((SELECT MAX(order_index) + 1 FROM tasks WHERE section_id = $1), 0))
		 RETURNING `+taskColumns,
		sectionID, title, description, dueDate, priority,
	).Scan)
}

type TaskUpdate struct {
	Title              *string    `json:"title"`
	Description        *string    `json:"description"`
	DueDate            *time.Time `json:"due_date"`
	ClearDueDate       bool       `json:"-"`
	Priority           *string    `json:"priority"`
	IsCompleted        *bool      `json:"is_completed"`
	OrderIndex         *int       `json:"order_index"`
	SectionID          *string    `json:"section_id"`
	RecurrenceRule     *string    `json:"recurrence_rule"`
	ClearRecurrenceRule bool      `json:"-"`
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

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

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

	// If task was just completed and has a recurrence rule, advance it
	if t.IsCompleted && t.RecurrenceRule != nil && t.DueDate != nil {
		nextDate, err := recurrence.Next(*t.RecurrenceRule, *t.DueDate)
		if err == nil {
			t, err = scanTask(tx.QueryRow(ctx,
				`UPDATE tasks AS t SET
					is_completed = false,
					completed_at = NULL,
					due_date = $2,
					updated_at = NOW()
				 WHERE id = $1
				 RETURNING `+taskColumns,
				id, nextDate,
			).Scan)
			if err != nil {
				return nil, err
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return t, nil
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
