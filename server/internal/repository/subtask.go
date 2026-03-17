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
