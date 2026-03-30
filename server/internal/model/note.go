package model

import "time"

type Note struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Content   *string   `json:"content"`
	IsPinned  bool      `json:"is_pinned"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type NoteUpdate struct {
	Title    *string `json:"title"`
	Content  *string `json:"content"`
	IsPinned *bool   `json:"is_pinned"`
}
