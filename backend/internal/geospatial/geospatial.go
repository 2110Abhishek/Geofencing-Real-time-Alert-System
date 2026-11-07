package geospatial

import (
	"errors"
	"fmt"
	"math"
	"strings"
)

var (
	ErrEmptyCoordinates       = errors.New("coordinates cannot be empty")
	ErrInsufficientPoints     = errors.New("polygon must have at least 4 coordinate pairs")
	ErrUnclosedPolygon        = errors.New("first and last coordinate pairs must match")
	ErrInsufficientVertices   = errors.New("polygon must have at least 3 unique vertices")
	ErrInvalidLatitude        = errors.New("latitude must be between -90 and 90")
	ErrInvalidLongitude       = errors.New("longitude must be between -180 and 180")
	ErrSelfIntersectingPolygon = errors.New("polygon edges must not self-intersect")
	ErrConsecutiveDuplicates  = errors.New("polygon contains duplicate consecutive points")
)

// ValidatePolygon performs strict validation on coordinates [latitude, longitude].
func ValidatePolygon(coords [][]float64) error {
	if len(coords) == 0 {
		return ErrEmptyCoordinates
	}
	if len(coords) < 4 {
		return ErrInsufficientPoints
	}

	// 1. Check coordinate bounds and consecutive duplicates
	uniquePoints := make(map[string]bool)
	for i, pt := range coords {
		if len(pt) < 2 {
			return errors.New("each coordinate pair must contain [latitude, longitude]")
		}
		lat, lng := pt[0], pt[1]
		if lat < -90.0 || lat > 90.0 {
			return fmt.Errorf("%w: got %f at index %d", ErrInvalidLatitude, lat, i)
		}
		if lng < -180.0 || lng > 180.0 {
			return fmt.Errorf("%w: got %f at index %d", ErrInvalidLongitude, lng, i)
		}

		if i > 0 && i < len(coords)-1 {
			prevLat, prevLng := coords[i-1][0], coords[i-1][1]
			if math.Abs(lat-prevLat) < 1e-9 && math.Abs(lng-prevLng) < 1e-9 {
				return ErrConsecutiveDuplicates
			}
		}

		key := fmt.Sprintf("%.7f,%.7f", lat, lng)
		uniquePoints[key] = true
	}

	// 2. Closure check (first point must match last point)
	firstLat, firstLng := coords[0][0], coords[0][1]
	lastLat, lastLng := coords[len(coords)-1][0], coords[len(coords)-1][1]
	if math.Abs(firstLat-lastLat) > 1e-7 || math.Abs(firstLng-lastLng) > 1e-7 {
		return ErrUnclosedPolygon
	}

	// 3. Minimum unique vertices
	if len(uniquePoints) < 3 {
		return ErrInsufficientVertices
	}

	// 4. Self-intersection detection for 2D polygon boundary
	if isSelfIntersecting(coords) {
		return ErrSelfIntersectingPolygon
	}

	return nil
}

// CoordinatesToWKT converts [lat, lng] array to PostGIS WKT POLYGON((lng1 lat1, lng2 lat2, ...))
// PostGIS expects X = longitude, Y = latitude.
func CoordinatesToWKT(coords [][]float64) string {
	var sb strings.Builder
	sb.WriteString("POLYGON((")
	for i, pt := range coords {
		if i > 0 {
			sb.WriteString(", ")
		}
		// X = lng, Y = lat
		sb.WriteString(fmt.Sprintf("%f %f", pt[1], pt[0]))
	}
	sb.WriteString("))")
	return sb.String()
}

// PointInPolygon determines if [lat, lng] is inside or on the boundary of polygon coords [lat, lng].
// Boundary policy: points on the boundary are considered INSIDE.
func PointInPolygon(lat, lng float64, coords [][]float64) bool {
	n := len(coords)
	if n < 4 {
		return false
	}

	// Step 1: Check if point lies on any boundary edge
	for i := 0; i < n-1; i++ {
		p1Lat, p1Lng := coords[i][0], coords[i][1]
		p2Lat, p2Lng := coords[i+1][0], coords[i+1][1]
		if isPointOnSegment(lat, lng, p1Lat, p1Lng, p2Lat, p2Lng) {
			return true // Explicit boundary inclusion
		}
	}

	// Step 2: Standard Ray-Casting algorithm
	inside := false
	j := n - 1
	for i := 0; i < n; i++ {
		yi, xi := coords[i][0], coords[i][1]
		yj, xj := coords[j][0], coords[j][1]

		intersect := ((yi > lat) != (yj > lat)) &&
			(lng < (xj-xi)*(lat-yi)/(yj-yi)+xi)
		if intersect {
			inside = !inside
		}
		j = i
	}

	return inside
}

// isPointOnSegment checks whether (lat, lng) lies on line segment (p1 -> p2).
func isPointOnSegment(lat, lng, p1Lat, p1Lng, p2Lat, p2Lng float64) bool {
	// Bounding box check
	minLat := math.Min(p1Lat, p2Lat) - 1e-9
	maxLat := math.Max(p1Lat, p2Lat) + 1e-9
	minLng := math.Min(p1Lng, p2Lng) - 1e-9
	maxLng := math.Max(p1Lng, p2Lng) + 1e-9

	if lat < minLat || lat > maxLat || lng < minLng || lng > maxLng {
		return false
	}

	// Collinear check via cross-product
	crossProduct := (lat-p1Lat)*(p2Lng-p1Lng) - (lng-p1Lng)*(p2Lat-p1Lat)
	return math.Abs(crossProduct) < 1e-8
}

// isSelfIntersecting checks if any non-adjacent edges of the polygon intersect.
func isSelfIntersecting(coords [][]float64) bool {
	n := len(coords) - 1 // number of edges
	for i := 0; i < n; i++ {
		a1 := coords[i]
		a2 := coords[i+1]
		for j := i + 1; j < n; j++ {
			// Adjacent edges naturally share a vertex, skip them
			if math.Abs(float64(i-j)) <= 1 || (i == 0 && j == n-1) {
				continue
			}
			b1 := coords[j]
			b2 := coords[j+1]
			if segmentsIntersect(a1, a2, b1, b2) {
				return true
			}
		}
	}
	return false
}

// segmentsIntersect checks if segment a1-a2 intersects with b1-b2.
func segmentsIntersect(a1, a2, b1, b2 []float64) bool {
	ccw := func(p1, p2, p3 []float64) float64 {
		return (p2[1]-p1[1])*(p3[0]-p1[0]) - (p2[0]-p1[0])*(p3[1]-p1[1])
	}

	d1 := ccw(a1, a2, b1)
	d2 := ccw(a1, a2, b2)
	d3 := ccw(b1, b2, a1)
	d4 := ccw(b1, b2, a2)

	if ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) &&
		((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9)) {
		return true
	}

	return false
}

