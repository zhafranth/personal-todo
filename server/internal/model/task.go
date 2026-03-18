package model

import "time"

type Task struct {
	ID             string     `json:"id"`
	SectionID      string     `json:"section_id"`
	Title          string     `json:"title"`
	Description    *string    `json:"description,omitempty"`
	DueDate        *time.Time `json:"due_date,omitempty"`
	Priority       string     `json:"priority"`
	IsCompleted    bool       `json:"is_completed"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	RecurrenceRule *string    `json:"recurrence_rule,omitempty"`
	OrderIndex     int        `json:"order_index"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
