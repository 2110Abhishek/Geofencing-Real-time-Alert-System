package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"geotrack/backend/internal/middleware"
	"geotrack/backend/internal/models"
	"geotrack/backend/internal/services"
	"geotrack/backend/internal/websocket"
)

type APIHandler struct {
	vehicleService  *services.VehicleService
	geofenceService *services.GeofenceService
	trackingService *services.TrackingService
	alertService    *services.AlertService
	historyService  *services.HistoryService
	wsHub           *websocket.Hub
}

func NewAPIHandler(
	vs *services.VehicleService,
	gs *services.GeofenceService,
	ts *services.TrackingService,
	as *services.AlertService,
	hs *services.HistoryService,
	hub *websocket.Hub,
) *APIHandler {
	return &APIHandler{
		vehicleService:  vs,
		geofenceService: gs,
		trackingService: ts,
		alertService:    as,
		historyService:  hs,
		wsHub:           hub,
	}
}

// RespondError sends a standardized error response with time_ns.
func RespondError(c *gin.Context, status int, code, msg string) {
	timeNS := middleware.GetElapsedNanoseconds(c)
	c.JSON(status, gin.H{
		"error":   msg,
		"code":    code,
		"time_ns": timeNS,
	})
}

// 1. POST /geofences - Create geofence
func (h *APIHandler) CreateGeofence(c *gin.Context) {
	var req models.CreateGeofenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request payload: "+err.Error())
		return
	}

	item, err := h.geofenceService.CreateGeofence(req)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCategory) {
			RespondError(c, http.StatusBadRequest, "INVALID_CATEGORY", err.Error())
			return
		}
		RespondError(c, http.StatusBadRequest, "INVALID_GEOFENCE", err.Error())
		return
	}

	timeNS := middleware.GetElapsedNanoseconds(c)
	c.JSON(http.StatusCreated, gin.H{
		"id":          item.ID,
		"name":        item.Name,
		"description": item.Description,
		"category":    item.Category,
		"status":      item.Status,
		"coordinates": item.Coordinates,
		"created_at":  item.CreatedAt,
		"time_ns":     timeNS,
	})
}

// 2. GET /geofences - Retrieve geofences
func (h *APIHandler) GetGeofences(c *gin.Context) {
	category := c.Query("category")
	items, err := h.geofenceService.GetGeofences(category)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	timeNS := middleware.GetElapsedNanoseconds(c)
	c.JSON(http.StatusOK, gin.H{
		"geofences": items,
		"total":     len(items),
		"time_ns":   timeNS,
	})
}

// 3. POST /vehicles - Register vehicle
func (h *APIHandler) RegisterVehicle(c *gin.Context) {
	var req models.CreateVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid vehicle payload: "+err.Error())
		return
	}

	v, err := h.vehicleService.RegisterVehicle(req)
	if err != nil {
		if errors.Is(err, services.ErrVehicleExists) {
			RespondError(c, http.StatusConflict, "VEHICLE_EXISTS", err.Error())
			return
		}
		RespondError(c, http.StatusBadRequest, "REGISTRATION_FAILED", err.Error())
		return
	}

	timeNS := middleware.GetElapsedNanoseconds(c)
	c.JSON(http.StatusCreated, gin.H{
		"id":             v.ID,
		"vehicle_number": v.VehicleNumber,
		"driver_name":    v.DriverName,
		"vehicle_type":   v.VehicleType,
		"phone":          v.Phone,
		"status":         v.Status,
		"created_at":     v.CreatedAt,
		"time_ns":        timeNS,
	})
}

// 4. GET /vehicles - Retrieve vehicles
func (h *APIHandler) GetVehicles(c *gin.Context) {
	vehicles, err := h.vehicleService.GetVehicles()
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	timeNS := middleware.GetElapsedNanoseconds(c)
	c.JSON(http.StatusOK, gin.H{
		"vehicles": vehicles,
		"total":    len(vehicles),
		"time_ns":  timeNS,
	})
}

// 5. POST /vehicles/location - Update vehicle location
func (h *APIHandler) UpdateVehicleLocation(c *gin.Context) {
	var req models.UpdateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid location payload: "+err.Error())
		return
	}

	resp, err := h.trackingService.ProcessLocation(req)
	if err != nil {
		if errors.Is(err, services.ErrVehicleNotFound) {
			RespondError(c, http.StatusNotFound, "VEHICLE_NOT_FOUND", err.Error())
			return
		}
		if errors.Is(err, services.ErrInvalidCoordinates) || errors.Is(err, services.ErrInvalidTimestamp) {
			RespondError(c, http.StatusBadRequest, "INVALID_LOCATION_DATA", err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "PROCESSING_ERROR", err.Error())
		return
	}

	resp.TimeNS = middleware.GetElapsedNanoseconds(c)
	c.JSON(http.StatusOK, resp)
}

