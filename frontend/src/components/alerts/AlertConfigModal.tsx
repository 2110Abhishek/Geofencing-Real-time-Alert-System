import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BellRing, Check, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGeofences, getVehicles, configureAlert } from '../../services/api';
import { toast } from 'sonner';
import { EventType } from '../../types';

interface Props {
  onClose: () => void;
  defaultGeofenceId?: string;
}

export const AlertConfigModal: React.FC<Props> = ({ onClose, defaultGeofenceId }) => {
  const queryClient = useQueryClient();

  const { data: geofenceData } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => getGeofences(),
  });

  const { data: vehicleData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  });

  const geofences = geofenceData?.geofences || [];
  const vehicles = vehicleData?.vehicles || [];

  const [geofenceId, setGeofenceId] = useState<string>(
    defaultGeofenceId || (geofences[0]?.id || '')
  );
  const [vehicleId, setVehicleId] = useState<string>(''); // empty means All Vehicles
  const [eventType, setEventType] = useState<EventType>('both');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent background scrolling and handle Escape key
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!geofenceId) {
      setError('Please select a geofence.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await configureAlert({
        geofence_id: geofenceId,
        vehicle_id: vehicleId.trim() === '' ? undefined : vehicleId,
        event_type: eventType,
      });

      toast.success('Alert rule configured successfully', {
        description: `Rule ID: ${res.id} created in ${res.time_ns} ns`,
      });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      onClose();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to configure alert rule';
      setError(errMsg);
      toast.error('Configuration failed', { description: errMsg });
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
        className="relative z-[100000] w-full max-w-md rounded-2xl bg-[#0E1726] border border-[#1E293B] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B] bg-[#111C2E]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Configure Alert Rule</h3>
              <p className="text-xs text-slate-400">Set real-time trigger for boundary transitions</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Geofence Boundary <span className="text-red-400">*</span>
            </label>
            <select
              value={geofenceId}
              onChange={(e) => setGeofenceId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            >
              <option value="">-- Select Monitored Geofence --</option>
              {geofences.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.category.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Applicable Vehicle
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            >
              <option value="">All Vehicles (Fleet-Wide Rule)</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} ({v.driver_name})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Leave set to "All Vehicles" to receive alerts for any vehicle entering/exiting this zone.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Trigger Event Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['entry', 'exit', 'both'] as EventType[]).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setEventType(type)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                    eventType === type
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                      : 'bg-[#16243C] border-[#1E293B] text-slate-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-300 hover:text-white hover:bg-[#16243C] border border-transparent hover:border-[#1E293B] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !geofenceId}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Saving...' : 'Create Alert Rule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
