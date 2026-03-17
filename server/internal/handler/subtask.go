package handler

import (
	"errors"
	"net/http"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type SubTaskHandler struct {
	subtasks *repository.SubTaskRepo
}

func NewSubTaskHandler(subtasks *repository.SubTaskRepo) *SubTaskHandler {
	return &SubTaskHandler{subtasks: subtasks}
}

func (h *SubTaskHandler) ListByTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := r.PathValue("taskId")
	subtasks, err := h.subtasks.ListByTask(r.Context(), taskID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list subtasks")
		return
	}
	writeJSON(w, http.StatusOK, subtasks)
}

type createSubTaskRequest struct {
	TaskID string `json:"task_id"`
	Title  string `json:"title"`
}

func (h *SubTaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createSubTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.TaskID == "" || req.Title == "" {
		writeError(w, http.StatusBadRequest, "task_id and title are required")
		return
	}
	subtask, err := h.subtasks.Create(r.Context(), userID, req.TaskID, req.Title)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create subtask")
		return
	}
	writeJSON(w, http.StatusCreated, subtask)
}

type updateSubTaskRequest struct {
	Title       *string `json:"title"`
	IsCompleted *bool   `json:"is_completed"`
	OrderIndex  *int    `json:"order_index"`
}

func (h *SubTaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")
	var req updateSubTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	subtask, err := h.subtasks.Update(r.Context(), id, userID, req.Title, req.IsCompleted, req.OrderIndex)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "subtask not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update subtask")
		return
	}
	writeJSON(w, http.StatusOK, subtask)
}

func (h *SubTaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")
	err := h.subtasks.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "subtask not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete subtask")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
