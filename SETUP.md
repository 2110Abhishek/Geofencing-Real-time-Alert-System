# GeoTrack – Local Setup & Installation Guide

This guide covers running GeoTrack locally with Docker Compose or running each component (Go Backend, React Frontend, PostgreSQL + PostGIS) natively.

---

## 1. Prerequisites

- **Docker & Docker Compose** (Recommended): [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Go**: 1.22+ (for native backend build)
- **Node.js**: v20+ or v22+ with `npm` or `pnpm` (for native frontend build)
- **PostgreSQL**: 15+ with **PostGIS** extension enabled

---

## 2. Option A: Running with Docker Compose (Recommended)

Docker Compose automatically spins up the PostgreSQL + PostGIS database, compiles the Go backend multi-stage image, and builds the React frontend container.

```bash
# 1. Start all containers in background
docker-compose up --build -d

# 2. View logs in real time
docker-compose logs -f

# 3. Check health status
docker-compose ps
```

Services exposed:
- **React Frontend**: `http://localhost:5173`
- **Go REST API & WebSocket**: `http://localhost:8080`
- **PostgreSQL + PostGIS**: `localhost:5432` (Username: `postgres`, Password: `postgres`, DB: `geotrack`)

To stop all containers:
```bash
docker-compose down -v
```

---

## 3. Option B: Running Natively on Host

### Step 1: Start PostgreSQL with PostGIS

You can run just the database in Docker:
```bash
docker run -d --name geotrack-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=geotrack \
  -p 5432:5432 \
  postgis/postgis:15-3.4-alpine
```

### Step 2: Run Database Migrations

Apply the migration script located at `backend/internal/database/migrations/000001_init_schema.up.sql`:

```bash
psql -U postgres -h localhost -d geotrack -f backend/internal/database/migrations/000001_init_schema.up.sql
```

*(Note: The Go backend also automatically runs these migrations on startup if tables do not exist).*

### Step 3: Run the Go Backend

```bash
cd backend

# Download dependencies
go mod download

# Set environment variables
export PORT=8080
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/geotrack?sslmode=disable"
export ALLOWED_ORIGINS="*"
export WS_ALLOWED_ORIGINS="*"

# Run server
go run cmd/server/main.go
```

The backend starts listening on `http://localhost:8080`.

### Step 4: Run the React Frontend

```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```

The frontend launches on `http://localhost:5173`.

---

## 4. Testing & Verification

### Running Unit Tests

To run the Go unit tests (geospatial validation, Ray-Casting Point-in-Polygon, transition state machine, alert matching rules):

```bash
cd backend
go test -v ./...
```

Expected output:
```
=== RUN   TestValidatePolygon
--- PASS: TestValidatePolygon (0.00s)
=== RUN   TestPointInPolygon
--- PASS: TestPointInPolygon (0.00s)
=== RUN   TestCoordinatesToWKT
--- PASS: TestCoordinatesToWKT (0.00s)
=== RUN   TestDetectTransition
--- PASS: TestDetectTransition (0.00s)
=== RUN   TestIsStaleLocation
--- PASS: TestIsStaleLocation (0.00s)
=== RUN   TestMatchesAlertRule
--- PASS: TestMatchesAlertRule (0.00s)
PASS
ok      geotrack/backend/internal/geospatial   0.025s
ok      geotrack/backend/internal/services     0.031s
```

### Testing APIs with Postman / Bruno

1. Open Postman or Bruno.
2. Import `postman/GeoTrack_API_Collection.json`.
3. Set the `baseUrl` variable to `http://localhost:8080`.
4. Run the collection to verify all 9 endpoints, boundary inclusion, zero duplicate transitions, and `time_ns` presence in all responses.

### Testing WebSocket Alert Stream

You can test WebSocket real-time delivery using `wscat` or through the frontend UI:

```bash
npx wscat -c ws://localhost:8080/ws/alerts
```

When a vehicle enters a monitored zone matching an alert rule, the connected terminal will instantly receive the structured alert JSON payload:

```json
{
  "event_id": "4d3f2e1a-9b8c-4a7b-b5c6-11d2e3f4a5b6",
  "event_type": "entry",
  "timestamp": "2026-11-07T10:30:00Z",
  "severity": "critical",
  "vehicle": {
    "vehicle_id": "9c4e2b1a-8e31-4d1a-bf44-77a8b9c0d1e2",
    "vehicle_number": "KA-01-AB-1234",
    "driver_name": "John Doe"
  },
  "geofence": {
    "geofence_id": "7b2d5a8e-5b12-4f33-8ecb-99f8d1c6840a",
    "geofence_name": "Restricted Zone",
    "category": "restricted_zone"
  },
  "location": {
    "latitude": 37.7800,
    "longitude": -122.4150
  }
}
```

---

## 5. Troubleshooting

- **Database Connection Refused:** Check that PostgreSQL container is running and healthy: `docker ps`. Verify port `5432` is not bound by a local Postgres service.
- **PostGIS Extension Missing:** GeoTrack uses PostGIS geometries. Ensure you are using `postgis/postgis` image, not plain `postgres`.
- **CORS Issues on Frontend:** Check `ALLOWED_ORIGINS` in `.env` or `docker-compose.yml`. Set to `*` for local testing.
- **Port Conflicts:** If `8080` or `5173` are occupied on your machine, edit the port bindings in `docker-compose.yml`.

