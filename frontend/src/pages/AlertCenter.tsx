import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAlerts } from '../services/api';
import { BellRing, Plus, ShieldAlert, LogIn, LogOut, CheckCircle2, Trash2 } from 'lucide-react';
import { AlertConfigModal } from '../components/alerts/AlertConfigModal';
import { useAlertStore } from '../store/alertStore';
import { WSAlertPayload } from '../types';

export const AlertCenter: React.FC = () => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { alerts, clearAlerts, unreadCount, markAllAsRead } = useAlertStore();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlerts(),
  });

  const alertConfigs = data?.alerts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Alert Configuration & Real-Time Center</h1>
          <p className="text-xs text-slate-400">
            Automated boundary rules, WebSocket dispatch stream, and incident logging
          </p>
        </div>

        <button
          onClick={() => setIsConfigOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Alert Rule</span>
        </button>
      </div>

      {/* Configured Alert Rules Table */}
      <div className="rounded-2xl bg-[#0E1726] border border-[#1E293B] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-sm text-slate-200">Active Alert Rules ({alertConfigs.length})</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#16243C]/80 border-b border-[#1E293B] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Monitored Geofence</th>
                <th className="py-3 px-4">Applicable Fleet Units</th>
                <th className="py-3 px-4">Trigger Condition</th>
                <th className="py-3 px-4">Rule Status</th>
                <th className="py-3 px-4">Configured Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading alert configurations...
                  </td>
                </tr>
              ) : alertConfigs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <BellRing className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-400">No alert rules configured</p>
                    <p className="text-[11px] mt-1">Configure a rule to receive notifications when vehicles cross boundaries.</p>
                  </td>
                </tr>
              ) : (
                alertConfigs.map((rule) => (
                  <tr key={rule.id} className="hover:bg-[#16243C]/50 transition-all">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div>{rule.geofence_name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{rule.geofence_category.replace('_', ' ')}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {rule.vehicle_number ? (
                        <span className="font-mono font-semibold text-blue-400">
                          {rule.vehicle_number} ({rule.driver_name})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-200 border border-slate-600">
                          ALL VEHICLES
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {rule.event_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(rule.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Dispatched Alerts Stream */}
      <div className="rounded-2xl bg-[#0E1726] border border-[#1E293B] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-sm text-slate-200">
              Live WebSocket Broadcast Feed ({alerts.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="px-2.5 py-1 text-xs rounded-lg bg-[#16243C] hover:bg-slate-700 text-slate-300 border border-[#1E293B] transition-all"
            >
              Mark Read
            </button>
            <button
              onClick={clearAlerts}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No live alerts received in this session yet.
            </div>
          ) : (
            alerts.map((alert: WSAlertPayload, idx: number) => (
              <div
                key={alert.event_id || idx}
                className="p-3 rounded-xl bg-[#16243C]/60 border border-[#1E293B] text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl border ${
                      alert.event_type === 'entry'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}
                  >
                    {alert.event_type === 'entry' ? (
                      <LogIn className="w-4 h-4" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm font-mono">
                        {alert.vehicle.vehicle_number}
                      </span>
                      <span className="text-slate-400 font-medium capitalize">
                        {alert.event_type}
                      </span>
                      <span className="text-slate-200 font-semibold">
                        "{alert.geofence.geofence_name}"
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Driver: {alert.vehicle.driver_name} • Coords: {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                      alert.severity === 'critical'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isConfigOpen && <AlertConfigModal onClose={() => setIsConfigOpen(false)} />}
    </div>
  );
};

