export type GeofenceCategory = 'delivery_zone' | 'restricted_zone' | 'toll_zone' | 'customer_area';
export type VehicleType = 'Truck' | 'Car' | 'Van' | 'Motorcycle' | 'Bus' | 'Other';
export type EventType = 'entry' | 'exit' | 'both';
export type AlertSeverity = 'critical' | 'warning' | 'informational';

export interface Vehicle {
  id: string;
  vehicle_number: string;
  driver_name: string;
  vehicle_type: string;
  phone: string;
  status: string;
  created_at: string;
}

export interface LastLocationInfo {
  latitude: number;
  longitude: number;
  recorded_at: string;
}

export interface VehicleWithLocation extends Vehicle {
  last_location?: LastLocationInfo;
  current_geofences: string[];
}

export interface CreateVehicleDTO {
  vehicle_number: string;
  driver_name: string;
  vehicle_type: string;
  phone: string;
}

export interface Geofence {
  id: string;
  name: string;
  description: string;
  category: GeofenceCategory;
  status: string;
  coordinates: [number, number][]; // [latitude, longitude]
  point_count: number;
  created_at: string;
}

export interface CreateGeofenceDTO {
  name: string;
  description?: string;
  category: GeofenceCategory;
  coordinates: [number, number][];
}

export interface LocationUpdateDTO {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface GeofenceBrief {
  id: string;
  name: string;
  category: string;
}

export interface GeneratedEventBrief {
  event_id: string;
  event_type: 'entry' | 'exit';
  geofence_id: string;
  geofence_name: string;
  timestamp: string;
}

export interface LocationUpdateResponse {
  vehicle_id: string;
  current_geofences: GeofenceBrief[];
  events_generated: GeneratedEventBrief[];
  time_ns: string;
}

export interface CurrentVehicleLocationResponse {
  vehicle: {
    id: string;
    vehicle_number: string;
    driver_name: string;
    vehicle_type: string;
  };
  current_location?: LastLocationInfo;
  current_geofences: GeofenceBrief[];
  time_ns: string;
}

export interface AlertConfig {
  id: string;
  geofence_id: string;
  geofence_name: string;
  geofence_category: string;
  vehicle_id?: string;
  vehicle_number?: string;
  driver_name?: string;
  event_type: EventType;
  status: string;
  created_at: string;
}

export interface CreateAlertConfigDTO {
  geofence_id: string;
  vehicle_id?: string;
  event_type: EventType;
}

export interface ViolationHistoryItem {
  event_id: string;
  vehicle_id: string;
  vehicle_number: string;
  driver_name: string;
  geofence_id: string;
  geofence_name: string;
  geofence_category: string;
  event_type: 'entry' | 'exit';
  latitude: number;
  longitude: number;
  event_timestamp: string;
  created_at: string;
}

export interface ViolationFilters {
  vehicle_id?: string;
  geofence_id?: string;
  event_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface WSAlertPayload {
  event_id: string;
  event_type: 'entry' | 'exit';
  timestamp: string;
  severity: AlertSeverity;
  vehicle: {
    vehicle_id: string;
    vehicle_number: string;
    driver_name: string;
  };
  geofence: {
    geofence_id: string;
    geofence_name: string;
    category: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
}

