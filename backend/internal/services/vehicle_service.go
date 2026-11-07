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
	ErrVehicleNotFound = errors.New("vehicle not found")
	ErrVehicleExists   = errors.New("vehicle number already registered")
)

type VehicleService struct {
	db *sql.DB
}

func NewVehicleService(db *sql.DB) *VehicleService {
	return &VehicleService{db: db}
}

func (s *VehicleService) RegisterVehicle(req models.CreateVehicleRequest) (*models.Vehicle, error) {
	normNum := strings.ToUpper(strings.TrimSpace(req.VehicleNumber))
	if normNum == "" {
		return nil, errors.New("vehicle number cannot be empty")
	}

	// Check for duplicate vehicle number
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM vehicles WHERE vehicle_number = $1", normNum).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("failed checking vehicle uniqueness: %w", err)
	}
	if count > 0 {
		return nil, ErrVehicleExists
	}

	var v models.Vehicle
	query := `
		INSERT INTO vehicles (vehicle_number, driver_name, vehicle_type, phone, status, created_at)
		VALUES ($1, $2, $3, $4, 'active', NOW())
		RETURNING id, vehicle_number, driver_name, vehicle_type, phone, status, created_at
	`
	err = s.db.QueryRow(query, normNum, strings.TrimSpace(req.DriverName), strings.TrimSpace(req.VehicleType), strings.TrimSpace(req.Phone)).
		Scan(&v.ID, &v.VehicleNumber, &v.DriverName, &v.VehicleType, &v.Phone, &v.Status, &v.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to register vehicle: %w", err)
	}

	return &v, nil
}

func (s *VehicleService) GetVehicles() ([]models.VehicleWithLocation, error) {
	query := `
		SELECT v.id, v.vehicle_number, v.driver_name, v.vehicle_type, v.phone, v.status, v.created_at,
		       vl.latitude, vl.longitude, vl.recorded_at
		FROM vehicles v
		LEFT JOIN LATERAL (
			SELECT latitude, longitude, recorded_at
			FROM vehicle_locations
			WHERE vehicle_id = v.id
			ORDER BY recorded_at DESC
			LIMIT 1
		) vl ON true
		ORDER BY v.created_at DESC
	`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query vehicles: %w", err)
	}
	defer rows.Close()

	var result []models.VehicleWithLocation
	for rows.Next() {
		var v models.VehicleWithLocation
		var lat, lng sql.NullFloat64
		var recordedAt sql.NullTime

		err := rows.Scan(
			&v.ID, &v.VehicleNumber, &v.DriverName, &v.VehicleType, &v.Phone, &v.Status, &v.CreatedAt,
			&lat, &lng, &recordedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed scanning vehicle row: %w", err)
		}

		if lat.Valid && lng.Valid && recordedAt.Valid {
			v.LastLocation = &models.LastLocationInfo{
				Latitude:   lat.Float64,
				Longitude:  lng.Float64,
				RecordedAt: recordedAt.Time,
			}
		}

		// Retrieve current geofences where is_inside = true
		v.CurrentGeofences = s.getCurrentGeofenceIDs(v.ID)
		result = append(result, v)
	}

	if result == nil {
		result = []models.VehicleWithLocation{}
	}
	return result, nil
}

func (s *VehicleService) GetVehicleByID(id string) (*models.Vehicle, error) {
	var v models.Vehicle
	query := `SELECT id, vehicle_number, driver_name, vehicle_type, phone, status, created_at FROM vehicles WHERE id = $1`
	err := s.db.QueryRow(query, id).Scan(&v.ID, &v.VehicleNumber, &v.DriverName, &v.VehicleType, &v.Phone, &v.Status, &v.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrVehicleNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed getting vehicle: %w", err)
	}
	return &v, nil
}

func (s *VehicleService) getCurrentGeofenceIDs(vehicleID string) []string {
	rows, err := s.db.Query("SELECT geofence_id FROM vehicle_geofence_states WHERE vehicle_id = $1 AND is_inside = true", vehicleID)
	if err != nil {
		return []string{}
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var gID string
		if err := rows.Scan(&gID); err == nil {
			ids = append(ids, gID)
		}
	}
	if ids == nil {
		ids = []string{}
	}
	return ids
}

