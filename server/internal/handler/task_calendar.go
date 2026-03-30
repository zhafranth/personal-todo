package handler

import (
	"net/http"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
)

func (h *TaskHandler) ListByDateRange(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	if startStr == "" || endStr == "" {
		writeError(w, http.StatusBadRequest, "start and end query parameters are required")
		return
	}

	start, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid start date format, use YYYY-MM-DD")
		return
	}

	end, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid end date format, use YYYY-MM-DD")
		return
	}

	// Set end to end of day to include tasks due on the end date
	end = end.Add(24*time.Hour - time.Nanosecond)

	tasks, err := h.tasks.ListByDateRange(r.Context(), userID, start, end)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list tasks")
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}
