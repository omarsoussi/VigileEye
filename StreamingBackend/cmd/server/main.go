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

	"github.com/vigileye/streaming-backend/internal/api/middleware"
	"github.com/vigileye/streaming-backend/internal/api/routes"
	"github.com/vigileye/streaming-backend/internal/application/usecases"
	"github.com/vigileye/streaming-backend/internal/infrastructure/config"
	"github.com/vigileye/streaming-backend/internal/infrastructure/external"
	"github.com/vigileye/streaming-backend/internal/infrastructure/persistence"
	"github.com/vigileye/streaming-backend/internal/infrastructure/security"
	"github.com/vigileye/streaming-backend/internal/infrastructure/streaming"
)

func main() {
	// ─── Load Configuration ───
	cfg := config.Load()

	// ─── Setup Logger ───
	setupLogger(cfg.LogLevel)

	log.Info().
		Int("port", cfg.Port).
		Str("camera_service", cfg.CameraServiceURL).
		Bool("mediamtx_enabled", cfg.MediaMTXEnabled).
		Str("mediamtx_api", cfg.MediaMTXAPIURL).
		Msg("Starting VigileEye Streaming Backend (Go)")

	// ─── Infrastructure ───
	authService := security.NewJWTAuthService(cfg)
	cameraService := external.NewHTTPCameraService(cfg)
	sessionRepo := persistence.NewInMemoryStreamSessionRepo()
	streamManager := streaming.NewStreamManager(cfg, sessionRepo)

	// ─── Use Cases ───
	startStreamUC := usecases.NewStartStreamUseCase(streamManager, cameraService)
	stopStreamUC := usecases.NewStopStreamUseCase(streamManager)
	getStatusUC := usecases.NewGetStreamStatusUseCase(streamManager, cfg)
	listActiveUC := usecases.NewListActiveStreamsUseCase(streamManager)
	negotiateUC := usecases.NewNegotiateViewerUseCase(streamManager, cameraService)

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
	streamHandler := routes.NewStreamHandler(
		startStreamUC,
		stopStreamUC,
		getStatusUC,
		listActiveUC,
		negotiateUC,
		streamManager,
		cfg,
	)
	streamHandler.RegisterRoutes(v1, authService)

	// ─── HTTP Server ───
	addr := fmt.Sprintf("0.0.0.0:%d", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
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
	log.Info().Str("signal", sig.String()).Msg("Shutting down server...")

	// Stop all active streams
	streamManager.StopAll()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited cleanly")
}

// setupLogger configures zerolog.
func setupLogger(level string) {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix

	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}

// corsMiddleware configures CORS for the frontend.
func corsMiddleware() gin.HandlerFunc {
	return cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length", "X-VigileEye-Placeholder"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	})
}
