package services

import (
	"database/sql"
	"fmt"
	"time"

	"geotrack/backend/internal/models"
)

type HistoryService struct {
	db *sql.DB
}

func NewHistoryService(db *sql.DB) *HistoryService {
	return &HistoryService{db: db}
}

func (s *HistoryService) GetViolationHistory(
	vehicleID, geofenceID, eventType string,
	startDate, endDate *time.Time,
	limit, offset int,
) ([]models.ViolationHistoryItem, int, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}
	if offset < 0 {
		offset = 0
	}

	whereClause := "WHERE 1=1"
	var args []interface{}
	argIdx := 1

	if vehicleID != "" {
		whereClause += fmt.Sprintf(" AND e.vehicle_id = $%d", argIdx)
		args = append(args, vehicleID)
		argIdx++
	}
	if geofenceID != "" {
		whereClause += fmt.Sprintf(" AND e.geofence_id = $%d", argIdx)
		args = append(args, geofenceID)
		argIdx++
	}
	if eventType != "" {
		whereClause += fmt.Sprintf(" AND e.event_type = $%d", argIdx)
		args = append(args, eventType)
		argIdx++
	}
	if startDate != nil {
		whereClause += fmt.Sprintf(" AND e.event_timestamp >= $%d", argIdx)
		args = append(args, *startDate)
		argIdx++
	}
	if endDate != nil {
		whereClause += fmt.Sprintf(" AND e.event_timestamp <= $%d", argIdx)
		args = append(args, *endDate)
		argIdx++
	}

	// 1. Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM geofence_events e %s", whereClause)
	var total int
	err := s.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed counting history records: %w", err)
	}

	// 2. Fetch page records
	selectQuery := fmt.Sprintf(`
		SELECT e.id, e.vehicle_id, v.vehicle_number, v.driver_name,
		       e.geofence_id, g.name AS geofence_name, g.category AS geofence_category,
		       e.event_type, e.latitude, e.longitude, e.event_timestamp, e.created_at
		FROM geofence_events e
		JOIN vehicles v ON v.id = e.vehicle_id
		JOIN geofences g ON g.id = e.geofence_id
		%s
		ORDER BY e.event_timestamp DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	queryArgs := append(args, limit, offset)
	rows, err := s.db.Query(selectQuery, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed querying violation history: %w", err)
	}
	defer rows.Close()

	var result []models.ViolationHistoryItem
	for rows.Next() {
		var item models.ViolationHistoryItem
		err := rows.Scan(
			&item.EventID, &item.VehicleID, &item.VehicleNumber, &item.DriverName,
			&item.GeofenceID, &item.GeofenceName, &item.GeofenceCategory,
			&item.EventType, &item.Latitude, &item.Longitude,
			&item.EventTimestamp, &item.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed scanning violation item: %w", err)
		}
		result = append(result, item)
	}

	if result == nil {
		result = []models.ViolationHistoryItem{}
	}

	return result, total, nil
}

