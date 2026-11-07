package services

import (
	"testing"
	"time"
)

func TestDetectTransition(t *testing.T) {
	// Scenario 1: Initial fix (hasPriorState = false) should NOT trigger transition
	if tr := DetectTransition(false, false, true); tr != TransitionNone {
		t.Fatalf("expected TransitionNone on initial fix inside, got %v", tr)
	}
	if tr := DetectTransition(false, false, false); tr != TransitionNone {
		t.Fatalf("expected TransitionNone on initial fix outside, got %v", tr)
	}

	// Scenario 2: Outside -> Inside => Entry
	if tr := DetectTransition(true, false, true); tr != TransitionEntry {
		t.Fatalf("expected TransitionEntry, got %v", tr)
	}

	// Scenario 3: Inside -> Inside => None (No duplicate)
	if tr := DetectTransition(true, true, true); tr != TransitionNone {
		t.Fatalf("expected TransitionNone for unchanged inside, got %v", tr)
	}

	// Scenario 4: Inside -> Outside => Exit
	if tr := DetectTransition(true, true, false); tr != TransitionExit {
		t.Fatalf("expected TransitionExit, got %v", tr)
	}

	// Scenario 5: Outside -> Outside => None (No duplicate)
	if tr := DetectTransition(true, false, false); tr != TransitionNone {
		t.Fatalf("expected TransitionNone for unchanged outside, got %v", tr)
	}
}

func TestIsStaleLocation(t *testing.T) {
	now := time.Now()
	older := now.Add(-5 * time.Minute)
	newer := now.Add(5 * time.Minute)

	if !IsStaleLocation(older, now) {
		t.Fatalf("expected older timestamp to be flagged as stale")
	}
	if !IsStaleLocation(now, now) {
		t.Fatalf("expected equal timestamp to be flagged as stale")
	}
	if IsStaleLocation(newer, now) {
		t.Fatalf("expected newer timestamp to not be stale")
	}
}

func TestMatchesAlertRule(t *testing.T) {
	ruleTypeBoth := "both"
	ruleTypeEntry := "entry"
	ruleTypeExit := "exit"
	veh1 := "veh_1"
	veh2 := "veh_2"

	// Rule matches ALL vehicles for "both"
	if !MatchesAlertRule(&ruleTypeBoth, nil, "entry", veh1) {
		t.Fatalf("expected rule with nil vehicle to match veh1")
	}

	// Rule specifies veh1, event is veh2 => No match
	if MatchesAlertRule(&ruleTypeBoth, &veh1, "entry", veh2) {
		t.Fatalf("expected rule for veh1 to reject veh2")
	}

	// Rule specifies veh1 and "entry", event is veh1 and "entry" => Match
	if !MatchesAlertRule(&ruleTypeEntry, &veh1, "entry", veh1) {
		t.Fatalf("expected match for matching vehicle and entry event")
	}

	// Rule specifies veh1 and "entry", event is veh1 and "exit" => No match
	if MatchesAlertRule(&ruleTypeEntry, &veh1, "exit", veh1) {
		t.Fatalf("expected exit event to reject entry-only rule")
	}

	// Rule specifies veh1 and "exit", event is veh1 and "exit" => Match
	if !MatchesAlertRule(&ruleTypeExit, &veh1, "exit", veh1) {
		t.Fatalf("expected match for matching vehicle and exit event")
	}
}

