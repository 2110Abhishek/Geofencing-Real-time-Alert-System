package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	_ "github.com/lib/pq"
)

// InitDB initializes PostgreSQL connection pool with retry logic.
func InitDB(connStr string) (*sql.DB, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Retry ping up to 10 times to wait for docker database ready
	var pingErr error
	for i := 0; i < 10; i++ {
		pingErr = db.Ping()
		if pingErr == nil {
			log.Println("[Database] Successfully connected to PostgreSQL.")
			break
		}
		log.Printf("[Database] Waiting for database ready (%d/10)...: %v", i+1, pingErr)
		time.Sleep(2 * time.Second)
	}

	if pingErr != nil {
		return nil, fmt.Errorf("database unreachable: %w", pingErr)
	}

	return db, nil
}

// RunMigrations executes the initial schema migration script.
func RunMigrations(db *sql.DB, migrationsDir string) error {
	migrationPath := filepath.Join(migrationsDir, "000001_init_schema.up.sql")
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		// Fallback to local or embedded path
		content, err = os.ReadFile("internal/database/migrations/000001_init_schema.up.sql")
		if err != nil {
			return fmt.Errorf("failed to read migration file: %w", err)
		}
	}

	_, err = db.Exec(string(content))
	if err != nil {
		return fmt.Errorf("failed to apply migration: %w", err)
	}

	log.Println("[Database] Migrations applied successfully.")
	return nil
}

