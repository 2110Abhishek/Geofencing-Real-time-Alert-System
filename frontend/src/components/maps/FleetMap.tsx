import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Geofence, VehicleWithLocation } from '../../types';
import { useMapStore } from '../../store/mapStore';
import { updateVehicleLocation } from '../../services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Crosshair, MapPin, Compass, Search, LocateFixed, Globe } from 'lucide-react';

interface FleetMapProps {
  vehicles?: VehicleWithLocation[];
  geofences?: Geofence[];
  height?: string;
  onSelectVehicle?: (v: VehicleWithLocation) => void;
  onSelectGeofence?: (g: Geofence) => void;
  interactive?: boolean;
}

// Handler for interactive map clicking to place/update vehicle live location
const MapClickHandler: React.FC<{
  isPinMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
}> = ({ isPinMode, onMapClick }) => {
  useMapEvents({
    click(e) {
      if (isPinMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Controller to synchronize map center & zoom with mapStore via smooth flyTo
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
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
  const queryClient = useQueryClient();
  const { center, zoom, selectedVehicleId, selectedGeofenceId, setCenter } = useMapStore();
  const [isPinMode, setIsPinMode] = useState(false);
  const [activeVehicleId, setActiveVehicleId] = useState<string>(selectedVehicleId || vehicles[0]?.id || '');
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (selectedVehicleId) {
      setActiveVehicleId(selectedVehicleId);
    } else if (!activeVehicleId && vehicles.length > 0) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [selectedVehicleId, vehicles, activeVehicleId]);

  // One-click: fetch user's real physical GPS location and immediately move selected vehicle there
  const handleSetToDeviceGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Browser does not support HTML5 Geolocation');
      return;
    }

    const targetVehicle = vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];
    if (!targetVehicle) {
      toast.error('Please register or select a vehicle first');
      return;
    }

    setIsLocating(true);
    toast.info('Acquiring real-time GPS coordinates from your device...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        try {
          const res = await updateVehicleLocation({
            vehicle_id: targetVehicle.id,
            latitude: lat,
            longitude: lng,
            timestamp: new Date().toISOString(),
          });

          // Immediately fly map to user's real physical position
          setCenter([lat, lng], 16);
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });

          toast.success(
            `🎯 Moved ${targetVehicle.vehicle_number} to your real GPS location!`,
            {
              description: `Coordinates: [${lat}, ${lng}] (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`,
            }
          );
        } catch (err: any) {
          toast.error('Failed to update vehicle location', {
            description: err.response?.data?.error || err.message,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error(`GPS Error: ${err.message}. Please check browser location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search any city, state, or address worldwide (e.g., "Nagpur", "Mumbai", "Pune")
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setIsSearching(false);

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setCenter([lat, lng], 14);
        toast.success(`Flown to: ${data[0].display_name.split(',')[0]}`, {
          description: `Coordinates: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
        });
      } else {
        toast.error(`Location "${searchQuery}" not found. Try a different city or street.`);
      }
    } catch (err) {
      setIsSearching(false);
      toast.error('Failed to search location');
    }
  };

  const handleMapLocationClick = async (lat: number, lng: number) => {
    const targetVehicle = vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];
    if (!targetVehicle) {
      toast.error('Please register or select a vehicle first');
      return;
    }

    try {
      const res = await updateVehicleLocation({
        vehicle_id: targetVehicle.id,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        timestamp: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      if (res.events_generated && res.events_generated.length > 0) {
        toast.success(
          `📍 ${targetVehicle.vehicle_number} moved to [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
          {
            description: `Transition: ${res.events_generated.map(e => `${e.event_type.toUpperCase()} in ${e.geofence_name}`).join(', ')} (${res.time_ns} ns)`,
          }
        );
      } else {
        toast.info(`📍 Updated ${targetVehicle.vehicle_number} location`, {
          description: `Coordinates: [${lat.toFixed(4)}, ${lng.toFixed(4)}] (${res.time_ns} ns)`,
        });
      }
    } catch (err: any) {
      toast.error('Failed to update vehicle location', {
        description: err.response?.data?.error || err.message,
      });
    }
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-[#1E293B] shadow-2xl bg-[#0E1726] ${
        isPinMode ? 'cursor-crosshair' : ''
      }`}
      style={{ height }}
    >
      {/* Top Floating Live Control Bar */}
      <div className="absolute top-3 left-14 right-4 z-[500] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* One-Click Set Vehicle to Real Device GPS */}
          <button
            type="button"
            onClick={handleSetToDeviceGPS}
            disabled={isLocating}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all border border-emerald-400/40 disabled:opacity-50"
            title="Acquire your real device GPS coordinates and immediately move selected vehicle to your actual position"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Acquiring GPS...' : '🎯 Move Vehicle to My Real GPS'}</span>
          </button>

          {/* Toggle Interactive Map Clicking */}
          <button
            type="button"
            onClick={() => setIsPinMode(!isPinMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-lg transition-all border ${
              isPinMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/50'
                : 'bg-[#0E1726]/90 text-cyan-400 border-[#1E293B] hover:bg-slate-800'
            }`}
            title="Click anywhere on the map to set vehicle coordinates"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isPinMode ? 'animate-spin' : ''}`} />
            <span>{isPinMode ? '📍 Map Click Active (Click to Place)' : '📍 Set by Clicking Map'}</span>
          </button>

          {/* Target Vehicle Selector (Visible when placing or moving) */}
          <div className="flex items-center gap-2 bg-[#0E1726]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#1E293B] text-xs shadow-lg">
            <span className="text-slate-400 text-[11px]">Target:</span>
            <select
              value={activeVehicleId}
              onChange={(e) => setActiveVehicleId(e.target.value)}
              className="bg-[#16243C] text-cyan-300 font-mono text-xs rounded-lg px-2 py-0.5 border border-[#1E293B] focus:outline-none focus:border-cyan-400"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} ({v.driver_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search City / Address Bar */}
        <form onSubmit={handleSearchLocation} className="flex items-center gap-1 pointer-events-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search city/street (e.g. Nagpur, India)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-xl bg-[#0E1726]/90 backdrop-blur-md border border-[#1E293B] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-64 transition-all shadow-lg"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow transition-all disabled:opacity-40"
          >
            {isSearching ? '...' : 'Go'}
          </button>
        </form>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={zoom} />
        <MapClickHandler isPinMode={isPinMode} onMapClick={handleMapLocationClick} />

        {/* Free Official OpenStreetMap Tile Layer (Dark-filtered via CSS) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

