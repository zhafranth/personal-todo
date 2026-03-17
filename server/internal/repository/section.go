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
