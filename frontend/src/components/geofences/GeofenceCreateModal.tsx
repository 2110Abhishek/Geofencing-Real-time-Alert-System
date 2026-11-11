import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Layers, Code, AlertCircle, Check } from 'lucide-react';
import { createGeofence } from '../../services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { GeofenceCategory } from '../../types';
import { PolygonDrawer } from '../maps/PolygonDrawer';

interface Props {
  onClose: () => void;
}

export const GeofenceCreateModal: React.FC<Props> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'draw' | 'manual'>('draw');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GeofenceCategory>('delivery_zone');
  const [drawnCoords, setDrawnCoords] = useState<[number, number][]>([]);

  // Default coordinate example for downtown delivery zone
  const defaultCoordJson = `[
  [37.7749, -122.4194],
  [37.7849, -122.4194],
  [37.7849, -122.4094],
  [37.7749, -122.4094],
  [37.7749, -122.4194]
]`;
  const [manualJson, setManualJson] = useState(defaultCoordJson);

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

    if (!name.trim()) {
      setError('Geofence name is required.');
      return;
    }

    let finalCoordinates: [number, number][] = [];

    if (activeTab === 'draw') {
      if (drawnCoords.length < 4) {
        setError('Please click on the map to create a closed polygon with at least 3 vertices.');
        return;
      }
      finalCoordinates = drawnCoords;
    } else {
      try {
        const parsed = JSON.parse(manualJson);
        if (!Array.isArray(parsed) || parsed.length < 4) {
          setError('Coordinates must be an array of at least 4 [latitude, longitude] pairs.');
          return;
        }
        finalCoordinates = parsed;
      } catch (err) {
        setError('Malformed JSON format for coordinates array.');
        return;
      }
    }

    try {
      setIsLoading(true);
      const res = await createGeofence({
        name: name.trim(),
        description: description.trim(),
        category,
        coordinates: finalCoordinates,
      });

      toast.success('Geofence created successfully', {
        description: `${res.name} (${res.category}) created in ${res.time_ns} ns`,
      });
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      onClose();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to create geofence';
      setError(errMsg);
      toast.error('Geofence creation failed', { description: errMsg });
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
        className="relative z-[100000] w-full max-w-2xl rounded-2xl bg-[#0E1726] border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B] bg-[#111C2E]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Create Geofence Boundary</h3>
              <p className="text-xs text-slate-400">Define geographical polygon perimeter for vehicle monitoring</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Geofence Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Downtown Delivery Zone"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GeofenceCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all capitalize"
              >
                <option value="delivery_zone">Delivery Zone</option>
                <option value="restricted_zone">Restricted Zone</option>
                <option value="toll_zone">Toll Zone</option>
                <option value="customer_area">Customer Area</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Monitored delivery perimeter for downtown logistics"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Creation Method Selection Tabs */}
          <div>
            <div className="flex items-center gap-2 border-b border-[#1E293B] pb-2 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('draw')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'draw'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-[#16243C]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Method A: Interactive Map Drawing</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'manual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-[#16243C]'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Method B: Manual Coordinate JSON</span>
              </button>
            </div>

            {activeTab === 'draw' ? (
              <div className="rounded-xl overflow-hidden border border-[#1E293B]">
                <PolygonDrawer onCoordinatesChange={setDrawnCoords} height="280px" />
              </div>
            ) : (
              <div>
                <textarea
                  rows={8}
                  value={manualJson}
                  onChange={(e) => setManualJson(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-emerald-400 font-mono text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Enter JSON array of [lat, lng] pairs..."
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Format: <code>[[lat, lng], [lat, lng], ..., [first_lat, first_lng]]</code>. Minimum 4 pairs; first and last point must match.
                </p>
              </div>
            )}
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
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Creating...' : 'Save Geofence'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
