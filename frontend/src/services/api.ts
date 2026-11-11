import axios from 'axios';
import {
  Geofence,
  CreateGeofenceDTO,
  VehicleWithLocation,
  CreateVehicleDTO,
  Vehicle,
  LocationUpdateDTO,
  LocationUpdateResponse,
  CurrentVehicleLocationResponse,
  AlertConfig,
  CreateAlertConfigDTO,
  ViolationHistoryItem,
  ViolationFilters,
} from '../types';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return 'http://localhost:8080';
  if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
    return `https://${envUrl}`;
  }
  return envUrl.replace(/\/$/, '');
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Geofences
export const getGeofences = async (category?: string): Promise<{ geofences: Geofence[]; total: number; time_ns: string }> => {
  const params = category ? { category } : {};
  const response = await apiClient.get('/geofences', { params });
  return response.data;
};

export const createGeofence = async (data: CreateGeofenceDTO): Promise<Geofence & { time_ns: string }> => {
  const response = await apiClient.post('/geofences', data);
  return response.data;
};

export const deleteGeofence = async (id: string): Promise<{ status: string; id: string; time_ns: string }> => {
  const response = await apiClient.delete(`/geofences/${id}`);
  return response.data;
};

// 2. Vehicles
export const getVehicles = async (): Promise<{ vehicles: VehicleWithLocation[]; total: number; time_ns: string }> => {
  const response = await apiClient.get('/vehicles');
  return response.data;
};

export const registerVehicle = async (data: CreateVehicleDTO): Promise<Vehicle & { time_ns: string }> => {
  const response = await apiClient.post('/vehicles', data);
  return response.data;
};

export const updateVehicle = async (
  id: string,
  data: Partial<CreateVehicleDTO> & { status?: string }
): Promise<Vehicle & { time_ns: string }> => {
  const response = await apiClient.put(`/vehicles/${id}`, data);
  return response.data;
};

export const deleteVehicle = async (id: string): Promise<{ status: string; id: string; time_ns: string }> => {
  const response = await apiClient.delete(`/vehicles/${id}`);
  return response.data;
};

// 3. Location Tracking
export const updateVehicleLocation = async (data: LocationUpdateDTO): Promise<LocationUpdateResponse> => {
  const response = await apiClient.post('/vehicles/location', data);
  return response.data;
};

export const getCurrentVehicleLocation = async (vehicleId: string): Promise<CurrentVehicleLocationResponse> => {
  const response = await apiClient.get(`/vehicles/location/${vehicleId}`);
  return response.data;
};

// 4. Alerts
export const getAlerts = async (geofenceId?: string, vehicleId?: string): Promise<{ alerts: AlertConfig[]; total: number; time_ns: string }> => {
  const params: Record<string, string> = {};
  if (geofenceId) params.geofence_id = geofenceId;
  if (vehicleId) params.vehicle_id = vehicleId;
  const response = await apiClient.get('/alerts', { params });
  return response.data;
};

export const configureAlert = async (data: CreateAlertConfigDTO): Promise<AlertConfig & { time_ns: string }> => {
  const response = await apiClient.post('/alerts/configure', data);
  return response.data;
};

// 5. Violations & History
export const getViolationHistory = async (
  filters: ViolationFilters
): Promise<{ events: ViolationHistoryItem[]; total: number; limit: number; offset: number; time_ns: string }> => {
  const response = await apiClient.get('/violations/history', { params: filters });
  return response.data;
};

// 6. Health
export const getHealth = async (): Promise<{ status: string; database: string; time_ns: string }> => {
  const response = await apiClient.get('/health');
  return response.data;
};

