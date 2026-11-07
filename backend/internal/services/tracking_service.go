package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"geotrack/backend/internal/models"
	"geotrack/backend/internal/websocket"
)

var (
	ErrInvalidCoordinates = errors.New("invalid coordinates: latitude must be in [-90, 90] and longitude in [-180, 180]")
	ErrInvalidTimestamp   = errors.New("invalid timestamp")
)

type TrackingService struct {
	db         *sql.DB
	dispatcher *websocket.Dispatcher
}

func NewTrackingService(db *sql.DB, dispatcher *websocket.Dispatcher) *TrackingService {
	return &TrackingService{
		db:         db,
		dispatcher: dispatcher,
	}
}

func (s *TrackingService) ProcessLocation(req models.UpdateLocationRequest) (*models.LocationUpdateResponse, error) {
	// 1. Validate coordinates
	if req.Latitude < -90.0 || req.Latitude > 90.0 || req.Longitude < -180.0 || req.Longitude > 180.0 {
		return nil, ErrInvalidCoordinates
	}
	if req.Timestamp.IsZero() {
		return nil, ErrInvalidTimestamp
	}

	// 2. Validate Vehicle exists
	var vehicle models.Vehicle
	err := s.db.QueryRow(
		"SELECT id, vehicle_number, driver_name, vehicle_type, phone, status FROM vehicles WHERE id = $1",
		req.VehicleID,
	).Scan(&vehicle.ID, &vehicle.VehicleNumber, &vehicle.DriverName, &vehicle.VehicleType, &vehicle.Phone, &vehicle.Status)
	if err == sql.ErrNoRows {
		return nil, ErrVehicleNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed fetching vehicle: %w", err)
	}

	// 3. Check for out-of-order GPS updates (PRD Rule 4)
	var latestRecordedAt sql.NullTime
	_ = s.db.QueryRow(
		"SELECT recorded_at FROM vehicle_locations WHERE vehicle_id = $1 ORDER BY recorded_at DESC LIMIT 1",
		req.VehicleID,
	).Scan(&latestRecordedAt)

	isStale := false
	if latestRecordedAt.Valid && IsStaleLocation(req.Timestamp, latestRecordedAt.Time) {
		isStale = true
	}

	// 4. Store location in vehicle_locations table
	_, err = s.db.Exec(
		"INSERT INTO vehicle_locations (vehicle_id, latitude, longitude, recorded_at, received_at) VALUES ($1, $2, $3, $4, NOW())",
		req.VehicleID, req.Latitude, req.Longitude, req.Timestamp,
	)
	if err != nil {
		return nil, fmt.Errorf("failed storing vehicle location: %w", err)
	}

	// 5. Query candidate active geofences covering the coordinates using PostGIS ST_Covers
	coveredGeofencesQuery := `
		SELECT id, name, category
		FROM geofences
		WHERE status = 'active'
		  AND ST_Covers(polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326))
	`
	rows, err := s.db.Query(coveredGeofencesQuery, req.Longitude, req.Latitude)
	if err != nil {
		return nil, fmt.Errorf("failed querying geofence coverage: %w", err)
	}
	defer rows.Close()

	currentlyCoveredMap := make(map[string]models.GeofenceBrief)
	var currentGeofencesList []models.GeofenceBrief

	for rows.Next() {
		var g models.GeofenceBrief
		if err := rows.Scan(&g.ID, &g.Name, &g.Category); err == nil {
			currentlyCoveredMap[g.ID] = g
			currentGeofencesList = append(currentGeofencesList, g)
		}
	}
	if currentGeofencesList == nil {
		currentGeofencesList = []models.GeofenceBrief{}
	}

	// If update is stale, do not regress current membership or generate transitions
	if isStale {
		return &models.LocationUpdateResponse{
			VehicleID:        req.VehicleID,
			CurrentGeofences: currentGeofencesList,
			EventsGenerated:  []models.GeneratedEventBrief{},
		}, nil
	}

	// 6. Query all all active geofences in the system to evaluate entry and exit
	allGeofencesRows, err := s.db.Query("SELECT id, name, category FROM geofences WHERE status = 'active'")
	if err != nil {
		return nil, fmt.Errorf("failed querying all geofences: %w", err)
	}
	defer allGeofencesRows.Close()

	allGeofences := make(map[string]models.GeofenceBrief)
	for allGeofencesRows.Next() {
		var g models.GeofenceBrief
		if err := allGeofencesRows.Scan(&g.ID, &g.Name, &g.Category); err == nil {
			allGeofences[g.ID] = g
		}
	}

	// 7. Retrieve previous membership states from vehicle_geofence_states
	stateRows, err := s.db.Query(
		"SELECT geofence_id, is_inside FROM vehicle_geofence_states WHERE vehicle_id = $1",
		req.VehicleID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed querying vehicle geofence states: %w", err)
	}
	defer stateRows.Close()

	previousStates := make(map[string]bool)
	hasPriorState := false
	for stateRows.Next() {
		var gID string
		var isInside bool
		if err := stateRows.Scan(&gID, &isInside); err == nil {
			previousStates[gID] = isInside
			hasPriorState = true
		}
	}

	var eventsGenerated []models.GeneratedEventBrief

	// 8. Rule 2: Initial location fix initialization
	if !hasPriorState {
		// Initialize states for all active geofences without generating artificial transitions
		for gID := range allGeofences {
			_, isInside := currentlyCoveredMap[gID]
			upsertQuery := `
				INSERT INTO vehicle_geofence_states (vehicle_id, geofence_id, is_inside, last_event_at, updated_at)
				VALUES ($1, $2, $3, $4, NOW())
				ON CONFLICT (vehicle_id, geofence_id)
				DO UPDATE SET is_inside = EXCLUDED.is_inside, updated_at = NOW()
			`
			_, _ = s.db.Exec(upsertQuery, req.VehicleID, gID, isInside, req.Timestamp)
		}

		return &models.LocationUpdateResponse{
			VehicleID:        req.VehicleID,
			CurrentGeofences: currentGeofencesList,
			EventsGenerated:  []models.GeneratedEventBrief{},
		}, nil
	}

	// 9. Evaluate transitions for all active geofences
	for gID, geofenceInfo := range allGeofences {
		_, isInsideNow := currentlyCoveredMap[gID]
		prevInside := previousStates[gID] // defaults to false if newly created geofence

		transition := DetectTransition(true, prevInside, isInsideNow)
		if transition == TransitionNone {
			continue
		}

		// Transition detected (entry or exit)
		eventType := string(transition)

		// A. Persist Geofence Event
		var eventID string
		insertEventQuery := `
			INSERT INTO geofence_events (vehicle_id, geofence_id, event_type, latitude, longitude, event_timestamp, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, NOW())
			RETURNING id
		`
		err := s.db.QueryRow(
			insertEventQuery,
			req.VehicleID, gID, eventType, req.Latitude, req.Longitude, req.Timestamp,
		).Scan(&eventID)
		if err != nil {
			return nil, fmt.Errorf("failed persisting geofence event: %w", err)
		}

		// B. Update vehicle_geofence_states
		upsertStateQuery := `
			INSERT INTO vehicle_geofence_states (vehicle_id, geofence_id, is_inside, last_event_at, updated_at)
			VALUES ($1, $2, $3, $4, NOW())
			ON CONFLICT (vehicle_id, geofence_id)
			DO UPDATE SET is_inside = EXCLUDED.is_inside, last_event_at = EXCLUDED.last_event_at, updated_at = NOW()
		`
		_, _ = s.db.Exec(upsertStateQuery, req.VehicleID, gID, isInsideNow, req.Timestamp)

		eventsGenerated = append(eventsGenerated, models.GeneratedEventBrief{
			EventID:      eventID,
			EventType:    eventType,
			GeofenceID:   gID,
			GeofenceName: geofenceInfo.Name,
			Timestamp:    req.Timestamp,
		})

		// C. Alert Rule Matching
		s.matchAndDispatchAlerts(eventID, eventType, req.Timestamp, vehicle, geofenceInfo, req.Latitude, req.Longitude)
	}

	if eventsGenerated == nil {
		eventsGenerated = []models.GeneratedEventBrief{}
	}

	return &models.LocationUpdateResponse{
		VehicleID:        req.VehicleID,
		CurrentGeofences: currentGeofencesList,
		EventsGenerated:  eventsGenerated,
	}, nil
}

