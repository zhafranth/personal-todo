package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type ReminderHandler struct {
	reminders *repository.ReminderRepo
}

func NewReminderHandler(reminders *repository.ReminderRepo) *ReminderHandler {
	return &ReminderHandler{reminders: reminders}
}

func (h *ReminderHandler) ListByTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := r.PathValue("taskId")
	reminders, err := h.reminders.ListByTask(r.Context(), taskID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list reminders")
		return
	}
	writeJSON(w, http.StatusOK, reminders)
}

type createReminderRequest struct {
	TaskID   string `json:"task_id"`
	RemindAt string `json:"remind_at"`
}

func (h *ReminderHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createReminderRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.TaskID == "" || req.RemindAt == "" {
		writeError(w, http.StatusBadRequest, "task_id and remind_at are required")
		return
	}
	remindAt, err := time.Parse(time.RFC3339, req.RemindAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid remind_at format, use RFC3339")
		return
	}
	reminder, err := h.reminders.Create(r.Context(), userID, req.TaskID, remindAt)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create reminder")
		return
	}
	writeJSON(w, http.StatusCreated, reminder)
}

func (h *ReminderHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")
	err := h.reminders.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "reminder not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete reminder")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
