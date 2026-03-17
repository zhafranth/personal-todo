package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) Create(ctx context.Context, email, passwordHash, name string) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
		 RETURNING id, email, password_hash, name, avatar_url, created_at, updated_at`,
		email, passwordHash, name,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, avatar_url, created_at, updated_at FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, avatar_url, created_at, updated_at FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}