func (s *TrackingService) matchAndDispatchAlerts(
	eventID, eventType string,
	timestamp time.Time,
	vehicle models.Vehicle,
	geofence models.GeofenceBrief,
	lat, lng float64,
) {
	// Query matching active alert rules for this geofence
	query := `
		SELECT id, event_type, vehicle_id
		FROM alert_configurations
		WHERE geofence_id = $1 AND status = 'active'
	`
	rows, err := s.db.Query(query, geofence.ID)
	if err != nil {
		return
	}
	defer rows.Close()

	matched := false
	for rows.Next() {
		var ruleID, ruleEventType string
		var ruleVehicleID *string
		if err := rows.Scan(&ruleID, &ruleEventType, &ruleVehicleID); err == nil {
			if MatchesAlertRule(&ruleEventType, ruleVehicleID, eventType, vehicle.ID) {
				matched = true
			}
		}
	}

	if !matched {
		return
	}

	// Persist alert notification audit record
	_, _ = s.db.Exec(
		"INSERT INTO alert_notifications (event_id, delivery_status, created_at, delivered_at) VALUES ($1, 'delivered', NOW(), NOW())",
		eventID,
	)

	// Build and dispatch real-time WebSocket notification asynchronously
	severity := DetermineSeverity(geofence.Category, eventType)

	payload := models.WSAlertPayload{
		EventID:   eventID,
		EventType: eventType,
		Timestamp: timestamp,
		Severity:  severity,
	}
	payload.Vehicle.VehicleID = vehicle.ID
	payload.Vehicle.VehicleNumber = vehicle.VehicleNumber
	payload.Vehicle.DriverName = vehicle.DriverName

	payload.Geofence.GeofenceID = geofence.ID
	payload.Geofence.GeofenceName = geofence.Name
	payload.Geofence.Category = geofence.Category

	payload.Location.Latitude = lat
	payload.Location.Longitude = lng

	s.dispatcher.Enqueue(payload)
}

