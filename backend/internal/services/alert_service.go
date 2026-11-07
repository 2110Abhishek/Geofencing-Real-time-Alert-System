package services

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"geotrack/backend/internal/models"
)

var (
	ErrInvalidEventType = errors.New("invalid event_type: must be one of entry, exit, both")
)

type AlertService struct {
	db *sql.DB
}

func NewAlertService(db *sql.DB) *AlertService {
	return &AlertService{db: db}
}

func (s *AlertService) ConfigureAlert(req models.ConfigureAlertRequest) (*models.AlertConfigDetail, error) {
	evtType := strings.ToLower(strings.TrimSpace(req.EventType))
	if evtType != "entry" && evtType != "exit" && evtType != "both" {
		return nil, ErrInvalidEventType
	}

	// 1. Verify Geofence exists
	var gName, gCategory string
	err := s.db.QueryRow("SELECT name, category FROM geofences WHERE id = $1", req.GeofenceID).Scan(&gName, &gCategory)
	if err == sql.ErrNoRows {
		return nil, ErrGeofenceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed verifying geofence: %w", err)
	}

	// 2. If vehicle_id is provided, verify Vehicle exists
	var vNum, vDriver *string
	if req.VehicleID != nil && *req.VehicleID != "" {
		var num, driver string
		err := s.db.QueryRow("SELECT vehicle_number, driver_name FROM vehicles WHERE id = $1", *req.VehicleID).Scan(&num, &driver)
		if err == sql.ErrNoRows {
			return nil, ErrVehicleNotFound
		}
		if err != nil {
			return nil, fmt.Errorf("failed verifying vehicle: %w", err)
		}
		vNum = &num
		vDriver = &driver
	} else {
		req.VehicleID = nil
	}

	// 3. Insert alert configuration
	var id string
	var createdAt time.Time
	query := `
		INSERT INTO alert_configurations (geofence_id, vehicle_id, event_type, status, created_at)
		VALUES ($1, $2, $3, 'active', NOW())
		RETURNING id, created_at
	`
	err = s.db.QueryRow(query, req.GeofenceID, req.VehicleID, evtType).Scan(&id, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed creating alert configuration: %w", err)
	}

	return &models.AlertConfigDetail{
		ID:               id,
		GeofenceID:       req.GeofenceID,
		GeofenceName:     gName,
		GeofenceCategory: gCategory,
		VehicleID:        req.VehicleID,
		VehicleNumber:    vNum,
		DriverName:       vDriver,
		EventType:        evtType,
		Status:           "active",
		CreatedAt:        createdAt,
	}, nil
}

func (s *AlertService) GetAlertConfigurations(geofenceID, vehicleID string) ([]models.AlertConfigDetail, error) {
	query := `
		SELECT a.id, a.geofence_id, g.name AS geofence_name, g.category AS geofence_category,
		       a.vehicle_id, v.vehicle_number, v.driver_name,
		       a.event_type, a.status, a.created_at
		FROM alert_configurations a
		JOIN geofences g ON g.id = a.geofence_id
		LEFT JOIN vehicles v ON v.id = a.vehicle_id
		WHERE a.status = 'active'
	`
	var args []interface{}
	argIdx := 1

	if geofenceID != "" {
		query += fmt.Sprintf(" AND a.geofence_id = $%d", argIdx)
		args = append(args, geofenceID)
		argIdx++
	}
	if vehicleID != "" {
		query += fmt.Sprintf(" AND (a.vehicle_id = $%d OR a.vehicle_id IS NULL)", argIdx)
		args = append(args, vehicleID)
		argIdx++
	}
	query += " ORDER BY a.created_at DESC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed querying alert configurations: %w", err)
	}
	defer rows.Close()

	var result []models.AlertConfigDetail
	for rows.Next() {
		var a models.AlertConfigDetail
		var vID, vNum, vDriver sql.NullString

		err := rows.Scan(
			&a.ID, &a.GeofenceID, &a.GeofenceName, &a.GeofenceCategory,
			&vID, &vNum, &vDriver,
			&a.EventType, &a.Status, &a.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed scanning alert row: %w", err)
		}

		if vID.Valid {
			a.VehicleID = &vID.String
		}
		if vNum.Valid {
			a.VehicleNumber = &vNum.String
		}
		if vDriver.Valid {
			a.DriverName = &vDriver.String
		}

		result = append(result, a)
	}

	if result == nil {
		result = []models.AlertConfigDetail{}
	}
	return result, nil
}

