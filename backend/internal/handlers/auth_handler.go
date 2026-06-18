package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/njoubert/nielsshootsfilm/backend/internal/services"
)

// AuthHandler handles authentication requests.
type AuthHandler struct {
	authService *services.AuthService
	logger      *slog.Logger
}

// NewAuthHandler creates a new auth handler.
func NewAuthHandler(authService *services.AuthService, logger *slog.Logger) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		logger:      logger,
	}
}

// Login handles login requests.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Authenticate
	sessionID, err := h.authService.Authenticate(req.Username, req.Password)
	if err != nil {
		h.logger.Warn("login failed",
			slog.String("username", req.Username),
			slog.String("error", err.Error()),
		)
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Set session cookie
	// #nosec G124 - Secure is intentionally false for local-dev HTTP; HTTPS is
	// terminated by the reverse proxy in production. HttpOnly and SameSite are set.
	http.SetCookie(w, &http.Cookie{
		Name:     "photoadmin_session",
		Value:    sessionID,
		Path:     "/",
		MaxAge:   24 * 60 * 60, // 24 hours
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteStrictMode,
	})

	h.logger.Info("user logged in",
		slog.String("username", req.Username),
	)

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Login successful",
	})
}

// Logout handles logout requests.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("photoadmin_session")
	if err == nil {
		h.authService.InvalidateSession(cookie.Value)
	}

	// Clear cookie
	// #nosec G124 - Secure is intentionally false for local-dev HTTP; HTTPS is
	// terminated by the reverse proxy in production. HttpOnly and SameSite are set.
	http.SetCookie(w, &http.Cookie{
		Name:     "photoadmin_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
	})

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Logout successful",
	})
}

// ChangePassword handles password change requests.
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.authService.ChangePassword(req.OldPassword, req.NewPassword); err != nil {
		h.logger.Error("password change failed", slog.String("error", err.Error()))
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	h.logger.Info("password changed")

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Password changed successfully",
	})
}

// StartSessionCleanup starts a goroutine to periodically clean up expired sessions.
func (h *AuthHandler) StartSessionCleanup() {
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			h.authService.CleanupExpiredSessions()
			h.logger.Debug("cleaned up expired sessions")
		}
	}()
}
