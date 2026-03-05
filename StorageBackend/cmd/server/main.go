package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/vigileye/storage-backend/internal/api/middleware"
	"github.com/vigileye/storage-backend/internal/api/routes"
	"github.com/vigileye/storage-backend/internal/application/usecases"
	"github.com/vigileye/storage-backend/internal/infrastructure/config"
	"github.com/vigileye/storage-backend/internal/infrastructure/external"
	"github.com/vigileye/storage-backend/internal/infrastructure/persistence"
	"github.com/vigileye/storage-backend/internal/infrastructure/recording"
	"github.com/vigileye/storage-backend/internal/infrastructure/security"
	"github.com/vigileye/storage-backend/internal/infrastructure/storage"
)

func main() {
	// ─── Load Configuration ───
	cfg := config.Load()

	// ─── Setup Logger ───
	setupLogger(cfg.LogLevel)

	log.Info().
		Int("port", cfg.Port).
		Str("storage_mode", cfg.StorageMode).
		Str("camera_service", cfg.CameraServiceURL).
		Msg("Starting VigileEye Storage Backend (Go)")

	// ─── Infrastructure ───
	authService := security.NewJWTAuthService(cfg)
	cameraService := external.NewHTTPCameraService(cfg)

	// Storage backend (Local/MinIO/Azure via factory)
	storageBackend, err := storage.NewStorageBackend(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize storage backend")
	}

	// Repositories (in-memory for MVP; swap with pgx for production)
	recordingRepo := persistence.NewInMemoryRecordingRepo()
	configRepo := persistence.NewInMemoryStorageConfigRepo()

	// Recording manager
	recManager := recording.NewRecordingManager(cfg, storageBackend)
	recManager.SetRecordingRepo(recordingRepo)

	// Retention cleaner (cron job)
	retentionCleaner := recording.NewRetentionCleaner(recordingRepo, configRepo, storageBackend)
	retentionCleaner.Start()

	// ─── Use Cases ───
	startRecUC := usecases.NewStartRecordingUseCase(recManager, cameraService, recordingRepo, configRepo, cfg)
	stopRecUC := usecases.NewStopRecordingUseCase(recManager, recordingRepo)
	listRecUC := usecases.NewListRecordingsUseCase(recordingRepo)
	metricsUC := usecases.NewGetStorageMetricsUseCase(recordingRepo, configRepo)
	configUC := usecases.NewManageStorageConfigUseCase(configRepo)

	// ─── HTTP Router ───
	if cfg.LogLevel != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.RequestLogger())
	router.Use(corsMiddleware())

	// Health endpoint (no auth)
	router.GET("/health", routes.HealthCheck)

	// API v1 routes
	v1 := router.Group("/api/v1")
	storageHandler := routes.NewStorageHandler(
		startRecUC,
		stopRecUC,
		listRecUC,
		metricsUC,
		configUC,
		recordingRepo,
		recManager,
		storageBackend,
		cfg,
	)
	storageHandler.RegisterRoutes(v1, authService)

	// ─── HTTP Server ───
	addr := fmt.Sprintf("0.0.0.0:%d", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 120 * time.Second,  // Increased for large file transfers
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info().Str("addr", addr).Msg("HTTP server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// ─── Graceful Shutdown ───
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Info().Str("signal", sig.String()).Msg("Shutting down...")

	// Stop all active recordings
	recManager.StopAll()

	// Stop retention cleaner
	retentionCleaner.Stop()

	// Shutdown server
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Server forced shutdown")
	}

	log.Info().Msg("Storage backend stopped")
}

func setupLogger(level string) {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).
		With().Timestamp().Caller().Logger()

	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length", "Content-Range", "Accept-Ranges"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}
