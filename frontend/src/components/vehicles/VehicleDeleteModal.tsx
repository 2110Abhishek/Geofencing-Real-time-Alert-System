import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { deleteVehicle } from '../../services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { VehicleWithLocation } from '../../types';

interface Props {
  vehicle: VehicleWithLocation;
  onClose: () => void;
}

export const VehicleDeleteModal: React.FC<Props> = ({ vehicle, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

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

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await deleteVehicle(vehicle.id);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      toast.success(`Vehicle ${vehicle.vehicle_number} has been deleted.`);
      onClose();
    } catch (err: any) {
      toast.error('Failed to delete vehicle', {
        description: err.response?.data?.error || err.message,
      });
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
      <div className="relative z-[100000] w-full max-w-md rounded-2xl bg-[#0E1726] border border-red-500/30 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B] bg-[#1a1215]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Delete Vehicle</h3>
              <p className="text-xs text-red-400/80">Permanent removal confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#16243C] border border-transparent hover:border-[#1E293B] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to permanently delete vehicle{' '}
            <strong className="text-white font-mono bg-[#16243C] px-2 py-0.5 rounded border border-[#1E293B]">
              {vehicle.vehicle_number}
            </strong>{' '}
            assigned to driver <strong className="text-slate-200">{vehicle.driver_name}</strong>?
          </p>

          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-[11px] text-red-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Warning:
            </p>
            <p className="text-slate-400">
              This will remove the vehicle asset, unregister its telematics, and cancel active geofence memberships. This action cannot be undone.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-300 hover:text-white hover:bg-[#16243C] transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Deleting...' : 'Yes, Delete Vehicle'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

