package app

import (
	"context"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func mapEnv(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestConfigFromEnvDefaults(t *testing.T) {
	cfg := ConfigFromEnv(mapEnv(nil))
	if cfg.Serverless {
		t.Fatal("a plain local run must not be treated as serverless")
	}
	if cfg.SeedDemo != true {
		t.Fatal("local runs seed the demo data by default")
	}
	if cfg.Port != "8080" {
		t.Fatalf("port = %q, want 8080", cfg.Port)
	}
	if cfg.DBPath != "data/eneba.db" {
		t.Fatalf("db path = %q", cfg.DBPath)
	}
	if cfg.DatabaseURL != "" {
		t.Fatalf("database URL = %q, want empty", cfg.DatabaseURL)
	}
	if cfg.MaxOpenConns != 10 || cfg.MaxIdleConns != 5 {
		t.Fatalf("pool = %d/%d, want 10/5", cfg.MaxOpenConns, cfg.MaxIdleConns)
	}
	if got := cfg.DatabaseSource(); got != "data/eneba.db" {
		t.Fatalf("database source = %q", got)
	}
}

func TestConfigFromEnvServerless(t *testing.T) {
	cfg := ConfigFromEnv(mapEnv(map[string]string{"VERCEL": "1"}))
	if !cfg.Serverless {
		t.Fatal("VERCEL must mark the run as serverless")
	}
	if cfg.SeedDemo {
		t.Fatal("serverless cold starts must not seed demo data by default")
	}
	if cfg.MaxOpenConns != 3 || cfg.MaxIdleConns != 1 {
		t.Fatalf("pool = %d/%d, want 3/1", cfg.MaxOpenConns, cfg.MaxIdleConns)
	}
}

func TestConfigFromEnvOverrides(t *testing.T) {
	cfg := ConfigFromEnv(mapEnv(map[string]string{
		"VERCEL":            "1",
		"DATABASE_URL":      "postgresql://postgres:pw@db.example.supabase.co:5432/postgres",
		"SEED_DEMO":         "true",
		"DB_MAX_OPEN_CONNS": "7",
		"DB_MAX_IDLE_CONNS": "2",
		"CORS_ORIGINS":      "https://shop.example, https://admin.example",
	}))
	if cfg.DatabaseURL == "" {
		t.Fatal("DATABASE_URL was not read")
	}
	if got := cfg.DatabaseSource(); got != "DATABASE_URL" {
		t.Fatalf("database source = %q, want DATABASE_URL", got)
	}
	if !cfg.SeedDemo {
		t.Fatal("SEED_DEMO=true must override the serverless default")
	}
	if cfg.MaxOpenConns != 7 || cfg.MaxIdleConns != 2 {
		t.Fatalf("pool = %d/%d, want 7/2", cfg.MaxOpenConns, cfg.MaxIdleConns)
	}
	if len(cfg.AllowedOrigins) != 2 || cfg.AllowedOrigins[1] != "https://admin.example" {
		t.Fatalf("origins = %#v", cfg.AllowedOrigins)
	}
}

func TestNewRejectsSQLiteOnServerless(t *testing.T) {
	_, err := New(context.Background(), Config{Serverless: true, DBPath: "data/eneba.db"})
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL") {
		t.Fatalf("err = %v, want a DATABASE_URL hint", err)
	}
}

func TestNewServesHealth(t *testing.T) {
	cfg := Config{
		DBPath:       filepath.Join(t.TempDir(), "eneba.db"),
		SeedDemo:     true,
		Port:         "0",
		FrontendURL:  "http://localhost:3000",
		MaxOpenConns: 1,
		MaxIdleConns: 1,
	}
	application, err := New(context.Background(), cfg)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	defer application.Close()
	if !application.Seeded {
		t.Fatal("expected a fresh database to be seeded")
	}

	recorder := httptest.NewRecorder()
	application.Handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("health status = %d, body %s", recorder.Code, recorder.Body)
	}
	body := recorder.Body.String()
	if !strings.Contains(body, `"status":"ok"`) || !strings.Contains(body, `"database":"ok"`) {
		t.Fatalf("health body = %s", body)
	}
}
