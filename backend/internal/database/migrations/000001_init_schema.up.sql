-- Enable PostGIS and UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_number VARCHAR(50) NOT NULL UNIQUE,
    driver_name VARCHAR(150) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Geofences table
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    polygon GEOMETRY(POLYGON, 4326) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_geofence_category CHECK (category IN ('delivery_zone', 'restricted_zone', 'toll_zone', 'customer_area'))
);

-- 3. Vehicle Locations table
CREATE TABLE IF NOT EXISTS vehicle_locations (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Vehicle Geofence States table (State tracking for transition detection)
CREATE TABLE IF NOT EXISTS vehicle_geofence_states (
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    is_inside BOOLEAN NOT NULL DEFAULT FALSE,
    last_event_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (vehicle_id, geofence_id)
);

-- 5. Geofence Events table (Historical transitions)
CREATE TABLE IF NOT EXISTS geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_event_type CHECK (event_type IN ('entry', 'exit'))
);

-- 6. Alert Configurations table
CREATE TABLE IF NOT EXISTS alert_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_alert_event_type CHECK (event_type IN ('entry', 'exit', 'both'))
);

-- 7. Alert Notifications table (Audit log of generated alerts)
CREATE TABLE IF NOT EXISTS alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES geofence_events(id) ON DELETE CASCADE,
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'delivered',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-performance spatial and time-series querying
CREATE INDEX IF NOT EXISTS idx_geofences_polygon ON geofences USING GIST (polygon);
CREATE INDEX IF NOT EXISTS idx_locations_vehicle_timestamp ON vehicle_locations (vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_vehicle_timestamp ON geofence_events (vehicle_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_geofence_timestamp ON geofence_events (geofence_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_geofence_vehicle ON alert_configurations (geofence_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_states_vehicle ON vehicle_geofence_states (vehicle_id);

