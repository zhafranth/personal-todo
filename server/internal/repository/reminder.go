package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
	"github.com/zhafrantharif/personal-todo/server/internal/recurrence"
)

type ReminderRepo struct {
	pool *pgxpool.Pool
}

func NewReminderRepo(pool *pgxpool.Pool) *ReminderRepo {
	return &ReminderRepo{pool: pool}
}

func (r *ReminderRepo) ListByTask(ctx context.Context, taskID, userID string) ([]model.Reminder, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT rm.id, rm.task_id, rm.remind_at, rm.is_sent, rm.recurrence_rule, rm.created_at
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
		if err := rows.Scan(&rm.ID, &rm.TaskID, &rm.RemindAt, &rm.IsSent, &rm.RecurrenceRule, &rm.CreatedAt); err != nil {
			return nil, err
		}
		reminders = append(reminders, rm)
	}
	if reminders == nil {
		reminders = []model.Reminder{}
	}
	return reminders, rows.Err()
}

func (r *ReminderRepo) Create(ctx context.Context, userID, taskID string, remindAt time.Time, recurrenceRule *string) (*model.Reminder, error) {
	var ownerID string
	err := r.pool.QueryRow(ctx,
		`SELECT s.user_id FROM tasks t JOIN sections s ON s.id = t.section_id WHERE t.id = $1`, taskID,
	).Scan(&ownerID)
	if err != nil || ownerID != userID {
		return nil, ErrNotFound
	}

	var rm model.Reminder
	err = r.pool.QueryRow(ctx,
		`INSERT INTO reminders (task_id, remind_at, recurrence_rule)
		 VALUES ($1, $2, $3)
		 RETURNING id, task_id, remind_at, is_sent, recurrence_rule, created_at`,
		taskID, remindAt, recurrenceRule,
	).Scan(&rm.ID, &rm.TaskID, &rm.RemindAt, &rm.IsSent, &rm.RecurrenceRule, &rm.CreatedAt)
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

// ListPendingDue returns all unsent reminders that are due before the given time.
func (r *ReminderRepo) ListPendingDue(ctx context.Context, before time.Time) ([]model.Reminder, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, task_id, remind_at, is_sent, recurrence_rule, created_at
		 FROM reminders
		 WHERE is_sent = FALSE AND remind_at <= $1
		 ORDER BY remind_at`, before)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reminders []model.Reminder
	for rows.Next() {
		var rm model.Reminder
		if err := rows.Scan(&rm.ID, &rm.TaskID, &rm.RemindAt, &rm.IsSent, &rm.RecurrenceRule, &rm.CreatedAt); err != nil {
			return nil, err
		}
		reminders = append(reminders, rm)
	}
	return reminders, rows.Err()
}

// MarkSentAndScheduleNext marks a reminder as sent and, if it has a recurrence rule,
// creates the next occurrence in a single transaction.
func (r *ReminderRepo) MarkSentAndScheduleNext(ctx context.Context, id string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var rm model.Reminder
	err = tx.QueryRow(ctx,
		`UPDATE reminders SET is_sent = TRUE
		 WHERE id = $1
		 RETURNING id, task_id, remind_at, recurrence_rule`, id,
	).Scan(&rm.ID, &rm.TaskID, &rm.RemindAt, &rm.RecurrenceRule)
	if err != nil {
		return err
	}

	if rm.RecurrenceRule != nil {
		nextTime, err := recurrence.Next(*rm.RecurrenceRule, rm.RemindAt)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx,
			`INSERT INTO reminders (task_id, remind_at, recurrence_rule)
			 VALUES ($1, $2, $3)`,
			rm.TaskID, nextTime, rm.RecurrenceRule)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
