package models

import "time"

// Vehicle represents a registered fleet vehicle.
type Vehicle struct {
	ID            string    `json:"id" db:"id"`
	VehicleNumber string    `json:"vehicle_number" db:"vehicle_number"`
	DriverName    string    `json:"driver_name" db:"driver_name"`
	VehicleType   string    `json:"vehicle_type" db:"vehicle_type"`
	Phone         string    `json:"phone" db:"phone"`
	Status        string    `json:"status" db:"status"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// CreateVehicleRequest is the payload for registering a vehicle.
type CreateVehicleRequest struct {
	VehicleNumber string `json:"vehicle_number" binding:"required"`
	DriverName    string `json:"driver_name" binding:"required"`
	VehicleType   string `json:"vehicle_type" binding:"required"`
	Phone         string `json:"phone" binding:"required"`
}

// VehicleWithLocation contains vehicle details with last known position and geofence state.
type VehicleWithLocation struct {
	ID               string                 `json:"id"`
	VehicleNumber    string                 `json:"vehicle_number"`
	DriverName       string                 `json:"driver_name"`
	VehicleType      string                 `json:"vehicle_type"`
	Phone            string                 `json:"phone"`
	Status           string                 `json:"status"`
	LastLocation     *LastLocationInfo      `json:"last_location,omitempty"`
	CurrentGeofences []string               `json:"current_geofences"`
	CreatedAt        time.Time              `json:"created_at"`
}

type LastLocationInfo struct {
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	RecordedAt time.Time `json:"recorded_at"`
}

// Geofence represents a defined geographical boundary.
type Geofence struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Category    string    `json:"category" db:"category"`
	Status      string    `json:"status" db:"status"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// CreateGeofenceRequest is the payload for creating a new geofence.
type CreateGeofenceRequest struct {
	Name        string        `json:"name" binding:"required"`
	Description string        `json:"description"`
	Category    string        `json:"category" binding:"required"`
	Coordinates [][]float64   `json:"coordinates" binding:"required"` // [latitude, longitude] pairs
}

// GeofenceItem represents a geofence with parsed coordinates and point count.
type GeofenceItem struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Category    string        `json:"category"`
	Status      string        `json:"status"`
	Coordinates [][]float64   `json:"coordinates"`
	PointCount  int           `json:"point_count"`
	CreatedAt   time.Time     `json:"created_at"`
}

// UpdateLocationRequest is the payload for GPS telemetry updates.
type UpdateLocationRequest struct {
	VehicleID string    `json:"vehicle_id" binding:"required"`
	Latitude  float64   `json:"latitude" binding:"required"`
	Longitude float64   `json:"longitude" binding:"required"`
	Timestamp time.Time `json:"timestamp" binding:"required"`
}

// GeofenceBrief provides lightweight identification of a geofence.
type GeofenceBrief struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
}

// GeneratedEventBrief summarizes a transition event generated during a location update.
type GeneratedEventBrief struct {
	EventID      string    `json:"event_id"`
	EventType    string    `json:"event_type"` // "entry" or "exit"
	GeofenceID   string    `json:"geofence_id"`
	GeofenceName string    `json:"geofence_name"`
	Timestamp    time.Time `json:"timestamp"`
}

// LocationUpdateResponse is returned by POST /vehicles/location.
type LocationUpdateResponse struct {
	VehicleID        string                `json:"vehicle_id"`
	CurrentGeofences []GeofenceBrief       `json:"current_geofences"`
	EventsGenerated  []GeneratedEventBrief `json:"events_generated"`
	TimeNS           string                `json:"time_ns"`
}

