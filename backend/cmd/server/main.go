package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"geotrack/backend/internal/config"
	"geotrack/backend/internal/database"
	"geotrack/backend/internal/handlers"
	"geotrack/backend/internal/middleware"
	"geotrack/backend/internal/services"
	"geotrack/backend/internal/websocket"
)

func main() {
	log.Println("[GeoTrack] Starting server...")

	// 1. Load Configuration
	cfg := config.LoadConfig()

	// 2. Initialize Database Connection
	db, err := database.InitDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[GeoTrack] Failed to connect to database: %v", err)
	}
	defer db.Close()

	// 3. Run Database Migrations
	if err := database.RunMigrations(db, "internal/database/migrations"); err != nil {
		log.Printf("[GeoTrack] Migration notice: %v", err)
	}

	// 4. Initialize WebSocket Hub & Dispatcher
	wsHub := websocket.NewHub()
	go wsHub.Run()

	dispatcher := websocket.NewDispatcher(wsHub)

	// 5. Initialize Services
	vehicleService := services.NewVehicleService(db)
	geofenceService := services.NewGeofenceService(db)
	trackingService := services.NewTrackingService(db, dispatcher)
	alertService := services.NewAlertService(db)
	historyService := services.NewHistoryService(db)

	// 6. Initialize API Handler
	handler := handlers.NewAPIHandler(
		vehicleService,
		geofenceService,
		trackingService,
		alertService,
		historyService,
		wsHub,
	)

	// 7. Setup Gin Router
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORSMiddleware(cfg.AllowedOrigins))
	router.Use(middleware.ExecutionTimer())

	// Health Check
	router.GET("/health", func(c *gin.Context) {
		timeNS := middleware.GetElapsedNanoseconds(c)
		c.JSON(http.StatusOK, gin.H{
			"status":   "healthy",
			"database": "connected",
			"time_ns":  timeNS,
		})
	})

	// Required 9 Endpoints
	router.POST("/geofences", handler.CreateGeofence)
	router.GET("/geofences", handler.GetGeofences)
	router.POST("/vehicles", handler.RegisterVehicle)
	router.GET("/vehicles", handler.GetVehicles)
	router.POST("/vehicles/location", handler.UpdateVehicleLocation)
	router.GET("/vehicles/location/:vehicle_id", handler.GetCurrentVehicleLocation)
	router.POST("/alerts/configure", handler.ConfigureAlert)
	router.GET("/alerts", handler.GetAlerts)
	router.GET("/violations/history", handler.GetViolationHistory)

	// WebSocket Endpoint
	router.GET("/ws/alerts", handler.ServeWebSocket)

	// 8. Graceful HTTP Server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[GeoTrack] Server listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[GeoTrack] Server listen error: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[GeoTrack] Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[GeoTrack] Server forced to shutdown: %v", err)
	}

	log.Println("[GeoTrack] Server exiting gracefully.")
}

