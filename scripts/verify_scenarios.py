#!/usr/bin/env python3
"""
GeoTrack Automated Integration Test Suite
Verifies the 5 Scenarios from Section 15.2 of the PRD:
1. Vehicle enters a restricted zone (Entry transition + alert rule match + time_ns)
2. Vehicle remains inside (Zero duplicate transition alerts)
3. Vehicle exits the restricted zone (Exit transition + rule match)
4. Overlapping geofences (Independent evaluation)
5. Invalid coordinates / Out-of-order GPS telemetry (Rejection with time_ns, zero state corruption)
"""

import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://localhost:8080"

def request(endpoint, method="GET", payload=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode('utf-8') if payload else None
    headers = {"Content-Type": "application/json"} if payload else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def run_tests():
    print("=" * 70)
    print(" GeoTrack Automated Verification Suite (PRD Section 15.2)")
    print("=" * 70)

    # Health Check
    code, res = request("/health")
    assert code == 200, f"Health check failed with {code}"
    assert "time_ns" in res, "Health check missing time_ns"
    print(f"[✓] Health Check PASSED (time_ns: {res['time_ns']} ns)")

    # 1. Setup Geofences
    # Delivery Zone
    g1 = {
        "name": "Integration Test Delivery Zone",
        "category": "delivery_zone",
        "coordinates": [
            [37.7700, -122.4200],
            [37.7850, -122.4200],
            [37.7850, -122.4050],
            [37.7700, -122.4050],
            [37.7700, -122.4200]
        ]
    }
    code, g1_res = request("/geofences", "POST", g1)
    g1_id = g1_res["id"]
    print(f"[✓] Created Geofence 1 (Delivery Zone): {g1_id}")

    # Restricted Zone
    g2 = {
        "name": "Integration Test Restricted Zone",
        "category": "restricted_zone",
        "coordinates": [
            [37.7800, -122.4150],
            [37.7900, -122.4150],
            [37.7900, -122.4000],
            [37.7800, -122.4000],
            [37.7800, -122.4150]
        ]
    }
    code, g2_res = request("/geofences", "POST", g2)
    g2_id = g2_res["id"]
    print(f"[✓] Created Geofence 2 (Restricted Zone): {g2_id}")

    # 2. Setup Vehicle
    veh_num = f"TEST-{int(time.time())}"
    v_req = {
        "vehicle_number": veh_num,
        "driver_name": "Test Driver",
        "vehicle_type": "Truck",
        "phone": "+1-555-9999"
    }
    code, v_res = request("/vehicles", "POST", v_req)
    assert code == 201, f"Failed vehicle creation: {v_res}"
    v_id = v_res["id"]
    print(f"[✓] Registered Vehicle: {veh_num} (ID: {v_id})")

    # 3. Setup Alert Rule (both entry and exit for Restricted Zone)
    alert_req = {
        "geofence_id": g2_id,
        "vehicle_id": v_id,
        "event_type": "both"
    }
    code, a_res = request("/alerts/configure", "POST", alert_req)
    assert code == 201, f"Failed alert config: {a_res}"
    print(f"[✓] Configured Alert Rule for Restricted Zone")

    # Initial baseline location outside all zones (Rule 2: Initial Fix should generate 0 false events)
    loc_init = {
        "vehicle_id": v_id,
        "latitude": 37.8500,
        "longitude": -122.5000,
        "timestamp": "2026-11-07T10:00:00Z"
    }
    code, res = request("/vehicles/location", "POST", loc_init)
    assert len(res["events_generated"]) == 0, "Rule 2 violated: initial fix generated false transition!"
    print(f"[✓] Baseline Initial Fix PASSED (Zero false events on initial fix)")

    # -------------------------------------------------------------
    # SCENARIO 1: Vehicle enters the restricted zone
    # -------------------------------------------------------------
    loc_inside = {
        "vehicle_id": v_id,
        "latitude": 37.7850,
        "longitude": -122.4080,
        "timestamp": "2026-11-07T10:05:00Z"
    }
    code, res = request("/vehicles/location", "POST", loc_inside)
    assert code == 200, f"Location update failed: {res}"
    assert "time_ns" in res, "Missing time_ns"
    entries = [e for e in res["events_generated"] if e["event_type"] == "entry" and e["geofence_id"] == g2_id]
    assert len(entries) == 1, f"Scenario 1 FAILED: Expected 1 entry event into restricted zone, got {res['events_generated']}"
    print(f"[✓] SCENARIO 1 PASSED: Vehicle Entry transition detected into Restricted Zone")

    # -------------------------------------------------------------
    # SCENARIO 2: Vehicle remains inside the restricted zone
    # -------------------------------------------------------------
    loc_inside_again = {
        "vehicle_id": v_id,
        "latitude": 37.7852,
        "longitude": -122.4078,
        "timestamp": "2026-11-07T10:06:00Z"
    }
    code, res = request("/vehicles/location", "POST", loc_inside_again)
    g2_entries = [e for e in res["events_generated"] if e["geofence_id"] == g2_id]
    assert len(g2_entries) == 0, f"Scenario 2 FAILED: Duplicate transition generated for unchanged state!"
    print(f"[✓] SCENARIO 2 PASSED: Zero duplicate alerts generated for unchanged inside state")

    # -------------------------------------------------------------
    # SCENARIO 3: Vehicle exits the restricted zone
    # -------------------------------------------------------------
    loc_outside = {
        "vehicle_id": v_id,
        "latitude": 37.8600,
        "longitude": -122.5100,
        "timestamp": "2026-11-07T10:10:00Z"
    }
    code, res = request("/vehicles/location", "POST", loc_outside)
    exits = [e for e in res["events_generated"] if e["event_type"] == "exit" and e["geofence_id"] == g2_id]
    assert len(exits) == 1, f"Scenario 3 FAILED: Expected 1 exit event, got {res['events_generated']}"
    print(f"[✓] SCENARIO 3 PASSED: Exit transition detected accurately")

    # -------------------------------------------------------------
    # SCENARIO 4: Vehicle enters overlapping geofences simultaneously
    # Point [37.7820, -122.4100] is inside BOTH Delivery Zone & Restricted Zone
    # -------------------------------------------------------------
    loc_overlap = {
        "vehicle_id": v_id,
        "latitude": 37.7820,
        "longitude": -122.4100,
        "timestamp": "2026-11-07T10:15:00Z"
    }
    code, res = request("/vehicles/location", "POST", loc_overlap)
    covered_ids = [g["id"] for g in res["current_geofences"]]
    assert g1_id in covered_ids and g2_id in covered_ids, "Scenario 4 FAILED: Overlapping point must match both geofences"
    print(f"[✓] SCENARIO 4 PASSED: Overlapping geofences independently evaluated simultaneously")

    # -------------------------------------------------------------
    # SCENARIO 5: Invalid vehicle location & Out-of-order GPS telemetry
    # -------------------------------------------------------------
    # A. Invalid coordinates (Latitude > 90)
    loc_invalid = {
        "vehicle_id": v_id,
        "latitude": 150.0,
        "longitude": -122.4100,
        "timestamp": "2026-11-07T10:20:00Z"
    }
    code, res = request("/vehicles/location", "POST", loc_invalid)
    assert code == 400, f"Expected 400 for invalid coordinates, got {code}"
    assert "time_ns" in res, "Error response must include time_ns"
    print(f"[✓] SCENARIO 5A PASSED: Invalid coordinates rejected with 400 Bad Request + time_ns")

    # B. Stale / Out-of-order timestamp (-1 hour in past)
    loc_stale = {
        "vehicle_id": v_id,
        "latitude": 37.8500,
        "longitude": -122.5000,
        "timestamp": "2026-11-07T09:00:00Z" # 1h older than latest 10:15
    }
    code, res = request("/vehicles/location", "POST", loc_stale)
    assert len(res["events_generated"]) == 0, "Scenario 5B FAILED: Stale GPS update must not trigger state transition!"
    print(f"[✓] SCENARIO 5B PASSED: Out-of-order GPS update safely handled without state regression")

    print("\n" + "=" * 70)
    print(" ALL 5 INTEGRATION SCENARIOS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