// CurrentVehicleLocationResponse is returned by GET /vehicles/location/{vehicle_id}.
type CurrentVehicleLocationResponse struct {
	Vehicle struct {
		ID            string `json:"id"`
		VehicleNumber string `json:"vehicle_number"`
		DriverName    string `json:"driver_name"`
		VehicleType   string `json:"vehicle_type"`
	} `json:"vehicle"`
	CurrentLocation *LastLocationInfo `json:"current_location,omitempty"`
	CurrentGeofences []GeofenceBrief  `json:"current_geofences"`
	TimeNS           string           `json:"time_ns"`
}

// AlertConfiguration defines an alert rule.
type AlertConfiguration struct {
	ID          string    `json:"id" db:"id"`
	GeofenceID  string    `json:"geofence_id" db:"geofence_id"`
	VehicleID   *string   `json:"vehicle_id" db:"vehicle_id"` // null matches all vehicles
	EventType   string    `json:"event_type" db:"event_type"` // "entry", "exit", "both"
	Status      string    `json:"status" db:"status"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// ConfigureAlertRequest is the payload for POST /alerts/configure.
type ConfigureAlertRequest struct {
	GeofenceID string  `json:"geofence_id" binding:"required"`
	VehicleID  *string `json:"vehicle_id"` // Optional
	EventType  string  `json:"event_type" binding:"required"` // "entry", "exit", "both"
}

// AlertConfigDetail contains enriched alert rule information.
type AlertConfigDetail struct {
	ID               string    `json:"id"`
	GeofenceID       string    `json:"geofence_id"`
	GeofenceName     string    `json:"geofence_name"`
	GeofenceCategory string    `json:"geofence_category"`
	VehicleID        *string   `json:"vehicle_id,omitempty"`
	VehicleNumber    *string   `json:"vehicle_number,omitempty"`
	DriverName       *string   `json:"driver_name,omitempty"`
	EventType        string    `json:"event_type"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
}

// GeofenceEvent records historical boundary transitions.
type GeofenceEvent struct {
	ID             string    `json:"id" db:"id"`
	VehicleID      string    `json:"vehicle_id" db:"vehicle_id"`
	GeofenceID     string    `json:"geofence_id" db:"geofence_id"`
	EventType      string    `json:"event_type" db:"event_type"`
	Latitude       float64   `json:"latitude" db:"latitude"`
	Longitude      float64   `json:"longitude" db:"longitude"`
	EventTimestamp time.Time `json:"event_timestamp" db:"event_timestamp"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// ViolationHistoryItem is returned by GET /violations/history.
type ViolationHistoryItem struct {
	EventID          string    `json:"event_id"`
	VehicleID        string    `json:"vehicle_id"`
	VehicleNumber    string    `json:"vehicle_number"`
	DriverName       string    `json:"driver_name"`
	GeofenceID       string    `json:"geofence_id"`
	GeofenceName     string    `json:"geofence_name"`
	GeofenceCategory string    `json:"geofence_category"`
	EventType        string    `json:"event_type"`
	Latitude         float64   `json:"latitude"`
	Longitude        float64   `json:"longitude"`
	EventTimestamp   time.Time `json:"event_timestamp"`
	CreatedAt        time.Time `json:"created_at"`
}

// WSAlertPayload is broadcast over /ws/alerts.
type WSAlertPayload struct {
	EventID   string    `json:"event_id"`
	EventType string    `json:"event_type"`
	Timestamp time.Time `json:"timestamp"`
	Severity  string    `json:"severity"` // "critical", "warning", "informational"
	Vehicle   struct {
		VehicleID     string `json:"vehicle_id"`
		VehicleNumber string `json:"vehicle_number"`
		DriverName    string `json:"driver_name"`
	} `json:"vehicle"`
	Geofence struct {
		GeofenceID   string `json:"geofence_id"`
		GeofenceName string `json:"geofence_name"`
		Category     string `json:"category"`
	} `json:"geofence"`
	Location struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"location"`
}

// ErrorResponse is the standardized error response envelope.
type ErrorResponse struct {
	Error  string `json:"error"`
	Code   string `json:"code"`
	TimeNS string `json:"time_ns"`
}

