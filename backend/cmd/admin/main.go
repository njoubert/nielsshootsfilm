package main

import (
	"flag"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	"github.com/njoubert/nielsshootsfilm/backend/internal/handlers"
	"github.com/njoubert/nielsshootsfilm/backend/internal/middleware"
	"github.com/njoubert/nielsshootsfilm/backend/internal/models"
	"github.com/njoubert/nielsshootsfilm/backend/internal/services"
)

func main() {
	// Parse CLI flags - env file is required
	envFile := flag.String("env-file", "", "path to env file to load (required)")
	flag.Parse()

	// Require --env-file flag
	if *envFile == "" {
		slog.Error("--env-file flag is required")
		flag.Usage()
		os.Exit(1)
	}

	// Load environment variables from the specified file
	if err := godotenv.Load(*envFile); err != nil {
		slog.Error("failed to load env file", slog.String("path", *envFile), slog.String("error", err.Error()))
		os.Exit(1)
	}

	// Setup structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	logger.Info("loaded env from file", slog.String("path", *envFile))

	// Get configuration from environment
	// This sets up where our plaintext database and our photo uploads are stored
	dataDir := getEnv("DATA_DIR", "../data")
	uploadDir := getEnv("UPLOAD_DIR", "../static/uploads")
	port := getEnv("PORT", "6180")

	// Initialize services
	fileService, err := services.NewFileService(dataDir)
	if err != nil {
		logger.Error("failed to create file service", slog.String("error", err.Error()))
		os.Exit(1)
	}

	// Load admin configuration from file
	var adminConfig models.AdminConfig
	if err := fileService.ReadJSON("admin_config.json", &adminConfig); err != nil {
		logger.Error("failed to load admin config",
			slog.String("error", err.Error()),
			slog.String("hint", "run ./bootstrap.sh to create admin_config.json"),
		)
		os.Exit(1)
	}

	// Allow environment variables to override config file
	adminUsername := getEnv("ADMIN_USERNAME", adminConfig.Username)

	// Now to retrieve the password hash
	var adminPasswordHash string

	// Check for password from environmental variables first (for development/testing)
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword != "" {
		logger.Info("using ADMIN_PASSWORD from environment (dev mode)")
		// Hash the plain text password
		hash, err := services.HashPassword(adminPassword) // pragma: allowlist secret
		if err != nil {
			logger.Error("failed to hash ADMIN_PASSWORD",
				slog.String("error", err.Error()),
			)
			os.Exit(1)
		}
		adminPasswordHash = hash // pragma: allowlist secret
	} else {
		// Fall back to hashed password from env or config file
		logger.Info("using ADMIN_PASSWORD from admin_config.json (prod mode)")
		adminPasswordHash = adminConfig.PasswordHash // pragma: allowlist secret
	}

	if adminPasswordHash == "" {
		logger.Error("admin password hash not configured",
			slog.String("hint", "run ./bootstrap.sh to set admin password or set ADMIN_PASSWORD in env"),
		)
		os.Exit(1)
	}

	albumService := services.NewAlbumService(fileService)
	configService := services.NewSiteConfigService(fileService)

	imageService, err := services.NewImageService(uploadDir, configService, logger)
	if err != nil {
		logger.Error("failed to create image service", slog.String("error", err.Error()))
		os.Exit(1)
	}

	// Initialize auth service (24 hour session TTL)
	authService := services.NewAuthService(adminUsername, adminPasswordHash, 24*time.Hour)
	// Configure persistence so password changes are saved to disk
	authService.SetConfigPersistence(fileService, "admin_config.json")

	// Initialize handlers
	albumHandler := handlers.NewAlbumHandler(albumService, imageService, logger)
	authHandler := handlers.NewAuthHandler(authService, logger)
	configHandler := handlers.NewConfigHandler(configService, logger)
	storageHandler := handlers.NewStorageHandler(configService, uploadDir)

	// Start session cleanup goroutine
	authHandler.StartSessionCleanup()

	// Setup router
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer(logger))
	r.Use(middleware.Logger(logger))
	r.Use(middleware.SecurityHeaders)

	// Strip trailing slashes to handle /api/albums and /api/albums/ consistently
	r.Use(chimiddleware.StripSlashes)

	// CORS middleware (allow frontend in development)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check endpoint (public)
	r.Get("/api/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// Public album download endpoint (no auth required, respects allow_downloads flag)
	r.Get("/api/albums/{slug}/download", albumHandler.DownloadAlbum)

	// Data endpoints for Admin Frontend
	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.Auth(authService, logger))

		// Album endpoints
		r.Get("/albums", albumHandler.GetAll)
		r.Get("/albums/{id}", albumHandler.GetByID)

		// Site config
		r.Get("/config", configHandler.Get)
	})

	// Admin API endpoints (require authentication)
	r.Route("/api/admin", func(r chi.Router) {
		// Auth endpoints (no auth required for login)
		r.Post("/login", authHandler.Login)
		r.Post("/logout", authHandler.Logout)

		// Protected admin routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(authService, logger))

			// Auth check endpoint
			r.Get("/auth/check", func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"authenticated":true}`))
			})

			// Album management
			r.Post("/albums", albumHandler.Create)
			r.Put("/albums/{id}", albumHandler.Update)
			r.Delete("/albums/{id}", albumHandler.Delete)
			r.Post("/albums/{id}/photos/upload", albumHandler.UploadPhotos)
			r.Delete("/albums/{id}/photos", albumHandler.DeleteAllPhotos)
			r.Delete("/albums/{id}/photos/{photoId}", albumHandler.DeletePhoto)
			r.Post("/albums/{id}/set-cover", albumHandler.SetCoverPhoto)
			r.Post("/albums/{id}/clear-cover", albumHandler.ClearCoverPhoto)
			r.Post("/albums/{id}/reorder-photos", albumHandler.ReorderPhotos)
			r.Post("/albums/{id}/set-password", albumHandler.SetPassword)
			r.Delete("/albums/{id}/password", albumHandler.RemovePassword) // Site configuration
			r.Put("/config", configHandler.Update)
			r.Put("/config/main-portfolio-album", configHandler.SetMainPortfolioAlbum)

			// Auth management
			r.Post("/change-password", authHandler.ChangePassword)

			// Storage management
			r.Get("/storage/stats", storageHandler.GetStats)
		})
	})

	// Serve static files (uploaded images)
	workDir, _ := os.Getwd()
	staticPath := filepath.Join(workDir, uploadDir)
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(staticPath))))

	// Start server
	addr := ":" + port
	logger.Info("admin server starting",
		slog.String("addr", addr),
		slog.String("data_dir", dataDir),
		slog.String("upload_dir", uploadDir),
	)

	server := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second, // Strict timeout for reading headers
		ReadTimeout:       0 * time.Minute,  // Generous timeout for file uploads on slow connections
		WriteTimeout:      10 * time.Minute, // Generous timeout for waiting for processing before sending a response
		IdleTimeout:       10 * time.Minute, // Keep-alive timeout
	}

	if err := server.ListenAndServe(); err != nil {
		logger.Error("server failed", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

// getEnv gets an environment variable with a default value.
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
