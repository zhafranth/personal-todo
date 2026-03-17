package handler

import (
	"errors"
	"net/http"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type SectionHandler struct {
	sections *repository.SectionRepo
}

func NewSectionHandler(sections *repository.SectionRepo) *SectionHandler {
	return &SectionHandler{sections: sections}
}

func (h *SectionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	sections, err := h.sections.List(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list sections")
		return
	}
	writeJSON(w, http.StatusOK, sections)
}

type createSectionRequest struct {
	Title string `json:"title"`
}

func (h *SectionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createSectionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	section, err := h.sections.Create(r.Context(), userID, req.Title)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create section")
		return
	}
	writeJSON(w, http.StatusCreated, section)
}

type updateSectionRequest struct {
	Title      *string `json:"title"`
	OrderIndex *int    `json:"order_index"`
}

func (h *SectionHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	var req updateSectionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	section, err := h.sections.Update(r.Context(), id, userID, req.Title, req.OrderIndex)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "section not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update section")
		return
	}
	writeJSON(w, http.StatusOK, section)
}

func (h *SectionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	err := h.sections.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "section not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete section")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