func (s *TrackingService) GetCurrentLocation(vehicleID string) (*models.CurrentVehicleLocationResponse, error) {
	// 1. Vehicle info
	var resp models.CurrentVehicleLocationResponse
	err := s.db.QueryRow(
		"SELECT id, vehicle_number, driver_name, vehicle_type FROM vehicles WHERE id = $1",
		vehicleID,
	).Scan(&resp.Vehicle.ID, &resp.Vehicle.VehicleNumber, &resp.Vehicle.DriverName, &resp.Vehicle.VehicleType)
	if err == sql.ErrNoRows {
		return nil, ErrVehicleNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed fetching vehicle: %w", err)
	}

	// 2. Latest Location
	var lat, lng sql.NullFloat64
	var recTime sql.NullTime
	queryLoc := `SELECT latitude, longitude, recorded_at FROM vehicle_locations WHERE vehicle_id = $1 ORDER BY recorded_at DESC LIMIT 1`
	err = s.db.QueryRow(queryLoc, vehicleID).Scan(&lat, &lng, &recTime)
	if err == nil && lat.Valid && lng.Valid && recTime.Valid {
		resp.CurrentLocation = &models.LastLocationInfo{
			Latitude:   lat.Float64,
			Longitude:  lng.Float64,
			RecordedAt: recTime.Time,
		}
	}

	// 3. Current active geofences where is_inside = true
	queryGeo := `
		SELECT g.id, g.name, g.category
		FROM vehicle_geofence_states s
		JOIN geofences g ON g.id = s.geofence_id
		WHERE s.vehicle_id = $1 AND s.is_inside = true AND g.status = 'active'
	`
	rows, err := s.db.Query(queryGeo, vehicleID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var g models.GeofenceBrief
			if err := rows.Scan(&g.ID, &g.Name, &g.Category); err == nil {
				resp.CurrentGeofences = append(resp.CurrentGeofences, g)
			}
		}
	}
	if resp.CurrentGeofences == nil {
		resp.CurrentGeofences = []models.GeofenceBrief{}
	}

	return &resp, nil
}

