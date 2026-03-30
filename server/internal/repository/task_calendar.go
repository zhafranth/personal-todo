package repository

import (
	"context"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

func (r *TaskRepo) ListByDateRange(ctx context.Context, userID string, start, end time.Time) ([]model.Task, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+taskColumns+`
		 FROM tasks t
		 JOIN sections s ON s.id = t.section_id
		 WHERE s.user_id = $1 AND t.due_date >= $2 AND t.due_date <= $3
		 ORDER BY t.due_date, t.order_index`, userID, start, end)
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
