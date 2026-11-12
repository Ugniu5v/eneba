package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"eneba-market/backend/internal/store"
)

const sessionCookie = "eneba_session"

type Config struct {
	FrontendURL   string
	CookieSecure  bool
	AllowedOrigin []string
}

type Server struct {
	store  *store.Store
	config Config
	mux    *http.ServeMux
}

func New(repo *store.Store, cfg Config) *Server {
	s := &Server{
		store:  repo,
		config: cfg,
		mux:    http.NewServeMux(),
	}
	s.routes()
	return s
}

func (s *Server) Handler() http.Handler {
	return s.withCORS(s.withRecovery(s.withLogging(s.mux)))
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/health", s.handleHealth)

	s.mux.HandleFunc("GET /api/storefront/home/banners", s.handleHomeBanners)
	s.mux.HandleFunc("GET /api/storefront/home/categories", s.handleHomeCategories)
	s.mux.HandleFunc("GET /api/storefront/home/sections", s.handleHomeSections)
	s.mux.HandleFunc("GET /api/storefront/home/sections/{slug}", s.handleHomeSection)
	s.mux.HandleFunc("GET /api/storefront/catalog", s.handleCatalog)
	s.mux.HandleFunc("GET /api/storefront/filters", s.handleFilters)
	s.mux.HandleFunc("GET /api/storefront/products/{slug}", s.handleProduct)

	s.mux.HandleFunc("GET /api/search", s.handleSearch)
	s.mux.HandleFunc("GET /api/search/suggest", s.handleSearchSuggest)

	s.mux.HandleFunc("POST /api/auth/register", s.handleRegister)
	s.mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	s.mux.HandleFunc("POST /api/auth/logout", s.handleLogout)
	s.mux.HandleFunc("GET /api/auth/me", s.handleMe)
	s.mux.HandleFunc("PATCH /api/account/profile", s.handleUpdateProfile)
	s.mux.HandleFunc("GET /api/account/cashback", s.handleCashback)

	s.mux.HandleFunc("POST /api/checkout", s.handleCheckout)
	s.mux.HandleFunc("GET /api/orders", s.handleOrders)
	s.mux.HandleFunc("GET /api/orders/{number}", s.handleOrder)
	s.mux.HandleFunc("POST /api/orders/{number}/confirm", s.handleConfirmOrderKeys)

	s.mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "not_found", "The requested API route does not exist.")
	})
	s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "not_found", "Not found.")
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	body := map[string]any{
		"status":  "ok",
		"service": "eneba-market-api",
	}
	if err := s.store.Ping(ctx); err != nil {
		body["status"] = "degraded"
		body["database"] = "unreachable"
		slog.Warn("health check: database unreachable", "error", err)
		writeJSON(w, http.StatusServiceUnavailable, body)
		return
	}
	body["database"] = "ok"
	writeJSON(w, http.StatusOK, body)
}

func containsOrigin(origins []string, origin string) bool {
	for _, allowed := range origins {
		if strings.EqualFold(strings.TrimSpace(allowed), origin) {
			return true
		}
	}
	return false
}

func logRequest(r *http.Request, status int, duration time.Duration) {
	slog.Info("request",
		"method", r.Method,
		"path", r.URL.Path,
		"status", status,
		"duration_ms", duration.Milliseconds(),
	)
}
