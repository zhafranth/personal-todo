package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type NoteRepo struct {
	pool *pgxpool.Pool
}

func NewNoteRepo(pool *pgxpool.Pool) *NoteRepo {
	return &NoteRepo{pool: pool}
}

func (r *NoteRepo) List(ctx context.Context, userID string, query string) ([]model.Note, error) {
	sql := `SELECT id, user_id, title, content, is_pinned, created_at, updated_at
		FROM notes WHERE user_id = $1`
	args := []any{userID}

	if query != "" {
		sql += ` AND title ILIKE $2`
		args = append(args, "%"+query+"%")
	}

	sql += ` ORDER BY is_pinned DESC, updated_at DESC`

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []model.Note
	for rows.Next() {
		var n model.Note
		if err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	if notes == nil {
		notes = []model.Note{}
	}
	return notes, rows.Err()
}

func (r *NoteRepo) GetByID(ctx context.Context, id, userID string) (*model.Note, error) {
	var n model.Note
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, content, is_pinned, created_at, updated_at
		 FROM notes WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&n.ID, &n.UserID, &n.Title, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *NoteRepo) Create(ctx context.Context, userID, title string, content *string) (*model.Note, error) {
	var n model.Note
	err := r.pool.QueryRow(ctx,
		`INSERT INTO notes (user_id, title, content)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, title, content, is_pinned, created_at, updated_at`,
		userID, title, content,
	).Scan(&n.ID, &n.UserID, &n.Title, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt)
	return &n, err
}

func (r *NoteRepo) Update(ctx context.Context, id, userID string, upd model.NoteUpdate) (*model.Note, error) {
	setClauses := []string{}
	args := []any{id, userID}
	argIdx := 3

	if upd.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *upd.Title)
		argIdx++
	}
	if upd.Content != nil {
		setClauses = append(setClauses, fmt.Sprintf("content = $%d", argIdx))
		args = append(args, *upd.Content)
		argIdx++
	}
	if upd.IsPinned != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_pinned = $%d", argIdx))
		args = append(args, *upd.IsPinned)
		argIdx++
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, id, userID)
	}

	setClauses = append(setClauses, "updated_at = NOW()")

	sql := fmt.Sprintf(
		`UPDATE notes SET %s WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, title, content, is_pinned, created_at, updated_at`,
		strings.Join(setClauses, ", "),
	)

	var n model.Note
	err := r.pool.QueryRow(ctx, sql, args...).Scan(
		&n.ID, &n.UserID, &n.Title, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *NoteRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM notes WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
