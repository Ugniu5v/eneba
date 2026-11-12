package httpapi

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"eneba-market/backend/internal/ids"
	"eneba-market/backend/internal/store"

	"golang.org/x/crypto/bcrypt"
)

type authPayload struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var payload authPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Check the form and try again.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(payload.Email))
	displayName := strings.TrimSpace(payload.DisplayName)
	if !validEmail(email) {
		writeError(w, http.StatusBadRequest, "invalid_email", "Enter a valid email address.")
		return
	}
	if utf8.RuneCountInString(displayName) < 2 || utf8.RuneCountInString(displayName) > 50 {
		writeError(w, http.StatusBadRequest, "invalid_name", "Your display name must be 2–50 characters.")
		return
	}
	if len(payload.Password) < 8 || len(payload.Password) > 72 {
		writeError(w, http.StatusBadRequest, "invalid_password", "Password must be 8–72 characters.")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not create your account.")
		return
	}
	user, err := s.store.CreateUser(r.Context(), email, displayName, string(hash))
	if errors.Is(err, store.ErrEmailTaken) {
		writeError(w, http.StatusConflict, "email_taken", "An account with this email already exists.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not create your account.")
		return
	}
	if err := s.issueSession(r, w, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Account created, but sign-in failed. Try signing in.")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"user": user})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var payload authPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Check the form and try again.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(payload.Email))
	if email == "" || payload.Password == "" {
		writeError(w, http.StatusBadRequest, "invalid_credentials", "Enter your email and password.")
		return
	}
	user, err := s.store.UserByEmail(r.Context(), email)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(payload.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Email or password is incorrect.")
		return
	}
	if err := s.issueSession(r, w, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not sign you in. Try again.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user.User})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookie); err == nil && cookie.Value != "" {
		_ = s.store.DeleteSession(r.Context(), ids.HashToken(cookie.Value))
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   s.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(r)
	if !ok {
		writeJSON(w, http.StatusOK, map[string]any{"user": nil})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (s *Server) handleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	var payload struct {
		DisplayName string `json:"displayName"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Check the form and try again.")
		return
	}
	displayName := strings.TrimSpace(payload.DisplayName)
	if utf8.RuneCountInString(displayName) < 2 || utf8.RuneCountInString(displayName) > 50 {
		writeError(w, http.StatusBadRequest, "invalid_name", "Your display name must be 2–50 characters.")
		return
	}
	updated, err := s.store.UpdateDisplayName(r.Context(), user.ID, displayName)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not update your profile.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": updated})
}

func (s *Server) issueSession(r *http.Request, w http.ResponseWriter, userID string) error {
	token := ids.SessionToken()
	expires := time.Now().UTC().AddDate(0, 0, 30)
	if err := s.store.CreateSession(r.Context(), userID, ids.HashToken(token), expires); err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(time.Until(expires).Seconds()),
		Expires:  expires,
	})
	return nil
}

func (s *Server) currentUser(r *http.Request) (store.User, bool) {
	cookie, err := r.Cookie(sessionCookie)
	if err != nil || cookie.Value == "" {
		return store.User{}, false
	}
	user, err := s.store.UserBySession(r.Context(), ids.HashToken(cookie.Value))
	if err != nil {
		return store.User{}, false
	}
	return user, true
}

func (s *Server) requireUser(w http.ResponseWriter, r *http.Request) (store.User, bool) {
	user, ok := s.currentUser(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication_required", "Sign in to continue.")
		return store.User{}, false
	}
	return user, true
}

func validEmail(email string) bool {
	if len(email) > 254 || email == "" || strings.ContainsAny(email, " \t\n\r") {
		return false
	}
	addr, err := mail.ParseAddress(email)
	if err != nil {
		return false
	}
	return strings.EqualFold(addr.Address, email) && strings.Contains(strings.Split(email, "@")[len(strings.Split(email, "@"))-1], ".")
}
