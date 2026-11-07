package geospatial

import (
	"testing"
)

func TestValidatePolygon(t *testing.T) {
	validSquare := [][]float64{
		{37.7749, -122.4194},
		{37.7849, -122.4194},
		{37.7849, -122.4094},
		{37.7749, -122.4094},
		{37.7749, -122.4194},
	}
	if err := ValidatePolygon(validSquare); err != nil {
		t.Fatalf("expected valid polygon, got %v", err)
	}

	unclosedSquare := [][]float64{
		{37.7749, -122.4194},
		{37.7849, -122.4194},
		{37.7849, -122.4094},
		{37.7749, -122.4094},
	}
	if err := ValidatePolygon(unclosedSquare); err == nil {
		t.Fatalf("expected error for unclosed polygon, got nil")
	}

	invalidLat := [][]float64{
		{95.0, -122.4194},
		{37.7849, -122.4194},
		{37.7849, -122.4094},
		{95.0, -122.4194},
	}
	if err := ValidatePolygon(invalidLat); err == nil {
		t.Fatalf("expected error for invalid latitude, got nil")
	}

	// Self-intersecting "hourglass" / bowtie polygon
	bowtie := [][]float64{
		{0.0, 0.0},
		{2.0, 2.0},
		{0.0, 2.0},
		{2.0, 0.0},
		{0.0, 0.0},
	}
	if err := ValidatePolygon(bowtie); err == nil {
		t.Fatalf("expected error for self-intersecting polygon, got nil")
	}
}

func TestPointInPolygon(t *testing.T) {
	// A square with latitude [37.70, 37.80] and longitude [-122.50, -122.40]
	square := [][]float64{
		{37.70, -122.50},
		{37.80, -122.50},
		{37.80, -122.40},
		{37.70, -122.40},
		{37.70, -122.50},
	}

	// 1. Point strictly inside
	if !PointInPolygon(37.75, -122.45, square) {
		t.Fatalf("expected point inside to return true")
	}

	// 2. Point strictly outside
	if PointInPolygon(37.85, -122.45, square) {
		t.Fatalf("expected point outside to return false")
	}

	// 3. Point directly on boundary edge
	if !PointInPolygon(37.75, -122.50, square) {
		t.Fatalf("expected boundary point to return true (boundary inclusion policy)")
	}

	// 4. Point on vertex
	if !PointInPolygon(37.70, -122.50, square) {
		t.Fatalf("expected vertex point to return true")
	}
}

func TestCoordinatesToWKT(t *testing.T) {
	square := [][]float64{
		{37.70, -122.50},
		{37.80, -122.50},
		{37.80, -122.40},
		{37.70, -122.40},
		{37.70, -122.50},
	}
	wkt := CoordinatesToWKT(square)
	expectedPrefix := "POLYGON((-122.500000 37.700000"
	if len(wkt) < len(expectedPrefix) || wkt[:len(expectedPrefix)] != expectedPrefix {
		t.Fatalf("unexpected WKT format: %s", wkt)
	}
}

