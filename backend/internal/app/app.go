// Package app wires configuration, the database and the HTTP API together. Both
// the standalone server (cmd/api) and a serverless host start from here, so the
// two entry points cannot drift apart.
package app

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"eneba-market/backend/internal/database"
	"eneba-market/backend/internal/httpapi"
	"eneba-market/backend/internal/store"
)

// Config is the environment the API runs with.
type Config struct {
	// DatabaseURL is a postgres:// URL, usually Supabase. When set it wins over
	// DBPath and the API runs on PostgreSQL instead of the SQLite demo file.
	DatabaseURL string
	DBPath      string

	Port           string
	FrontendURL    string
	CookieSecure   bool
	AllowedOrigins []string

	// SeedDemo fills an empty database with the demo catalogue and account. It
	// is on for local runs and off on serverless hosts, where a cold start has
	// a short budget; a hosted database is seeded once from a development
	// machine or by temporarily setting SEED_DEMO=true.
	SeedDemo bool
	// SeedTimeout caps the one-time demo seed. It defaults to 10 minutes
	// because the first seed inserts ~214 products and ~650 offers over the
	// network, which is far slower than localhost SQLite. Override with
	// SEED_TIMEOUT_SECONDS.
	SeedTimeout time.Duration
	// Serverless marks platforms without a persistent disk (Vercel).
	Serverless bool

	MaxOpenConns int
	MaxIdleConns int
}

// ConfigFromEnv reads the process environment. getenv is passed in so tests can
// supply their own map instead of mutating the real environment.
func ConfigFromEnv(getenv func(string) string) Config {
	serverless := strings.TrimSpace(getenv("VERCEL")) != ""
	maxOpen, maxIdle := 10, 5
	if serverless {
		// Every warm function instance keeps its own pool, so stay small; the
		// Supabase pooler multiplexes clients onto far fewer server sessions.
		maxOpen, maxIdle = 3, 1
	}
	return Config{
		DatabaseURL:    strings.TrimSpace(getenv("DATABASE_URL")),
		DBPath:         getenvDefault(getenv, "DB_PATH", "data/eneba.db"),
		Port:           getenvDefault(getenv, "PORT", "8080"),
		FrontendURL:    getenvDefault(getenv, "FRONTEND_URL", "http://localhost:3000"),
		CookieSecure:   getenvBool(getenv, "COOKIE_SECURE", false),
		AllowedOrigins: splitList(getenvDefault(getenv, "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")),
		SeedDemo:       getenvBool(getenv, "SEED_DEMO", !serverless),
		SeedTimeout:    time.Duration(getenvInt(getenv, "SEED_TIMEOUT_SECONDS", 600)) * time.Second,
		Serverless:     serverless,
		MaxOpenConns:   getenvInt(getenv, "DB_MAX_OPEN_CONNS", maxOpen),
		MaxIdleConns:   getenvInt(getenv, "DB_MAX_IDLE_CONNS", maxIdle),
	}
}

// DatabaseSource names where the connection string came from, for logs.
func (c Config) DatabaseSource() string {
	if c.DatabaseURL != "" {
		return "DATABASE_URL"
	}
	return c.DBPath
}

// App is a ready-to-serve API: an HTTP handler plus the database behind it.
type App struct {
	Handler http.Handler
	DB      *database.DB
	// Seeded reports whether this start populated demo data.
	Seeded bool
}

// New opens the database, brings the schema up to date, optionally seeds the
// demo data and returns the API handler.
func New(ctx context.Context, cfg Config) (*App, error) {
	dsn := cfg.DatabaseURL
	if dsn == "" {
		if cfg.Serverless {
			return nil, fmt.Errorf("DATABASE_URL is not set: serverless hosts have no persistent disk for SQLite, so point DATABASE_URL at your Supabase PostgreSQL URL")
		}
		dsn = cfg.DBPath
	}

	db, err := database.OpenWithOptions(dsn, database.OpenOptions{
		MaxOpenConns: cfg.MaxOpenConns,
		MaxIdleConns: cfg.MaxIdleConns,
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	slog.Info("database ready", "driver", db.Dialect, "source", cfg.DatabaseSource())

	// A hosted database is slower to prepare than the local SQLite file: the
	// first start creates the schema and seeds ~200 products over the network.
	migrateCtx, cancelMigrate := context.WithTimeout(ctx, 60*time.Second)
	err = database.Migrate(migrateCtx, db)
	cancelMigrate()
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate database: %w", err)
	}

	app := &App{DB: db}
	if cfg.SeedDemo {
		seedTimeout := cfg.SeedTimeout
		if seedTimeout <= 0 {
			seedTimeout = 10 * time.Minute
		}
		seedCtx, cancelSeed := context.WithTimeout(ctx, seedTimeout)
		app.Seeded, err = database.Seed(seedCtx, db)
		cancelSeed()
		if err != nil {
			db.Close()
			return nil, fmt.Errorf("seed database: %w", err)
		}
		if app.Seeded {
			slog.Info("seeded demo marketplace", "demo_email", database.DemoEmail)
		}
	} else {
		slog.Info("demo seeding is off; set SEED_DEMO=true or run `go run ./cmd/api -seed` once")
	}

	api := httpapi.New(store.New(db), httpapi.Config{
		FrontendURL:   cfg.FrontendURL,
		CookieSecure:  cfg.CookieSecure,
		AllowedOrigin: cfg.AllowedOrigins,
	})
	app.Handler = api.Handler()
	return app, nil
}

// Close releases the database pool.
func (a *App) Close() error {
	if a == nil || a.DB == nil {
		return nil
	}
	return a.DB.Close()
}

func getenvDefault(getenv func(string) string, key, fallback string) string {
	if value := strings.TrimSpace(getenv(key)); value != "" {
		return value
	}
	return fallback
}

func getenvBool(getenv func(string) string, key string, fallback bool) bool {
	raw := strings.TrimSpace(getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return value
}

func getenvInt(getenv func(string) string, key string, fallback int) int {
	raw := strings.TrimSpace(getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func splitList(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
