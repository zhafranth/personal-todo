package model

import "time"

type Section struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Title      string    `json:"title"`
	OrderIndex int       `json:"order_index"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
