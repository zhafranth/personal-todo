package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/config"
	"github.com/zhafrantharif/personal-todo/server/internal/handler"
	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
	"github.com/zhafrantharif/personal-todo/server/internal/scheduler"
)

func main() {
	cfg := config.Load()

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("Unable to ping database: %v", err)
	}
	log.Println("Connected to database")

	// Repositories
	userRepo := repository.NewUserRepo(pool)
	sectionRepo := repository.NewSectionRepo(pool)
	taskRepo := repository.NewTaskRepo(pool)
	subtaskRepo := repository.NewSubTaskRepo(pool)
	reminderRepo := repository.NewReminderRepo(pool)

	// Scheduler
	sched := scheduler.New(reminderRepo)
	go sched.Start(context.Background())

	// Handlers
	authHandler := handler.NewAuthHandler(userRepo, cfg.JWTSecret)
	sectionHandler := handler.NewSectionHandler(sectionRepo)
	taskHandler := handler.NewTaskHandler(taskRepo)
	subtaskHandler := handler.NewSubTaskHandler(subtaskRepo)
	reminderHandler := handler.NewReminderHandler(reminderRepo)

	// Router
	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("POST /api/v1/register", authHandler.Register)
	mux.HandleFunc("POST /api/v1/login", authHandler.Login)

	// Protected routes
	protected := http.NewServeMux()
	protected.HandleFunc("GET /api/v1/me", authHandler.Me)

	protected.HandleFunc("GET /api/v1/sections", sectionHandler.List)
	protected.HandleFunc("POST /api/v1/sections", sectionHandler.Create)
	protected.HandleFunc("PATCH /api/v1/sections/{id}", sectionHandler.Update)
	protected.HandleFunc("DELETE /api/v1/sections/{id}", sectionHandler.Delete)

	protected.HandleFunc("GET /api/v1/sections/{sectionId}/tasks", taskHandler.ListBySection)
	protected.HandleFunc("GET /api/v1/tasks/calendar", taskHandler.ListByDateRange)
	protected.HandleFunc("GET /api/v1/tasks/{id}", taskHandler.GetByID)
	protected.HandleFunc("POST /api/v1/tasks", taskHandler.Create)
	protected.HandleFunc("PATCH /api/v1/tasks/{id}", taskHandler.Update)
	protected.HandleFunc("DELETE /api/v1/tasks/{id}", taskHandler.Delete)

	protected.HandleFunc("GET /api/v1/tasks/{taskId}/subtasks", subtaskHandler.ListByTask)
	protected.HandleFunc("POST /api/v1/subtasks", subtaskHandler.Create)
	protected.HandleFunc("PATCH /api/v1/subtasks/{id}", subtaskHandler.Update)
	protected.HandleFunc("DELETE /api/v1/subtasks/{id}", subtaskHandler.Delete)

	protected.HandleFunc("GET /api/v1/tasks/{taskId}/reminders", reminderHandler.ListByTask)
	protected.HandleFunc("POST /api/v1/reminders", reminderHandler.Create)
	protected.HandleFunc("DELETE /api/v1/reminders/{id}", reminderHandler.Delete)

	// More protected routes will be added here

	mux.Handle("/api/v1/", middleware.Auth(cfg.JWTSecret, protected))

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
