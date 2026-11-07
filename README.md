# GeoTrack – Smart Geofencing & Real-Time Fleet Monitoring System

[![Go Version](https://img.shields.io/badge/Go-1.22-00ADD8?style=flat&logo=go)](https://golang.org)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%20%2B%20PostGIS-336791?style=flat&logo=postgresql)](https://postgis.net)
[![WebSocket](https://img.shields.io/badge/Gorilla-WebSocket-blueviolet?style=flat)](https://github.com/gorilla/websocket)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://docker.com)

GeoTrack is a production-grade, real-time vehicle telematics and geospatial monitoring platform. It enables fleet operators to define geographical polygon perimeters, detect real-time vehicle boundary transitions (entry and exit) using PostGIS spatial indexing, and distribute sub-second alerts over WebSockets to modern operations dashboards.

---

## 1. System Architecture

GeoTrack is built as a **high-throughput Modular Monolith** in Go with an integrated **PostgreSQL + PostGIS** spatial database, an **asynchronous buffered WebSocket hub**, and a modern **React 18 + Vite + TypeScript** frontend with Leaflet mapping.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        UI["React 18 + Vite SPA (Port 5173)"]
        Tracker["GPS Simulation / Tracking Device Client"]
    end

    subgraph Backend["Go Modular Monolith (Port 8080)"]
        Router["Gin Router + Timer Middleware (time_ns)"]
        
        subgraph Modules["Domain Modules"]
            GeoMod["Geofence Module<br/>(Validation & Polygon Management)"]
            VehMod["Vehicle Module<br/>(Registration & State)"]
            TrackMod["Tracking Module<br/>(Location Ingestion & Ordering)"]
            SpatialEng["Geospatial Engine<br/>(Ray-casting & PostGIS ST_Covers)"]
            TransEng["Transition State Machine<br/>(vehicle_geofence_states)"]
            AlertMod["Alert Rule Matching Engine"]
        end

        subgraph RealTime["Real-Time Subsystem"]
            Dispatcher["Buffered Notification Dispatcher"]
            WSHub["Gorilla WebSocket Hub (/ws/alerts)"]
        end
    end

    subgraph Storage["Data Tier (PostgreSQL 15 + PostGIS)"]
        PG[("PostgreSQL + PostGIS Database<br/>Spatial GiST Indexes")]
    end

    UI -->|REST API Requests| Router
    Tracker -->|POST /vehicles/location| Router
    Router --> Modules
    Modules -->|Transactional Queries & Spatial Ops| PG
    TransEng -->|On Entry/Exit Transition| AlertMod
    AlertMod -->|Persist Notification| PG
    AlertMod -->|Enqueue Notification| Dispatcher
    Dispatcher -->|Asynchronous Broadcast| WSHub
    WSHub -->|WebSocket Stream (WSS/WS)| UI
```

---

## 2. Key Capabilities & Features

1. **Precision Geospatial Engine (`ST_Covers`):**
   - Boundary-inclusive point-in-polygon queries using PostGIS spatial indices (`GiST`).
   - Normalizes incoming `[latitude, longitude]` API arrays to `ST_MakePoint(longitude, latitude)`.
   - Rejects unclosed polygons, self-intersecting boundaries, out-of-bounds coordinates, and consecutive duplicate vertices.
2. **Transition Detection State Machine:**
   - Evaluates state changes (`Outside -> Inside = Entry`, `Inside -> Outside = Exit`).
   - **Zero Duplicate Transitions:** Generates events only on genuine state changes.
   - **Initial Location Rule (Rule 2):** Initializes membership state without generating false entry/exit alerts when a vehicle first reports.
   - **Stale Telemetry Protection (Rule 4):** Compares device timestamp against latest accepted timestamp; stale or out-of-order pings are archived for historical audits without reversing state.
3. **Sub-Second Real-Time Alert Distribution:**
   - `/ws/alerts` WebSocket endpoint powered by Gorilla WebSocket.
   - Asynchronous buffered dispatcher decouples high-volume location ingestion from WebSocket client I/O.
   - Automatic reconnect with exponential backoff and heartbeat ping/pong handling.
4. **Execution Timing Metric (`time_ns`):**
   - Every API response (successful and error) strictly includes execution time in nanoseconds measured at the HTTP handler layer.
5. **Interactive Operations Dashboard:**
   - Real-time fleet KPI metrics (Total Vehicles, Active Units, Inside Zones, Alerts Today, Restricted Violations).
   - Interactive Dark Theme Leaflet map with custom vehicle pins and color-coded geofence categories.
   - Dual-mode Geofence Creator: Interactive Map Drawing or manual JSON coordinate entry.
   - Built-in GPS Telemetry Simulator allowing live boundary transition testing directly in the browser.

---

## 3. Technology Stack

| Tier | Technology | Purpose |
|---|---|---|
| **Backend** | Go 1.22 + Gin | High-performance modular monolith REST API |
| **Real-Time** | Gorilla WebSocket | Full-duplex WebSocket hub with client registry & ping/pong |
| **Database** | PostgreSQL 15 + PostGIS | Spatial geometry storage, `ST_Covers` queries, GiST indexes |
| **Frontend** | React 18 + Vite + TypeScript | Modern, type-safe Single Page Application |
| **Styling** | Tailwind CSS | Sleek SaaS operations dark theme |
| **Maps** | Leaflet + React Leaflet | Interactive geospatial map visualization & polygon drawing |
| **State** | TanStack Query + Zustand | Server-state caching and real-time WebSocket client state |
| **Containers** | Docker & Docker Compose | Multi-container local orchestration (PostGIS, Backend, Frontend) |

---

## 4. Required REST API Specification (The 9 Endpoints)

Every endpoint returns `time_ns` at the top level.

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | `POST` | `/geofences` | Create a new geofence polygon (validates closure & self-intersection) |
| 2 | `GET` | `/geofences` | Retrieve geofences (supports category filter) |
| 3 | `POST` | `/vehicles` | Register vehicle with unique number, driver, type, phone |
| 4 | `GET` | `/vehicles` | Retrieve registered vehicles with last known location & zone state |
| 5 | `POST` | `/vehicles/location` | Ingest vehicle GPS update, run PIP detection, record transitions, match alert rules |
| 6 | `GET` | `/vehicles/location/:id` | Retrieve current location and active geofences for a vehicle |
| 7 | `POST` | `/alerts/configure` | Configure alert rule for geofence, optional vehicle, and event type |
| 8 | `GET` | `/alerts` | Retrieve configured alert rules (supports geofence & vehicle filters) |
| 9 | `GET` | `/violations/history` | Query historical geofence transitions with vehicle, zone, date, and limit filters |
| + | `GET` | `/ws/alerts` | WebSocket streaming endpoint for real-time alert broadcasts |

---

## 5. Quick Start with Docker Compose

Ensure Docker and Docker Compose are installed.

```bash
# 1. Clone repository
git clone https://github.com/your-username/geotrack.git
cd geotrack

# 2. Start all services (Database + PostGIS, Go Backend, React Frontend)
docker-compose up --build -d

# 3. Verify running containers
docker-compose ps
```

- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8080](http://localhost:8080)
- **Health Check:** [http://localhost:8080/health](http://localhost:8080/health)

---

## 6. Video Demonstration Outline (35 Minutes)

1. **Introduction & System Overview (2 min):** Problem statement, architecture, technologies.
2. **Dashboard Overview (3 min):** Fleet statistics, interactive map, activity feed.
3. **Geofence Creation (3 min):** Map drawing mode, manual JSON coordinates, polygon validation.
4. **Vehicle Registration (2 min):** Adding vehicle, uniqueness validation, status tracking.
5. **Alert Rule Configuration (2 min):** Configuring restricted zone rule for entry/exit.
6. **Live Telemetry & Transition Detection (4 min):** Sending GPS updates, entry/exit events, zero duplicate transitions, stale GPS protection.
7. **WebSocket Alerts (3 min):** Live toast delivery, unread counter, audio chime, reconnect behavior.
8. **Violation History & Filtering (2 min):** Multi-criteria filters, pagination, location audit.
9. **Docker & Infrastructure (2 min):** Multi-stage Dockerfiles, Docker Compose health checks.
10. **Backend Architecture & Geospatial Logic (6 min):** PostGIS `ST_Covers`, ray casting, transition state machine.
11. **Frontend Architecture (3 min):** React component tree, Zustand + TanStack Query, Leaflet.
12. **Roadmap & Conclusion (3 min):** Hysteresis buffer zones, Kafka scaling, mobile telematics.

