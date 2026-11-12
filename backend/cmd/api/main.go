// Command api serves the marketplace API. The same binary runs locally with
// SQLite, against Supabase PostgreSQL when DATABASE_URL is set, and on Vercel's
// Go runtime, which starts it the same way and routes requests to $PORT.
package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"eneba-market/backend/internal/app"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// Locally the connection string usually lives in backend/.env, so the
	// Supabase password is not pasted into the shell (or committed) every time.
	// Real environment variables win: godotenv never overwrites them, which is
	// what hosted platforms such as Vercel rely on.
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		logger.Warn("read .env", "error", err)
	}

	seedOnly := flag.Bool("seed", false, "seed the demo marketplace and exit")
	flag.Parse()

	cfg := app.ConfigFromEnv(os.Getenv)
	if *seedOnly {
		cfg.SeedDemo = true
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	application, err := app.New(ctx, cfg)
	if err != nil {
		logger.Error("start API", "error", err)
		os.Exit(1)
	}
	defer application.Close()

	if *seedOnly {
		if application.Seeded {
			logger.Info("database seeded", "source", cfg.DatabaseSource(), "demo_email", "demo@eneba.test")
		} else {
			logger.Info("database already seeded", "source", cfg.DatabaseSource())
		}
		return
	}

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           application.Handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		logger.Info("eneba marketplace API listening", "address", server.Addr, "frontend", cfg.FrontendURL)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server stopped", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down API")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
	}
}
