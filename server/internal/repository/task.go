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
	Title        *string    `json:"title"`
	Description  *string    `json:"description"`
	DueDate      *time.Time `json:"due_date"`
	ClearDueDate bool       `json:"-"`
	Priority     *string    `json:"priority"`
	IsCompleted  *bool      `json:"is_completed"`
	OrderIndex   *int       `json:"order_index"`
	SectionID    *string    `json:"section_id"`
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