// 6. GET /vehicles/location/:vehicle_id - Retrieve current vehicle location
func (h *APIHandler) GetCurrentVehicleLocation(c *gin.Context) {
	vehicleID := c.Param("vehicle_id")
	if vehicleID == "" {
		RespondError(c, http.StatusBadRequest, "MISSING_VEHICLE_ID", "Vehicle ID parameter is required")
		return
	}

	resp, err := h.trackingService.GetCurrentLocation(vehicleID)
	if err != nil {
		if errors.Is(err, services.ErrVehicleNotFound) {
			RespondError(c, http.StatusNotFound, "VEHICLE_NOT_FOUND", err.Error())
			return
		}
		RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	resp.TimeNS = middleware.GetElapsedNanoseconds(c)
	c.JSON(http.StatusOK, resp)
}

// 7. POST /alerts/configure - Configure alert rule
func (h *APIHandler) ConfigureAlert(c *gin.Context) {
	var req models.ConfigureAlertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid alert configuration payload: "+err.Error())
		return
	}

	detail, err := h.alertService.ConfigureAlert(req)
	if err != nil {
		if errors.Is(err, services.ErrGeofenceNotFound) {
			RespondError(c, http.StatusNotFound, "GEOFENCE_NOT_FOUND", err.Error())
			return
		}
		if errors.Is(err, services.ErrVehicleNotFound) {
			RespondError(c, http.StatusNotFound, "VEHICLE_NOT_FOUND", err.Error())
			return
		}
		if errors.Is(err, services.ErrInvalidEventType) {
			RespondError(c, http.StatusBadRequest, "INVALID_EVENT_TYPE", err.Error())
			return
		}
		RespondError(c, http.StatusBadRequest, "CONFIG_FAILED", err.Error())
		return
	}

	timeNS := middleware.GetElapsedNanoseconds(c)
	c.JSON(http.StatusCreated, gin.H{
		"id":          detail.ID,
		"geofence_id": detail.GeofenceID,
		"vehicle_id":  detail.VehicleID,
		"event_type":  detail.EventType,
		"status":      detail.Status,
		"created_at":  detail.CreatedAt,
		"time_ns":     timeNS,
	})
}

// 8. GET /alerts - Retrieve alert configurations
func (h *APIHandler) GetAlerts(c *gin.Context) {
	geofenceID := c.Query("geofence_id")
	vehicleID := c.Query("vehicle_id")

	alerts, err := h.alertService.GetAlertConfigurations(geofenceID, vehicleID)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	timeNS := middleware.GetElapsedNanoseconds(c)
	c.JSON(http.StatusOK, gin.H{
		"alerts":  alerts,
		"total":   len(alerts),
		"time_ns": timeNS,
	})
}

// 9. GET /violations/history - Retrieve historical events
func (h *APIHandler) GetViolationHistory(c *gin.Context) {
	vehicleID := c.Query("vehicle_id")
	geofenceID := c.Query("geofence_id")
	eventType := c.Query("event_type")

	var startDate, endDate *time.Time
	if sDateStr := c.Query("start_date"); sDateStr != "" {
		if t, err := time.Parse(time.RFC3339, sDateStr); err == nil {
			startDate = &t
		}
	}
	if eDateStr := c.Query("end_date"); eDateStr != "" {
		if t, err := time.Parse(time.RFC3339, eDateStr); err == nil {
			endDate = &t
		}
	}

	limit := 50
	if lStr := c.Query("limit"); lStr != "" {
		if parsed, err := strconv.Atoi(lStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	offset := 0
	if oStr := c.Query("offset"); oStr != "" {
		if parsed, err := strconv.Atoi(oStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	events, total, err := h.historyService.GetViolationHistory(vehicleID, geofenceID, eventType, startDate, endDate, limit, offset)
	if err != nil {
		RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	timeNS := middleware.GetElapsedNanoseconds(c)
	c.JSON(http.StatusOK, gin.H{
		"events":  events,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
		"time_ns": timeNS,
	})
}

// ServeWebSocket upgrades HTTP request to Gorilla WebSocket connection.
func (h *APIHandler) ServeWebSocket(c *gin.Context) {
	websocket.ServeWs(h.wsHub, c.Writer, c.Request)
}

