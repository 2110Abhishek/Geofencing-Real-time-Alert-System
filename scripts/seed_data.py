#!/usr/bin/env python3
"""
GeoTrack Seed Data Script
Populates realistic initial geofences, vehicles, alert rules, and GPS coordinates.
"""

import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://localhost:8080"

def request_json(endpoint, method="GET", payload=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode('utf-8') if payload else None
    headers = {"Content-Type": "application/json"} if payload else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        return 0, {"error": str(e)}

def seed():
    print("=" * 60)
    print("GeoTrack Database & API Seeder")
    print("=" * 60)

    # 1. Health check
    status, res = request_json("/health")
    if status != 200:
        print(f"[-] Backend API not responding on {BASE_URL}. Ensure server is running.")
        return

    print(f"[+] Connected to GeoTrack backend (time_ns: {res.get('time_ns')} ns)")

    # 2. Seed Geofences
    geofences_to_create = [
        {
            "name": "Downtown Commercial Delivery Zone",
            "description": "Approved logistics and loading zone for downtown commercial stores",
            "category": "delivery_zone",
            "coordinates": [
                [37.7700, -122.4200],
                [37.7850, -122.4200],
                [37.7850, -122.4050],
                [37.7700, -122.4050],
                [37.7700, -122.4200]
            ]
        },
        {
            "name": "Naval Harbor Restricted Security Perimeter",
            "description": "Unauthorized access prohibited. Monitored restricted security zone",
            "category": "restricted_zone",
            "coordinates": [
                [37.7950, -122.3950],
                [37.8100, -122.3950],
                [37.8100, -122.3800],
                [37.7950, -122.3800],
                [37.7950, -122.3950]
            ]
        },
        {
            "name": "Bay Bridge Express Toll Plaza",
            "description": "Electronic toll collection and rate compliance corridor",
            "category": "toll_zone",
            "coordinates": [
                [37.7880, -122.3880],
                [37.7940, -122.3880],
                [37.7940, -122.3780],
                [37.7880, -122.3780],
                [37.7880, -122.3880]
            ]
        },
        {
            "name": "Mission Bay Customer Depot",
            "description": "Dedicated customer delivery warehouse and staging perimeter",
            "category": "customer_area",
            "coordinates": [
                [37.7650, -122.3950],
                [37.7750, -122.3950],
                [37.7750, -122.3850],
                [37.7650, -122.3850],
                [37.7650, -122.3950]
            ]
        }
    ]

    created_geofences = []
    for g in geofences_to_create:
        status, res = request_json("/geofences", method="POST", payload=g)
        if status == 201:
            print(f"[+] Created Geofence: '{res['name']}' (ID: {res['id']}, time_ns: {res.get('time_ns')})")
            created_geofences.append(res)
        else:
            print(f"[!] Geofence note: {res.get('error')}")

    # If already created, fetch existing
    if not created_geofences:
        _, list_res = request_json("/geofences")
        created_geofences = list_res.get("geofences", [])

    # 3. Seed Vehicles
    vehicles_to_create = [
        {"vehicle_number": "KA-01-AB-1234", "driver_name": "John Doe", "vehicle_type": "Truck", "phone": "+1-555-0101"},
        {"vehicle_number": "KA-02-CD-5678", "driver_name": "Sarah Connor", "vehicle_type": "Van", "phone": "+1-555-0102"},
        {"vehicle_number": "MH-12-EF-9012", "driver_name": "Alex Mercer", "vehicle_type": "Truck", "phone": "+1-555-0103"},
        {"vehicle_number": "DL-04-GH-3456", "driver_name": "David Miller", "vehicle_type": "Motorcycle", "phone": "+1-555-0104"},
    ]

    created_vehicles = []
    for v in vehicles_to_create:
        status, res = request_json("/vehicles", method="POST", payload=v)
        if status == 201:
            print(f"[+] Registered Vehicle: '{res['vehicle_number']}' (Driver: {res['driver_name']}, ID: {res['id']})")
            created_vehicles.append(res)
        elif status == 409:
            print(f"[*] Vehicle {v['vehicle_number']} already registered.")
        else:
            print(f"[!] Vehicle error: {res.get('error')}")

    if not created_vehicles:
        _, v_list = request_json("/vehicles")
        created_vehicles = v_list.get("vehicles", [])

    # 4. Seed Alert Configurations
    if created_geofences and created_vehicles:
        restricted_g = next((g for g in created_geofences if g.get("category") == "restricted_zone"), created_geofences[0])
        delivery_g = next((g for g in created_geofences if g.get("category") == "delivery_zone"), created_geofences[0])

        alerts_to_create = [
            {"geofence_id": restricted_g["id"], "vehicle_id": None, "event_type": "entry"},
            {"geofence_id": delivery_g["id"], "vehicle_id": None, "event_type": "both"},
            {"geofence_id": created_geofences[-1]["id"], "vehicle_id": created_vehicles[0]["id"], "event_type": "both"}
        ]

        for a in alerts_to_create:
            status, res = request_json("/alerts/configure", method="POST", payload=a)
            if status == 201:
                print(f"[+] Alert Rule Active: Geofence ID {a['geofence_id'][:8]}... -> Event: '{a['event_type']}'")

    print("\n[+] Seeding complete! Launch http://localhost:5173 to view active fleet.")

if __name__ == "__main__":
    seed()

