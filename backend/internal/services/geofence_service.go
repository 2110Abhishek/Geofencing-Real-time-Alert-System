package services

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"geotrack/backend/internal/geospatial"
	"geotrack/backend/internal/models"
)

var (
	ErrGeofenceNotFound = errors.New("geofence not found")
	ErrInvalidCategory  = errors.New("invalid category: must be one of delivery_zone, restricted_zone, toll_zone, customer_area")
)

type GeofenceService struct {
	db *sql.DB
}

func NewGeofenceService(db *sql.DB) *GeofenceService {
	return &GeofenceService{db: db}
}

func (s *GeofenceService) CreateGeofence(req models.CreateGeofenceRequest) (*models.GeofenceItem, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("geofence name cannot be empty")
	}

	validCategories := map[string]bool{
		"delivery_zone":   true,
		"restricted_zone": true,
		"toll_zone":       true,
		"customer_area":   true,
	}
	cat := strings.ToLower(strings.TrimSpace(req.Category))
	if !validCategories[cat] {
		return nil, ErrInvalidCategory
	}

	if err := geospatial.ValidatePolygon(req.Coordinates); err != nil {
		return nil, fmt.Errorf("invalid polygon coordinates: %w", err)
	}

	wkt := geospatial.CoordinatesToWKT(req.Coordinates)

	var id string
	var createdAt time.Time
	query := `
		INSERT INTO geofences (name, description, polygon, category, status, created_at)
		VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, 'active', NOW())
		RETURNING id, created_at
	`
	err := s.db.QueryRow(query, name, strings.TrimSpace(req.Description), wkt, cat).Scan(&id, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed creating geofence: %w", err)
	}

	return &models.GeofenceItem{
		ID:          id,
		Name:        name,
		Description: req.Description,
		Category:    cat,
		Status:      "active",
		Coordinates: req.Coordinates,
		PointCount:  len(req.Coordinates),
		CreatedAt:   createdAt,
	}, nil
}

func (s *GeofenceService) GetGeofences(categoryFilter string) ([]models.GeofenceItem, error) {
	query := `
		SELECT id, name, COALESCE(description, ''), category, status, created_at, ST_AsGeoJSON(polygon)
		FROM geofences
		WHERE status = 'active'
	`
	var args []interface{}
	if categoryFilter != "" {
		query += " AND category = $1"
		args = append(args, strings.ToLower(categoryFilter))
	}
	query += " ORDER BY created_at DESC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed querying geofences: %w", err)
	}
	defer rows.Close()

	var result []models.GeofenceItem
	for rows.Next() {
		var g models.GeofenceItem
		var geoJSONStr string

		err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.Category, &g.Status, &g.CreatedAt, &geoJSONStr)
		if err != nil {
			return nil, fmt.Errorf("failed scanning geofence row: %w", err)
		}

		coords, err := parseGeoJSONPolygon(geoJSONStr)
		if err != nil {
			g.Coordinates = [][]float64{}
		} else {
			g.Coordinates = coords
		}
		g.PointCount = len(g.Coordinates)

		result = append(result, g)
	}

	if result == nil {
		result = []models.GeofenceItem{}
	}
	return result, nil
}

func (s *GeofenceService) GetGeofenceByID(id string) (*models.Geofence, error) {
	var g models.Geofence
	query := `SELECT id, name, COALESCE(description, ''), category, status, created_at FROM geofences WHERE id = $1`
	err := s.db.QueryRow(query, id).Scan(&g.ID, &g.Name, &g.Description, &g.Category, &g.Status, &g.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrGeofenceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed getting geofence: %w", err)
	}
	return &g, nil
}

func (s *GeofenceService) DeleteGeofence(id string) error {
	res, err := s.db.Exec("DELETE FROM geofences WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed deleting geofence: %w", err)
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return ErrGeofenceNotFound
	}
	return nil
}

// parseGeoJSONPolygon parses GeoJSON Polygon {"type":"Polygon","coordinates":[[[lng, lat], ...]]}
// and converts into [ [lat, lng], ... ] for the API contract.
func parseGeoJSONPolygon(geoJSON string) ([][]float64, error) {
	type GeoJSONStruct struct {
		Coordinates [][][]float64 `json:"coordinates"`
	}
	var parsed GeoJSONStruct
	if err := json.Unmarshal([]byte(geoJSON), &parsed); err != nil {
		return nil, err
	}
	if len(parsed.Coordinates) == 0 {
		return [][]float64{}, nil
	}

	rawRing := parsed.Coordinates[0]
	apiCoords := make([][]float64, len(rawRing))
	for i, pt := range rawRing {
		if len(pt) >= 2 {
			// GeoJSON is [lng, lat]; API expects [lat, lng]
			apiCoords[i] = []float64{pt[1], pt[0]}
		}
	}
	return apiCoords, nil
}

