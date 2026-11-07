import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGeofences } from '../services/api';
import { MapPin, Plus, Filter, Calendar, Layers, Eye } from 'lucide-react';
import { GeofenceCreateModal } from '../components/geofences/GeofenceCreateModal';
import { useMapStore } from '../store/mapStore';
import { useNavigate } from 'react-router-dom';

export const GeofenceManagement: React.FC = () => {
  const navigate = useNavigate();
  const { setCenter, setSelectedGeofenceId } = useMapStore();
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['geofences', categoryFilter],
    queryFn: () => getGeofences(categoryFilter || undefined),
  });

  const geofences = data?.geofences || [];

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'restricted_zone':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'delivery_zone':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'toll_zone':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'customer_area':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const handleViewOnMap = (g: any) => {
    if (g.coordinates && g.coordinates.length > 0) {
      setCenter(g.coordinates[0], 14);
      setSelectedGeofenceId(g.id);
      navigate('/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Geofence Management</h1>
          <p className="text-xs text-slate-400">
            Define, categorize and monitor geographical boundaries and perimeters
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Geofence</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: 'All Categories', value: '' },
          { label: 'Delivery Zones', value: 'delivery_zone' },
          { label: 'Restricted Zones', value: 'restricted_zone' },
          { label: 'Toll Zones', value: 'toll_zone' },
          { label: 'Customer Areas', value: 'customer_area' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setCategoryFilter(tab.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              categoryFilter === tab.value
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-[#0E1726] border-[#1E293B] text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Geofences Table */}
      <div className="rounded-2xl bg-[#0E1726] border border-[#1E293B] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#16243C]/80 border-b border-[#1E293B] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Name & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vertices</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading geofences...
                  </td>
                </tr>
              ) : geofences.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-400">No geofences found</p>
                    <p className="text-[11px] mt-1">Click "Create Geofence" to draw a zone on the map.</p>
                  </td>
                </tr>
              ) : (
                geofences.map((g) => (
                  <tr key={g.id} className="hover:bg-[#16243C]/50 transition-all">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{g.name}</div>
                      <div className="text-[11px] text-slate-400">{g.description || 'No description'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${getCategoryBadge(g.category)}`}>
                        {g.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {g.point_count} points
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(g.created_at).toLocaleDateString()} {new Date(g.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleViewOnMap(g)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16243C] hover:bg-slate-700 text-blue-400 text-xs font-semibold border border-[#1E293B] transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Map</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <GeofenceCreateModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
};

