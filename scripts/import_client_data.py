#!/usr/bin/env python3
"""
GeoTrack Real Client Data Importer & Telemetry Streamer
Imports real fleet CSVs, GeoJSON/JSON boundary files, and streams live GPS telemetry.

Usage:
  python scripts/import_client_data.py --vehicles data/templates/real_vehicles_template.csv
  python scripts/import_client_data.py --geofences data/templates/real_geofences_template.json
  python scripts/import_client_data.py --telemetry data/templates/real_telemetry_stream.csv --stream
"""

import sys
import csv
import json
import time
import argparse
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8080"

def api_post(endpoint, payload):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode('utf-8')
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        return 0, {"error": str(e)}

def api_get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return 0, {"error": str(e)}

def import_vehicles(csv_path):
    print(f"\n[*] Importing Real Vehicles from: {csv_path}")
    count = 0
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            payload = {
                "vehicle_number": row["vehicle_number"].strip().toUpperCase() if hasattr(str, 'toUpperCase') else row["vehicle_number"].strip().upper(),
                "driver_name": row["driver_name"].strip(),
                "vehicle_type": row.get("vehicle_type", "Truck").strip(),
                "phone": row.get("phone", "+1-000-0000").strip()
            }
            code, res = api_post("/vehicles", payload)
            if code == 201:
                print(f"  [+] Registered: {payload['vehicle_number']} (Driver: {payload['driver_name']}, ID: {res['id']})")
                count += 1
            elif code == 409:
                print(f"  [*] Already exists: {payload['vehicle_number']}")
            else:
                print(f"  [-] Failed {payload['vehicle_number']}: {res.get('error')}")
    print(f"[✓] Completed: {count} vehicles registered.")

def import_geofences(json_path):
    print(f"\n[*] Importing Real Geofences from: {json_path}")
    with open(json_path, mode='r', encoding='utf-8') as f:
        geofences = json.load(f)
    
    count = 0
    for g in geofences:
        payload = {
            "name": g["name"].strip(),
            "description": g.get("description", ""),
            "category": g.get("category", "delivery_zone"),
            "coordinates": g["coordinates"]
        }
        code, res = api_post("/geofences", payload)
        if code == 201:
            print(f"  [+] Created Geofence: '{payload['name']}' ({payload['category']}, ID: {res['id']})")
            count += 1
        else:
            print(f"  [-] Failed '{payload['name']}': {res.get('error')}")
    print(f"[✓] Completed: {count} geofences created.")

def stream_telemetry(csv_path, stream_live=False, delay_sec=2):
    print(f"\n[*] Streaming Telemetry from: {csv_path}")
    
    # Map vehicle numbers to IDs
    code, v_data = api_get("/vehicles")
    if code != 200 or "vehicles" not in v_data:
        print("[-] Could not retrieve vehicles list from API.")
        return
    
    veh_map = {v["vehicle_number"]: v["id"] for v in v_data["vehicles"]}

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            v_num = row["vehicle_number"].strip().upper()
            if v_num not in veh_map:
                print(f"  [-] Skipping unknown vehicle: {v_num}")
                continue
            
            v_id = veh_map[v_num]
            lat = float(row["latitude"])
            lng = float(row["longitude"])
            ts = row.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            payload = {
                "vehicle_id": v_id,
                "latitude": lat,
                "longitude": lng,
                "timestamp": ts
            }

            code, res = api_post("/vehicles/location", payload)
            if code == 200:
                events = res.get("events_generated", [])
                event_str = f" -> TRANSITION: {[e['event_type'] + ' in ' + e['geofence_name'] for e in events]}" if events else ""
                print(f"  [>] {v_num} [{lat:.4f}, {lng:.4f}] in {res.get('time_ns')} ns{event_str}")
            else:
                print(f"  [-] Location failed: {res.get('error')}")
            
            if stream_live:
                time.sleep(delay_sec)

def main():
    parser = argparse.ArgumentParser(description="GeoTrack Real Client Data Ingestion Tool")
    parser.add_argument("--vehicles", help="Path to real vehicles CSV file")
    parser.add_argument("--geofences", help="Path to real geofences JSON file")
    parser.add_argument("--telemetry", help="Path to real telemetry CSV file")
    parser.add_argument("--stream", action="store_true", help="Stream telemetry in real time with delay")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay between telemetry pings in seconds")

    args = parser.parse_args()

    # If no arguments provided, import the default realistic templates
    if not args.vehicles and not args.geofences and not args.telemetry:
        print("[*] No custom files specified. Ingesting default client templates...")
        import_vehicles("data/templates/real_vehicles_template.csv")
        import_geofences("data/templates/real_geofences_template.json")
        stream_telemetry("data/templates/real_telemetry_stream.csv", stream_live=False)
        return

    if args.vehicles:
        import_vehicles(args.vehicles)
    if args.geofences:
        import_geofences(args.geofences)
    if args.telemetry:
        stream_telemetry(args.telemetry, stream_live=args.stream, delay_sec=args.delay)

if __name__ == "__main__":
    main()

