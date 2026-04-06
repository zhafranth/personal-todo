package handler

import (
	"errors"
	"net/http"

	"github.com/zhafrantharif/personal-todo/server/internal/config"
	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type PushSubscriptionHandler struct {
	subs *repository.PushSubscriptionRepo
	cfg  config.Config
}

func NewPushSubscriptionHandler(subs *repository.PushSubscriptionRepo, cfg config.Config) *PushSubscriptionHandler {
	return &PushSubscriptionHandler{subs: subs, cfg: cfg}
}

func (h *PushSubscriptionHandler) VAPIDKey(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"publicKey": h.cfg.VAPIDPublicKey,
	})
}

type createPushSubRequest struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

func (h *PushSubscriptionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createPushSubRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Endpoint == "" || req.Keys.P256dh == "" || req.Keys.Auth == "" {
		writeError(w, http.StatusBadRequest, "endpoint, keys.p256dh, and keys.auth are required")
		return
	}

	sub, err := h.subs.Create(r.Context(), userID, req.Endpoint, req.Keys.P256dh, req.Keys.Auth)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save subscription")
		return
	}
	writeJSON(w, http.StatusCreated, sub)
}

func (h *PushSubscriptionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")
	err := h.subs.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "subscription not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete subscription")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
