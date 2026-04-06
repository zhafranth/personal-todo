package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	DBHost          string
	DBPort          string
	DBUsername      string
	DBPassword      string
	DBName          string
	JWTSecret       string
	AllowedOrigins  []string
	VAPIDPublicKey  string
	VAPIDPrivateKey string
	VAPIDSubject    string
}

func (c Config) DatabaseURL() string {
	password := ""
	if c.DBPassword != "" {
		password = ":" + c.DBPassword
	}
	return fmt.Sprintf("postgres://%s%s@%s:%s/%s?sslmode=disable",
		c.DBUsername, password, c.DBHost, c.DBPort, c.DBName)
}

func Load() Config {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	var origins []string
	if raw := os.Getenv("ALLOWED_ORIGINS"); raw != "" {
		for _, o := range strings.Split(raw, ",") {
			origins = append(origins, strings.TrimSpace(o))
		}
	}
	return Config{
		Port:            port,
		DBHost:          dbHost,
		DBPort:          dbPort,
		DBUsername:      os.Getenv("DB_USERNAME"),
		DBPassword:      os.Getenv("DB_PASSWORD"),
		DBName:          os.Getenv("DB_NAME"),
		JWTSecret:       os.Getenv("JWT_SECRET"),
		AllowedOrigins:  origins,
		VAPIDPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
		VAPIDPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
		VAPIDSubject:    os.Getenv("VAPID_SUBJECT"),
	}
}
