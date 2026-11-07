package config

import (
	"os"
)

type Config struct {
	Port             string
	DatabaseURL      string
	AllowedOrigins   string
	WSAllowedOrigins string
}

func LoadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/geotrack?sslmode=disable"
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}

	wsAllowedOrigins := os.Getenv("WS_ALLOWED_ORIGINS")
	if wsAllowedOrigins == "" {
		wsAllowedOrigins = "*"
	}

	return &Config{
		Port:             port,
		DatabaseURL:      dbURL,
		AllowedOrigins:   allowedOrigins,
		WSAllowedOrigins: wsAllowedOrigins,
	}
}

