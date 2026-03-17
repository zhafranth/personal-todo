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

	// Handlers
	authHandler := handler.NewAuthHandler(userRepo, cfg.JWTSecret)

	// Router
	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("POST /api/v1/register", authHandler.Register)
	mux.HandleFunc("POST /api/v1/login", authHandler.Login)

	// Protected routes
	protected := http.NewServeMux()
	protected.HandleFunc("GET /api/v1/me", authHandler.Me)

	// More protected routes will be added here

	mux.Handle("/api/v1/", middleware.Auth(cfg.JWTSecret, protected))

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
