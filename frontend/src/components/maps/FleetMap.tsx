import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Geofence, VehicleWithLocation } from '../../types';
import { useMapStore } from '../../store/mapStore';

interface FleetMapProps {
  vehicles?: VehicleWithLocation[];
  geofences?: Geofence[];
  height?: string;
  onSelectVehicle?: (v: VehicleWithLocation) => void;
  onSelectGeofence?: (g: Geofence) => void;
  interactive?: boolean;
}

// Controller to synchronize map center & zoom with mapStore
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

// Create custom DOM Marker using Leaflet DivIcon
const createVehicleIcon = (v: VehicleWithLocation, isSelected: boolean) => {
  const isInside = v.current_geofences && v.current_geofences.length > 0;
  const pulseColor = isInside ? 'bg-amber-400' : 'bg-emerald-400';
  const ringColor = isSelected ? 'ring-4 ring-blue-500 scale-110' : 'ring-2 ring-white/60';

  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200 ${ringColor} rounded-full">
        <div class="w-8 h-8 rounded-full bg-[#111C2E] border-2 border-slate-700 flex items-center justify-center shadow-lg">
          <svg class="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>
        <span class="absolute -top-1 -right-1 w-3 h-3 ${pulseColor} rounded-full ring-2 ring-[#0B1220] animate-pulse"></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const getCategoryStyle = (category: string) => {
  switch (category) {
    case 'restricted_zone':
      return {
        color: '#DC2626',
        fillColor: '#EF4444',
        fillOpacity: 0.28,
        weight: 2,
        dashArray: '4, 4',
      };
    case 'delivery_zone':
      return {
        color: '#059669',
        fillColor: '#10B981',
        fillOpacity: 0.22,
        weight: 2,
      };
    case 'toll_zone':
      return {
        color: '#D97706',
        fillColor: '#F59E0B',
        fillOpacity: 0.22,
        weight: 2,
      };
    case 'customer_area':
      return {
        color: '#7C3AED',
        fillColor: '#8B5CF6',
        fillOpacity: 0.22,
        weight: 2,
      };
    default:
      return {
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.2,
        weight: 2,
      };
  }
};

export const FleetMap: React.FC<FleetMapProps> = ({
  vehicles = [],
  geofences = [],
  height = '600px',
  onSelectVehicle,
  onSelectGeofence,
}) => {
  const { center, zoom, selectedVehicleId, selectedGeofenceId, setCenter } = useMapStore();

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#1E293B] shadow-2xl bg-[#0E1726]" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={zoom} />

        {/* Dark Mode CartoDB Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Geofence Polygons */}
        {geofences.map((geofence) => {
          if (!geofence.coordinates || geofence.coordinates.length < 3) return null;
          const style = getCategoryStyle(geofence.category);
          const isSelected = selectedGeofenceId === geofence.id;

          return (
            <Polygon
              key={geofence.id}
              positions={geofence.coordinates}
              pathOptions={{
                ...style,
                weight: isSelected ? 4 : style.weight,
                color: isSelected ? '#FFFFFF' : style.color,
              }}
              eventHandlers={{
                click: () => {
                  onSelectGeofence?.(geofence);
                },
              }}
            >
              <Tooltip sticky>
                <div className="font-sans text-xs">
                  <span className="font-semibold">{geofence.name}</span>
                  <div className="text-[10px] text-slate-400 capitalize">{geofence.category.replace('_', ' ')}</div>
                </div>
              </Tooltip>
              <Popup>
                <div className="p-1 space-y-1 text-slate-800 text-xs">
                  <div className="font-bold text-sm text-slate-900">{geofence.name}</div>
                  <p className="text-slate-600">{geofence.description || 'No description provided'}</p>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100">
                      {geofence.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{geofence.point_count} vertices</span>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Vehicle Markers */}
        {vehicles.map((vehicle) => {
          if (!vehicle.last_location) return null;
          const { latitude, longitude } = vehicle.last_location;
          const isSelected = selectedVehicleId === vehicle.id;

          return (
            <Marker
              key={vehicle.id}
              position={[latitude, longitude]}
              icon={createVehicleIcon(vehicle, isSelected)}
              eventHandlers={{
                click: () => {
                  setCenter([latitude, longitude], 15);
                  onSelectVehicle?.(vehicle);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -16]}>
                <div className="font-sans text-xs">
                  <span className="font-bold">{vehicle.vehicle_number}</span>
                  <div className="text-[10px] text-slate-400">{vehicle.driver_name} ({vehicle.vehicle_type})</div>
                </div>
              </Tooltip>
              <Popup>
                <div className="p-1 space-y-1.5 text-slate-900 text-xs">
                  <div className="font-bold text-sm flex items-center justify-between">
                    <span>{vehicle.vehicle_number}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-100 text-blue-700">
                      {vehicle.vehicle_type}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    <div><strong>Driver:</strong> {vehicle.driver_name}</div>
                    <div><strong>Phone:</strong> {vehicle.phone}</div>
                    <div><strong>Status:</strong> {vehicle.status}</div>
                    <div><strong>Lat/Lng:</strong> {latitude.toFixed(5)}, {longitude.toFixed(5)}</div>
                  </div>
                  {vehicle.current_geofences && vehicle.current_geofences.length > 0 && (
                    <div className="pt-1 border-t border-slate-200">
                      <span className="text-[10px] font-semibold text-emerald-700">
                        Inside {vehicle.current_geofences.length} monitored zone(s)
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Category Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-[500] bg-[#0E1726]/90 backdrop-blur-md p-3 rounded-xl border border-[#1E293B] shadow-xl text-xs space-y-1.5">
        <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1">
          Zone Categories
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400"></span>
          <span>Delivery Zone</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded bg-red-500 border border-red-400"></span>
          <span>Restricted Zone</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded bg-amber-500 border border-amber-400"></span>
          <span>Toll Plaza</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded bg-purple-500 border border-purple-400"></span>
          <span>Customer Area</span>
        </div>
      </div>
    </div>
  );
};

