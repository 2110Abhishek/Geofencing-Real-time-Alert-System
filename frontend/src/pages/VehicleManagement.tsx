import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '../services/api';
import { Truck, Plus, Phone, Navigation, ShieldCheck, Clock, Activity, UploadCloud, Edit3, Trash2 } from 'lucide-react';
import { VehicleRegisterModal } from '../components/vehicles/VehicleRegisterModal';
import { VehicleTelemetryModal } from '../components/vehicles/VehicleTelemetryModal';
import { VehicleBulkImportModal } from '../components/vehicles/VehicleBulkImportModal';
import { VehicleEditModal } from '../components/vehicles/VehicleEditModal';
import { VehicleDeleteModal } from '../components/vehicles/VehicleDeleteModal';
import { useNavigate } from 'react-router-dom';
import { useMapStore } from '../store/mapStore';
import { VehicleWithLocation } from '../types';

export const VehicleManagement: React.FC = () => {
  const navigate = useNavigate();
  const { setCenter, setSelectedVehicleId } = useMapStore();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [telemetryVehicleId, setTelemetryVehicleId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithLocation | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<VehicleWithLocation | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  });

  const vehicles = data?.vehicles || [];

  const handleTrackVehicle = (v: any) => {
    setSelectedVehicleId(v.id);
    if (v.last_location) {
      setCenter([v.last_location.latitude, v.last_location.longitude], 15);
    }
    navigate('/tracking');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Vehicle Fleet Directory</h1>
          <p className="text-xs text-slate-400">
            Registered fleet assets, assigned drivers, and active telematics state
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#16243C] hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 shadow-sm transition-all"
            title="Import real client vehicles from CSV file"
          >
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>Import Real Fleet CSV</span>
          </button>

          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Vehicle</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0E1726] border border-[#1E293B] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#16243C]/80 border-b border-[#1E293B] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4">Driver & Contact</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Position</th>
                <th className="py-3 px-4">Zone Membership</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading registered vehicles...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-400">No vehicles registered yet</p>
                    <p className="text-[11px] mt-1">Click "Register Vehicle" to add a vehicle to your fleet.</p>
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => {
                  const hasLocation = !!v.last_location;
                  const inZone = v.current_geofences && v.current_geofences.length > 0;

                  return (
                    <tr key={v.id} className="hover:bg-[#16243C]/50 transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                        {v.vehicle_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{v.driver_name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{v.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-700 text-slate-200 border border-slate-600">
                          {v.vehicle_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            hasLocation
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${hasLocation ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                          {hasLocation ? 'Active' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {v.last_location ? (
                          <div>
                            <span className="text-slate-300">
                              {v.last_location.latitude.toFixed(4)}, {v.last_location.longitude.toFixed(4)}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              {new Date(v.last_location.recorded_at).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No GPS fix yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {inZone ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            Inside {v.current_geofences.length} Zone(s)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Outside zones</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setTelemetryVehicleId(v.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16243C] hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-[#1E293B] transition-all"
                          title="Simulate GPS location update"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Ping GPS</span>
                        </button>
                        <button
                          onClick={() => handleTrackVehicle(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-xs font-semibold border border-blue-500/30 transition-all"
                          title="Track vehicle on map"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Track</span>
                        </button>
                        <button
                          onClick={() => setEditingVehicle(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16243C] hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-[#1E293B] hover:border-amber-500/30 transition-all"
                          title="Edit vehicle details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingVehicle(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs font-semibold border border-red-500/20 hover:border-red-500/40 transition-all"
                          title="Delete vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isRegisterOpen && (
        <VehicleRegisterModal onClose={() => setIsRegisterOpen(false)} />
      )}

      {isBulkImportOpen && (
        <VehicleBulkImportModal onClose={() => setIsBulkImportOpen(false)} />
      )}

      {telemetryVehicleId && (
        <VehicleTelemetryModal
          defaultVehicleId={telemetryVehicleId}
          onClose={() => setTelemetryVehicleId(null)}
        />
      )}

      {editingVehicle && (
        <VehicleEditModal
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
        />
      )}

      {deletingVehicle && (
        <VehicleDeleteModal
          vehicle={deletingVehicle}
          onClose={() => setDeletingVehicle(null)}
        />
      )}
    </div>
  );
};

