import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getViolationHistory, getVehicles, getGeofences } from '../services/api';
import { History, Filter, RotateCcw, ChevronLeft, ChevronRight, LogIn, LogOut, MapPin, Download } from 'lucide-react';
import { ViolationFilters } from '../types';
import { toast } from 'sonner';

export const ViolationHistory: React.FC = () => {
  const [filters, setFilters] = useState<ViolationFilters>({
    vehicle_id: '',
    geofence_id: '',
    event_type: '',
    start_date: '',
    end_date: '',
    limit: 50,
    offset: 0,
  });

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

  const { data, isLoading } = useQuery({
    queryKey: ['violations', filters],
    queryFn: () => getViolationHistory(filters),
  });

  const events = data?.events || [];
  const total = data?.total || 0;
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const handleClearFilters = () => {
    setFilters({
      vehicle_id: '',
      geofence_id: '',
      event_type: '',
      start_date: '',
      end_date: '',
      limit: 50,
      offset: 0,
    });
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleExportCSV = () => {
    if (events.length === 0) {
      toast.info('No events to export in current filter view');
      return;
    }
    const headers = ['Vehicle Number', 'Driver Name', 'Geofence Name', 'Category', 'Event Type', 'Latitude', 'Longitude', 'Timestamp'];
    const rows = events.map(e => [
      `"${e.vehicle_number}"`,
      `"${e.driver_name}"`,
      `"${e.geofence_name}"`,
      `"${e.geofence_category}"`,
      `"${e.event_type}"`,
      e.latitude,
      e.longitude,
      `"${new Date(e.event_timestamp).toISOString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `geotrack_violations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${events.length} violation events to CSV!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Geofence Violation & Movement History</h1>
          <p className="text-xs text-slate-400">
            Immutable audit trail of vehicle entry and exit transitions across boundaries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#16243C] hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 shadow-sm transition-all"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <div className="text-xs font-mono text-slate-400 bg-[#16243C] px-3 py-1.5 rounded-xl border border-[#1E293B]">
            Total Events: <span className="text-blue-400 font-bold">{total}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="p-4 rounded-2xl bg-[#0E1726] border border-[#1E293B] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Filter className="w-4 h-4 text-blue-400" />
            <span>Filter Violation Events</span>
          </div>
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Vehicle Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Vehicle
            </label>
            <select
              value={filters.vehicle_id}
              onChange={(e) => setFilters({ ...filters, vehicle_id: e.target.value, offset: 0 })}
              className="w-full p-2 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} ({v.driver_name})
                </option>
              ))}
            </select>
          </div>

          {/* Geofence Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Geofence
            </label>
            <select
              value={filters.geofence_id}
              onChange={(e) => setFilters({ ...filters, geofence_id: e.target.value, offset: 0 })}
              className="w-full p-2 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">All Geofences</option>
              {geofences.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Event Transition
            </label>
            <select
              value={filters.event_type}
              onChange={(e) => setFilters({ ...filters, event_type: e.target.value, offset: 0 })}
              className="w-full p-2 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">All Transitions</option>
              <option value="entry">Entry Only</option>
              <option value="exit">Exit Only</option>
            </select>
          </div>

          {/* Page Limit */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Page Size
            </label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), offset: 0 })}
              className="w-full p-2 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
              <option value="250">250 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl bg-[#0E1726] border border-[#1E293B] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#16243C]/80 border-b border-[#1E293B] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Geofence</th>
                <th className="py-3 px-4">Transition</th>
                <th className="py-3 px-4">GPS Coordinates</th>
                <th className="py-3 px-4">Event Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading historical events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-400">No transition records match filters</p>
                  </td>
                </tr>
              ) : (
                events.map((evt) => {
                  const isEntry = evt.event_type === 'entry';
                  return (
                    <tr key={evt.event_id} className="hover:bg-[#16243C]/50 transition-all">
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {evt.event_id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {evt.vehicle_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {evt.driver_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{evt.geofence_name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{evt.geofence_category.replace('_', ' ')}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isEntry
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {isEntry ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                          {evt.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {evt.latitude.toFixed(5)}, {evt.longitude.toFixed(5)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(evt.event_timestamp).toLocaleDateString()} {new Date(evt.event_timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {total > 0 && (
          <div className="p-4 border-t border-[#1E293B] flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing records {offset + 1} to {Math.min(offset + limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setFilters({ ...filters, offset: Math.max(0, offset - limit) })}
                className="p-1.5 rounded-lg bg-[#16243C] hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-all border border-[#1E293B]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-300 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={offset + limit >= total}
                onClick={() => setFilters({ ...filters, offset: offset + limit })}
                className="p-1.5 rounded-lg bg-[#16243C] hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-all border border-[#1E293B]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

