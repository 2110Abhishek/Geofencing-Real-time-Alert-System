package services

import (
	"time"
)

// TransitionType represents a state change
type TransitionType string

const (
	TransitionNone  TransitionType = ""
	TransitionEntry TransitionType = "entry"
	TransitionExit  TransitionType = "exit"
)

// DetectTransition computes if an entry or exit transition occurred.
// hasPriorState indicates whether the vehicle has had any recorded state for this geofence before.
// If hasPriorState is false (Initial Fix - PRD Rule 2), no artificial transition is generated.
func DetectTransition(hasPriorState bool, previousInside, currentlyInside bool) TransitionType {
	if !hasPriorState {
		// Rule 2: Initial location sets baseline membership without generating false alerts
		return TransitionNone
	}

	if !previousInside && currentlyInside {
		return TransitionEntry
	}
	if previousInside && !currentlyInside {
		return TransitionExit
	}
	return TransitionNone
}

// IsStaleLocation determines if an incoming location update is older than or equal to the latest accepted location.
func IsStaleLocation(newTime, lastAcceptedTime time.Time) bool {
	if lastAcceptedTime.IsZero() {
		return false
	}
	return !newTime.After(lastAcceptedTime)
}

// DetermineSeverity maps geofence category and event type to presentation severity.
func DetermineSeverity(category, eventType string) string {
	switch category {
	case "restricted_zone":
		if eventType == "entry" {
			return "critical"
		}
		return "warning"
	case "delivery_zone", "toll_zone", "customer_area":
		return "informational"
	default:
		return "informational"
	}
}

// MatchesAlertRule verifies whether an event matches a configured alert rule.
func MatchesAlertRule(ruleEventType, ruleVehicleID *string, eventType, eventVehicleID string) bool {
	// 1. Vehicle check: if rule vehicle is nil or empty, matches ALL vehicles.
	if ruleVehicleID != nil && *ruleVehicleID != "" && *ruleVehicleID != eventVehicleID {
		return false
	}

	// 2. Event type check: matches exact event or "both"
	if ruleEventType == nil {
		return false
	}
	if *ruleEventType == "both" || *ruleEventType == eventType {
		return true
	}

	return false
}

