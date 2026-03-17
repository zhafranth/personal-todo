package model

import "time"

type SubTask struct {
	ID          string     `json:"id"`
	TaskID      string     `json:"task_id"`
	Title       string     `json:"title"`
	IsCompleted bool       `json:"is_completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	OrderIndex  int        `json:"order_index"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
