import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Navigation, Send, Clock, Layers, AlertCircle, CheckCircle2, RotateCw, MapPin, Radio, Play, Square, Compass } from 'lucide-react';
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

  const [isDeviceStreaming, setIsDeviceStreaming] = useState(false);
  const [isAutoDriving, setIsAutoDriving] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const autoDriveTimerRef = useRef<any>(null);

  // Clean up watchers and intervals on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (autoDriveTimerRef.current) {
        clearInterval(autoDriveTimerRef.current);
      }
    };
  }, []);

  // Fetch real physical device GPS location via browser HTML5 Geolocation
  const handleGetDeviceLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    toast.info('Acquiring real-time GPS coordinates from your device...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setTimestamp(new Date().toISOString());
        toast.success(`Real GPS Coordinates Acquired! (±${Math.round(pos.coords.accuracy)}m)`, {
          description: `Lat: ${lat}, Lng: ${lng}`,
        });
      },
      (err) => {
        toast.error(`GPS Acquisition Failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Toggle continuous physical device GPS broadcasting
  const toggleContinuousDeviceGPS = () => {
    if (isDeviceStreaming) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsDeviceStreaming(false);
      toast.info('Stopped live device GPS stream');
    } else {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        return;
      }
      if (!selectedVehicleId) {
        toast.error('Please select a vehicle first');
        return;
      }
      setIsDeviceStreaming(true);
      toast.success('Live Device GPS Tracking Active! Broadcasting coordinates...');

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setLatitude(lat.toString());
          setLongitude(lng.toString());
          const now = new Date().toISOString();
          setTimestamp(now);

          try {
            const res = await updateVehicleLocation({
              vehicle_id: selectedVehicleId,
              latitude: lat,
              longitude: lng,
              timestamp: now,
            });
            setLastResponse(res);
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          } catch (e) {
            console.error('Device GPS stream error:', e);
          }
        },
        (err) => {
          toast.error(`GPS Stream Error: ${err.message}`);
          setIsDeviceStreaming(false);
        },
        { enableHighAccuracy: true, maximumAge: 2000 }
      );
    }
  };

  // Toggle automated smooth trajectory simulation
  const toggleAutoDrive = () => {
    if (isAutoDriving) {
      if (autoDriveTimerRef.current) clearInterval(autoDriveTimerRef.current);
      autoDriveTimerRef.current = null;
      setIsAutoDriving(false);
      toast.info('Auto-drive route simulation stopped');
    } else {
      if (!selectedVehicleId) {
        toast.error('Please select a vehicle first');
        return;
      }
      setIsAutoDriving(true);
      toast.success('Auto-drive route simulation started! Transmitting every 2.5s...');

      let currentLat = parseFloat(latitude) || 37.7650;
      let currentLng = parseFloat(longitude) || -122.4300;
      let targetLat = 37.7780;
      let targetLng = -122.4150;
      if (geofences.length > 0 && geofences[0].coordinates.length > 0) {
        const g = geofences[0];
        targetLat = g.coordinates.reduce((sum, p) => sum + p[0], 0) / g.coordinates.length;
        targetLng = g.coordinates.reduce((sum, p) => sum + p[1], 0) / g.coordinates.length;
      }

      let step = 0;
      const totalSteps = 10;

      autoDriveTimerRef.current = setInterval(async () => {
        step++;
        const fraction = Math.min(step / totalSteps, 1);
        const nextLat = Number((currentLat + (targetLat - currentLat) * fraction + (Math.random() - 0.5) * 0.0003).toFixed(6));
        const nextLng = Number((currentLng + (targetLng - currentLng) * fraction + (Math.random() - 0.5) * 0.0003).toFixed(6));
        const now = new Date().toISOString();

        setLatitude(nextLat.toString());
        setLongitude(nextLng.toString());
        setTimestamp(now);

        try {
          const res = await updateVehicleLocation({
            vehicle_id: selectedVehicleId,
            latitude: nextLat,
            longitude: nextLng,
            timestamp: now,
          });
          setLastResponse(res);
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        } catch (err) {
          console.error('Auto drive update error:', err);
        }

        if (step >= totalSteps) {
          clearInterval(autoDriveTimerRef.current);
          autoDriveTimerRef.current = null;
          setIsAutoDriving(false);
          toast.success('Route completed! Vehicle arrived inside destination zone.');
        }
      }, 2500);
    }
  };
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Set default vehicle once loaded if not set, and sync coordinates
  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id);
    }
    if (selectedVehicleId) {
      const v = vehicles.find((veh) => veh.id === selectedVehicleId);
      if (v?.last_location) {
        setLatitude(v.last_location.latitude.toString());
        setLongitude(v.last_location.longitude.toString());
      }
    }
  }, [vehicles, selectedVehicleId]);

  // One-click: fetch device GPS and instantly submit to server
  const handleUpdateToDeviceGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Browser does not support HTML5 Geolocation');
      return;
    }
    if (!selectedVehicleId) {
      toast.error('Please choose a vehicle first');
      return;
    }

    setIsLoading(true);
    toast.info('Acquiring real-time GPS coordinates from your device...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat.toString());
        setLongitude(lng.toString());
        const now = new Date().toISOString();
        setTimestamp(now);

        try {
          const res = await updateVehicleLocation({
            vehicle_id: selectedVehicleId,
            latitude: lat,
            longitude: lng,
            timestamp: now,
          });
          setLastResponse(res);
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          toast.success(`🎯 Updated vehicle to your real location! [${lat}, ${lng}]`);
        } catch (err: any) {
          toast.error('Location update failed', { description: err.response?.data?.error || err.message });
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setIsLoading(false);
        toast.error(`GPS Error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Quick coordinate presets
  const applyPreset = (type: 'outside' | 'inside_first' | 'stale') => {
    if (type === 'outside') {
      setLatitude('37.8500');
      setLongitude('-122.5000');
      setTimestamp(new Date().toISOString());
    } else if (type === 'inside_first' && geofences.length > 0) {
      const g = geofences[0];
      if (g.coordinates && g.coordinates.length > 0) {
        const avgLat = g.coordinates.reduce((sum, p) => sum + p[0], 0) / g.coordinates.length;
        const avgLng = g.coordinates.reduce((sum, p) => sum + p[1], 0) / g.coordinates.length;
        setLatitude(avgLat.toFixed(6));
        setLongitude(avgLng.toFixed(6));
        setTimestamp(new Date().toISOString());
      }
    } else if (type === 'stale') {
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
      toast.error('Invalid coordinates format');
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

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      style={{ isolation: 'isolate' }}
    >
      <div
        className="relative z-[100000] w-full max-w-lg rounded-2xl bg-[#0E1726] border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B] bg-[#111C2E]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-sm">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Telemetry Ingestion Simulator</h3>
              <p className="text-xs text-slate-400">Dispatch GPS coordinates to POST /vehicles/location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#16243C] border border-transparent hover:border-[#1E293B] transition-all"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Vehicle <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
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
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#16243C] hover:bg-slate-700 text-slate-200 border border-[#1E293B] transition-all shadow-sm"
              >
                Outside Zones
              </button>
              <button
                type="button"
                onClick={() => applyPreset('inside_first')}
                disabled={geofences.length === 0}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all disabled:opacity-40 shadow-sm"
              >
                Inside 1st Zone Centroid
              </button>
              <button
                type="button"
                onClick={() => applyPreset('stale')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all shadow-sm"
              >
                Stale Timestamp (-1h)
              </button>
            </div>
          </div>

          {/* Real Device GPS & Live Stream Controls */}
          <div className="p-3.5 rounded-xl bg-[#16243C]/70 border border-[#1E293B] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Live Real-Time GPS Sources
              </span>
              {(isDeviceStreaming || isAutoDriving) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  Streaming Live
                </span>
              )}
            </div>

            {/* 1-Click Update to Real Device GPS */}
            <button
              type="button"
              onClick={handleUpdateToDeviceGPS}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all border border-emerald-400/30"
              title="Acquire your actual phone/laptop GPS coordinates and immediately update vehicle location on the map"
            >
              <Compass className="w-4 h-4" />
              <span>🎯 Update Vehicle to My Real GPS Location Now</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleGetDeviceLocation}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg bg-[#0E1726] hover:bg-slate-800 text-slate-200 border border-[#1E293B] hover:border-cyan-500/50 transition-all shadow-sm"
                title="Acquire current latitude/longitude from your phone/laptop GPS"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>My Device GPS</span>
              </button>

              <button
                type="button"
                onClick={toggleContinuousDeviceGPS}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all shadow-sm ${
                  isDeviceStreaming
                    ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse'
                    : 'bg-[#0E1726] hover:bg-slate-800 text-slate-200 border-[#1E293B] hover:border-emerald-500/50'
                }`}
                title="Stream your device's physical movement in real-time"
              >
                {isDeviceStreaming ? (
                  <>
                    <Square className="w-3 h-3 text-red-400 fill-current" />
                    <span>Stop Stream</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Stream Device</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleAutoDrive}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all shadow-sm ${
                  isAutoDriving
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                    : 'bg-[#0E1726] hover:bg-slate-800 text-slate-200 border-[#1E293B] hover:border-blue-500/50'
                }`}
                title="Simulate vehicle moving smoothly into a geofence zone"
              >
                {isAutoDriving ? (
                  <>
                    <Square className="w-3 h-3 text-amber-400 fill-current" />
                    <span>Stop Route</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-blue-400 fill-current" />
                    <span>Auto-Drive</span>
                  </>
                )}
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Timestamp (UTC RFC3339) <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setTimestamp(new Date().toISOString())}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <RotateCw className="w-3 h-3" />
                <span>Set to Current Time</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
            />
          </div>

          {/* Last Response Inspector */}
          {lastResponse && (
            <div className="p-4 rounded-xl bg-[#16243C] border border-[#1E293B] text-xs space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-slate-200 font-semibold pb-1.5 border-b border-[#1E293B]">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  API Ingestion Response
                </span>
                <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {lastResponse.time_ns} ns
                </span>
              </div>
              <div className="text-slate-300 space-y-1">
                <div>
                  <strong className="text-slate-400">Active Geofence Memberships:</strong>{' '}
                  {lastResponse.current_geofences.length === 0 ? (
                    <span className="text-slate-500 italic">None (outside all geofences)</span>
                  ) : (
                    lastResponse.current_geofences.map((g) => g.name).join(', ')
                  )}
                </div>
                <div>
                  <strong className="text-slate-400">Transitions Generated:</strong>{' '}
                  {lastResponse.events_generated.length === 0 ? (
                    <span className="text-slate-500 italic">0 (unchanged membership state)</span>
                  ) : (
                    lastResponse.events_generated.map((e) => (
                      <span key={e.event_id} className="ml-1.5 px-2 py-0.5 rounded bg-blue-500/25 text-blue-300 font-bold uppercase text-[10px] border border-blue-500/40">
                        {e.event_type}: {e.geofence_name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-300 hover:text-white hover:bg-[#16243C] border border-transparent hover:border-[#1E293B] transition-all"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedVehicleId}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Transmitting...' : 'Send Location Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
