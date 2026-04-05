package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/recurrence"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type RecurringDefinitionHandler struct {
	repo *repository.RecurringDefinitionRepo
}

func NewRecurringDefinitionHandler(repo *repository.RecurringDefinitionRepo) *RecurringDefinitionHandler {
	return &RecurringDefinitionHandler{repo: repo}
}

func (h *RecurringDefinitionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	defs, err := h.repo.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list recurring definitions")
		return
	}
	writeJSON(w, http.StatusOK, defs)
}

type createRecurringDefRequest struct {
	SectionID      string  `json:"section_id"`
	Title          string  `json:"title"`
	Description    *string `json:"description"`
	Priority       string  `json:"priority"`
	RecurrenceRule string  `json:"recurrence_rule"`
	DueDate        string  `json:"due_date"`
}

func (h *RecurringDefinitionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req createRecurringDefRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.SectionID == "" || req.Title == "" || req.RecurrenceRule == "" || req.DueDate == "" {
		writeError(w, http.StatusBadRequest, "section_id, title, recurrence_rule, and due_date are required")
		return
	}

	if err := recurrence.Validate(req.RecurrenceRule); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	dueDate, err := time.Parse(time.RFC3339, req.DueDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid due_date format, use RFC3339")
		return
	}

	if req.Priority == "" {
		req.Priority = "medium"
	}

	def, task, err := h.repo.CreateWithFirstTask(r.Context(), userID, req.SectionID, req.Title, req.Description, req.Priority, req.RecurrenceRule, dueDate)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "section not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create recurring definition")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"definition": def,
		"task":       task,
	})
}

type updateRecurringDefRequest struct {
	Title          *string `json:"title"`
	Description    *string `json:"description"`
	Priority       *string `json:"priority"`
	SectionID      *string `json:"section_id"`
	RecurrenceRule *string `json:"recurrence_rule"`
	IsActive       *bool   `json:"is_active"`
}

func (h *RecurringDefinitionHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	var req updateRecurringDefRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RecurrenceRule != nil {
		if err := recurrence.Validate(*req.RecurrenceRule); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	upd := repository.RecurringDefinitionUpdate{
		Title:          req.Title,
		Description:    req.Description,
		Priority:       req.Priority,
		SectionID:      req.SectionID,
		RecurrenceRule: req.RecurrenceRule,
		IsActive:       req.IsActive,
	}

	def, err := h.repo.Update(r.Context(), id, userID, upd)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "recurring definition not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update recurring definition")
		return
	}
	writeJSON(w, http.StatusOK, def)
}

func (h *RecurringDefinitionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	err := h.repo.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "recurring definition not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete recurring definition")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
