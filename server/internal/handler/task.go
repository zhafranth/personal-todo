package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type TaskHandler struct {
	tasks *repository.TaskRepo
}

func NewTaskHandler(tasks *repository.TaskRepo) *TaskHandler {
	return &TaskHandler{tasks: tasks}
}

func (h *TaskHandler) ListBySection(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	sectionID := r.PathValue("sectionId")

	tasks, err := h.tasks.ListBySection(r.Context(), sectionID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list tasks")
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (h *TaskHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	task, err := h.tasks.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	writeJSON(w, http.StatusOK, task)
}

type createTaskRequest struct {
	SectionID   string  `json:"section_id"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
	DueDate     *string `json:"due_date"`
	Priority    string  `json:"priority"`
}

func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.SectionID == "" || req.Title == "" {
		writeError(w, http.StatusBadRequest, "section_id and title are required")
		return
	}

	var dueDate *time.Time
	if req.DueDate != nil {
		t, err := time.Parse(time.RFC3339, *req.DueDate)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid due_date format, use RFC3339")
			return
		}
		dueDate = &t
	}

	task, err := h.tasks.Create(r.Context(), userID, req.SectionID, req.Title, req.Description, dueDate, req.Priority)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "section not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create task")
		return
	}
	writeJSON(w, http.StatusCreated, task)
}

type updateTaskRequest struct {
	Title       *string         `json:"title"`
	Description *string         `json:"description"`
	DueDate     json.RawMessage `json:"due_date"`
	Priority    *string         `json:"priority"`
	IsCompleted *bool           `json:"is_completed"`
	OrderIndex  *int            `json:"order_index"`
	SectionID   *string         `json:"section_id"`
}

func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	var req updateTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	upd := repository.TaskUpdate{
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		IsCompleted: req.IsCompleted,
		OrderIndex:  req.OrderIndex,
		SectionID:   req.SectionID,
	}

	// Handle due_date: explicit null clears, string parses, absent keeps
	if req.DueDate != nil {
		if string(req.DueDate) == "null" {
			upd.ClearDueDate = true
		} else {
			var dateStr string
			if err := json.Unmarshal(req.DueDate, &dateStr); err != nil {
				writeError(w, http.StatusBadRequest, "invalid due_date format")
				return
			}
			t, err := time.Parse(time.RFC3339, dateStr)
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid due_date format, use RFC3339")
				return
			}
			upd.DueDate = &t
		}
	}

	task, err := h.tasks.Update(r.Context(), id, userID, upd)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update task")
		return
	}
	writeJSON(w, http.StatusOK, task)
}

func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	err := h.tasks.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete task")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
