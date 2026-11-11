import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, Truck, User, Phone, ShieldCheck, Check } from 'lucide-react';
import { updateVehicle } from '../../services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { VehicleWithLocation } from '../../types';

interface Props {
  vehicle: VehicleWithLocation;
  onClose: () => void;
}

export const VehicleEditModal: React.FC<Props> = ({ vehicle, onClose }) => {
  const queryClient = useQueryClient();
  const [vehicleNumber, setVehicleNumber] = useState(vehicle.vehicle_number);
  const [driverName, setDriverName] = useState(vehicle.driver_name);
  const [vehicleType, setVehicleType] = useState(vehicle.vehicle_type);
  const [phone, setPhone] = useState(vehicle.phone);
  const [status, setStatus] = useState(vehicle.status || 'active');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim() || !driverName.trim()) {
      toast.error('Vehicle Number and Driver Name are required');
      return;
    }

    try {
      setIsLoading(true);
      await updateVehicle(vehicle.id, {
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        driver_name: driverName.trim(),
        vehicle_type: vehicleType.trim(),
        phone: phone.trim(),
        status,
      });

      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Vehicle ${vehicleNumber.trim().toUpperCase()} updated successfully!`);
      onClose();
    } catch (err: any) {
      toast.error('Failed to update vehicle', {
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
      <div className="relative z-[100000] w-full max-w-md rounded-2xl bg-[#0E1726] border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B] bg-[#111C2E]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Edit Fleet Vehicle</h3>
              <p className="text-xs text-slate-400">Update registration, assigned driver, or status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#16243C] border border-transparent hover:border-[#1E293B] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Registration Number <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Driver Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-xs focus:outline-none focus:border-amber-500 transition-all"
              >
                <option value="Truck">Truck</option>
                <option value="Van">Van</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Car">Car</option>
                <option value="Heavy Truck">Heavy Truck</option>
                <option value="Semi-Trailer">Semi-Trailer</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-xs focus:outline-none focus:border-amber-500 transition-all"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-300 hover:text-white hover:bg-[#16243C] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-600/25 transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

