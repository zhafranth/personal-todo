package model

import "time"

type RecurringDefinition struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	SectionID      string    `json:"section_id"`
	Title          string    `json:"title"`
	Description    *string   `json:"description,omitempty"`
	Priority       string    `json:"priority"`
	RecurrenceRule string    `json:"recurrence_rule"`
	NextDueDate    time.Time `json:"next_due_date"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
