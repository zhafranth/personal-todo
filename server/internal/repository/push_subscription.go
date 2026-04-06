package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type PushSubscriptionRepo struct {
	pool *pgxpool.Pool
}

func NewPushSubscriptionRepo(pool *pgxpool.Pool) *PushSubscriptionRepo {
	return &PushSubscriptionRepo{pool: pool}
}

func (r *PushSubscriptionRepo) Create(ctx context.Context, userID, endpoint, p256dh, auth string) (*model.PushSubscription, error) {
	var ps model.PushSubscription
	err := r.pool.QueryRow(ctx,
		`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4
		 RETURNING id, user_id, endpoint, p256dh, auth, created_at`,
		userID, endpoint, p256dh, auth,
	).Scan(&ps.ID, &ps.UserID, &ps.Endpoint, &ps.P256dh, &ps.Auth, &ps.CreatedAt)
	return &ps, err
}

func (r *PushSubscriptionRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM push_subscriptions WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PushSubscriptionRepo) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM push_subscriptions WHERE endpoint = $1`, endpoint)
	return err
}

func (r *PushSubscriptionRepo) ListByUser(ctx context.Context, userID string) ([]model.PushSubscription, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, endpoint, p256dh, auth, created_at
		 FROM push_subscriptions
		 WHERE user_id = $1
		 ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []model.PushSubscription
	for rows.Next() {
		var ps model.PushSubscription
		if err := rows.Scan(&ps.ID, &ps.UserID, &ps.Endpoint, &ps.P256dh, &ps.Auth, &ps.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, ps)
	}
	if subs == nil {
		subs = []model.PushSubscription{}
	}
	return subs, rows.Err()
}
