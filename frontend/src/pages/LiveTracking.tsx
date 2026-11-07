import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVehicles, getGeofences } from '../services/api';
import { FleetMap } from '../components/maps/FleetMap';
import { useMapStore } from '../store/mapStore';
import { Truck, Navigation, Search, Activity, ShieldCheck, Clock } from 'lucide-react';
import { VehicleWithLocation } from '../types';
import { VehicleTelemetryModal } from '../components/vehicles/VehicleTelemetryModal';

export const LiveTracking: React.FC = () => {
  const { setCenter, selectedVehicleId, setSelectedVehicleId } = useMapStore();
  const [search, setSearch] = useState('');
  const [telemetryVehicleId, setTelemetryVehicleId] = useState<string | null>(null);

  const { data: vehicleData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    refetchInterval: 3000,
  });

  const { data: geofenceData } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => getGeofences(),
  });

  const vehicles = vehicleData?.vehicles || [];
  const geofences = geofenceData?.geofences || [];

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
      v.driver_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectVehicle = (v: VehicleWithLocation) => {
    setSelectedVehicleId(v.id);
    if (v.last_location) {
      setCenter([v.last_location.latitude, v.last_location.longitude], 15);
    }
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Live Vehicle Tracking</h1>
          <p className="text-xs text-slate-400">Continuous telemetry monitoring and boundary intersections</p>
        </div>
        <button
          onClick={() => setTelemetryVehicleId(selectedVehicleId || vehicles[0]?.id || '')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Simulate GPS Telemetry</span>
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Vehicles Sidebar */}
        <div className="w-80 rounded-2xl bg-[#0E1726] border border-[#1E293B] flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-[#1E293B]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vehicle or driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredVehicles.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No registered vehicles found.
              </div>
            ) : (
              filteredVehicles.map((v) => {
                const isSelected = selectedVehicleId === v.id;
                const hasLocation = !!v.last_location;
                const inZone = v.current_geofences && v.current_geofences.length > 0;

                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelectVehicle(v)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/50 shadow-sm'
                        : 'bg-[#16243C]/40 border-[#1E293B] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white font-mono">
                        {v.vehicle_number}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          hasLocation
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {hasLocation ? 'Active' : 'Offline'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mt-1">
                      <div>Driver: <span className="text-slate-200">{v.driver_name}</span> ({v.vehicle_type})</div>
                      <div>Phone: <span className="text-slate-300">{v.phone}</span></div>
                    </div>

                    {hasLocation && v.last_location && (
                      <div className="mt-2 pt-2 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-slate-400">
                          {v.last_location.latitude.toFixed(4)}, {v.last_location.longitude.toFixed(4)}
                        </span>
                        {inZone && (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Inside zone
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Full Interactive Map */}
        <div className="flex-1 h-full rounded-2xl overflow-hidden border border-[#1E293B]">
          <FleetMap
            vehicles={vehicles}
            geofences={geofences}
            height="100%"
            onSelectVehicle={handleSelectVehicle}
          />
        </div>
      </div>

      {telemetryVehicleId && (
        <VehicleTelemetryModal
          defaultVehicleId={telemetryVehicleId}
          onClose={() => setTelemetryVehicleId(null)}
        />
      )}
    </div>
  );
};

