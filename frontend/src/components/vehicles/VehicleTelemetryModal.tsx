import React, { useState } from 'react';
import { X, Navigation, Send, Clock, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVehicles, updateVehicleLocation, getGeofences } from '../../services/api';
import { toast } from 'sonner';
import { LocationUpdateResponse } from '../../types';

interface Props {
  onClose: () => void;
  defaultVehicleId?: string;
}

export const VehicleTelemetryModal: React.FC<Props> = ({ onClose, defaultVehicleId }) => {
  const queryClient = useQueryClient();

  const { data: vehicleData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  });

  const { data: geofenceData } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => getGeofences(),
  });

  const vehicles = vehicleData?.vehicles || [];
  const geofences = geofenceData?.geofences || [];

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    defaultVehicleId || (vehicles[0]?.id || '')
  );
  const [latitude, setLatitude] = useState<string>('37.7749');
  const [longitude, setLongitude] = useState<string>('-122.4194');
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<LocationUpdateResponse | null>(null);

  // Quick coordinate presets
  const applyPreset = (type: 'outside' | 'inside_first' | 'stale') => {
    if (type === 'outside') {
      setLatitude('37.8500');
      setLongitude('-122.5000');
      setTimestamp(new Date().toISOString());
    } else if (type === 'inside_first' && geofences.length > 0) {
      const g = geofences[0];
      if (g.coordinates && g.coordinates.length > 0) {
        // Average coordinates for centroid
        const avgLat = g.coordinates.reduce((sum, p) => sum + p[0], 0) / g.coordinates.length;
        const avgLng = g.coordinates.reduce((sum, p) => sum + p[1], 0) / g.coordinates.length;
        setLatitude(avgLat.toFixed(6));
        setLongitude(avgLng.toFixed(6));
        setTimestamp(new Date().toISOString());
      }
    } else if (type === 'stale') {
      // 1 hour ago
      const past = new Date(Date.now() - 3600000).toISOString();
      setTimestamp(past);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates');
      return;
    }

    try {
      setIsLoading(true);
      const res = await updateVehicleLocation({
        vehicle_id: selectedVehicleId,
        latitude: lat,
        longitude: lng,
        timestamp: timestamp || new Date().toISOString(),
      });

      setLastResponse(res);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      if (res.events_generated && res.events_generated.length > 0) {
        toast.success(`Transition Detected: ${res.events_generated.map(e => `${e.event_type.toUpperCase()} in ${e.geofence_name}`).join(', ')}`, {
          description: `Processed in ${res.time_ns} ns`,
        });
      } else {
        toast.info('Location updated (No state transition)', {
          description: `Processed in ${res.time_ns} ns`,
        });
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Location update failed';
      toast.error('Location update rejected', { description: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-[#0E1726] border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Telemetry Ingestion Simulator</h3>
              <p className="text-xs text-slate-400">Dispatch GPS coordinates to POST /vehicles/location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#16243C] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Vehicle <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
            >
              <option value="">-- Choose registered vehicle --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} ({v.driver_name} - {v.vehicle_type})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Test Presets
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('outside')}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#16243C] hover:bg-slate-700 text-slate-300 border border-[#1E293B] transition-all"
              >
                Outside Zones
              </button>
              <button
                type="button"
                onClick={() => applyPreset('inside_first')}
                disabled={geofences.length === 0}
                className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all disabled:opacity-40"
              >
                Inside 1st Zone Centroid
              </button>
              <button
                type="button"
                onClick={() => applyPreset('stale')}
                className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all"
              >
                Stale Timestamp (-1h)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Latitude <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Longitude <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Timestamp (UTC RFC3339)
              </label>
              <button
                type="button"
                onClick={() => setTimestamp(new Date().toISOString())}
                className="text-[11px] text-blue-400 hover:text-blue-300"
              >
                Set to Now
              </button>
            </div>
            <input
              type="text"
              required
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono text-xs"
            />
          </div>

          {/* Last Response Inspector */}
          {lastResponse && (
            <div className="p-3.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  API Ingestion Response
                </span>
                <span className="font-mono text-blue-400">{lastResponse.time_ns} ns</span>
              </div>
              <div className="text-slate-400">
                <div>
                  <strong>Active Geofence Memberships:</strong>{' '}
                  {lastResponse.current_geofences.length === 0 ? (
                    <span className="text-slate-500 italic">None (outside all geofences)</span>
                  ) : (
                    lastResponse.current_geofences.map((g) => g.name).join(', ')
                  )}
                </div>
                <div>
                  <strong>Transitions Generated:</strong>{' '}
                  {lastResponse.events_generated.length === 0 ? (
                    <span className="text-slate-500 italic">0 (unchanged state)</span>
                  ) : (
                    lastResponse.events_generated.map((e) => (
                      <span key={e.event_id} className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold uppercase text-[10px]">
                        {e.event_type}: {e.geofence_name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-[#16243C] transition-all"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedVehicleId}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Transmitting...' : 'Send Location Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

