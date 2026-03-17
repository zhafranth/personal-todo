package model

import "time"

type Reminder struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	RemindAt  time.Time `json:"remind_at"`
	IsSent    bool      `json:"is_sent"`
	CreatedAt time.Time `json:"created_at"`
}
