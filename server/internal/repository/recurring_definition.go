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
	err := scan(
		&rd.ID, &rd.UserID, &rd.SectionID, &rd.Title, &rd.Description, &rd.Priority,
		&rd.RecurrenceRule, &rd.NextDueDate, &rd.IsActive, &rd.CreatedAt, &rd.UpdatedAt,
	)
	return &rd, err
}

type RecurringDefinitionUpdate struct {
	Title          *string `json:"title"`
	Description    *string `json:"description"`
	Priority       *string `json:"priority"`
	SectionID      *string `json:"section_id"`
	RecurrenceRule *string `json:"recurrence_rule"`
	IsActive       *bool   `json:"is_active"`
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
	rd, err := scanRD(r.pool.QueryRow(ctx,
		`SELECT `+rdColumns+`
		 FROM recurring_definitions rd
		 WHERE rd.id = $1 AND rd.user_id = $2`, id, userID,
	).Scan)
	if err != nil {
		return nil, ErrNotFound
	}
	return rd, nil
}

func (r *RecurringDefinitionRepo) CreateWithFirstTask(
	ctx context.Context,
	userID, sectionID, title string,
	description *string,
	priority, rule string,
	dueDate time.Time,
) (*model.RecurringDefinition, *model.Task, error) {
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

	// INSERT recurring_definition
	rd, err := scanRD(tx.QueryRow(ctx,
		`INSERT INTO recurring_definitions (user_id, section_id, title, description, priority, recurrence_rule, next_due_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING `+rdColumns,
		userID, sectionID, title, description, priority, rule, nextDue,
	).Scan)
	if err != nil {
		return nil, nil, err
	}

	// INSERT first task
	var t model.Task
	err = tx.QueryRow(ctx,
		`INSERT INTO tasks AS t (section_id, title, description, due_date, priority, recurrence_rule, recurring_definition_id, order_index)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE((SELECT MAX(order_index) + 1 FROM tasks WHERE section_id = $1), 0))
		 RETURNING `+taskColumns,
		sectionID, title, description, dueDate, priority, rule, rd.ID,
	).Scan(
		&t.ID, &t.SectionID, &t.Title, &t.Description, &t.DueDate,
		&t.Priority, &t.IsCompleted, &t.CompletedAt, &t.RecurrenceRule,
		&t.RecurringDefinitionID, &t.OrderIndex, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}

	return rd, &t, nil
}

func (r *RecurringDefinitionRepo) Update(ctx context.Context, id, userID string, upd RecurringDefinitionUpdate) (*model.RecurringDefinition, error) {
	rd, err := scanRD(r.pool.QueryRow(ctx,
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
	if err != nil {
		return nil, ErrNotFound
	}
	return rd, nil
}

func (r *RecurringDefinitionRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM recurring_definitions WHERE id = $1 AND user_id = $2`,
		id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Scheduler methods

func (r *RecurringDefinitionRepo) ListDueForGeneration(ctx context.Context, today time.Time) ([]model.RecurringDefinition, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+rdColumns+`
		 FROM recurring_definitions rd
		 WHERE rd.is_active = true AND rd.next_due_date <= $1`, today)
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

func (r *RecurringDefinitionRepo) GenerateTask(ctx context.Context, def model.RecurringDefinition) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	// Idempotency check
	var exists bool
	err = tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM tasks WHERE recurring_definition_id = $1 AND due_date::date = $2::date)`,
		def.ID, def.NextDueDate,
	).Scan(&exists)
	if err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}

	// INSERT new task
	_, err = tx.Exec(ctx,
		`INSERT INTO tasks (section_id, title, description, due_date, priority, recurrence_rule, recurring_definition_id, order_index)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE((SELECT MAX(order_index) + 1 FROM tasks WHERE section_id = $1), 0))`,
		def.SectionID, def.Title, def.Description, def.NextDueDate, def.Priority, def.RecurrenceRule, def.ID,
	)
	if err != nil {
		return false, err
	}

	// Advance next_due_date
	nextDue, err := recurrence.Next(def.RecurrenceRule, def.NextDueDate)
	if err != nil {
		return false, err
	}

	_, err = tx.Exec(ctx,
		`UPDATE recurring_definitions SET next_due_date = $1, updated_at = NOW() WHERE id = $2`,
		nextDue, def.ID,
	)
	if err != nil {
		return false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}

	return true, nil
}
