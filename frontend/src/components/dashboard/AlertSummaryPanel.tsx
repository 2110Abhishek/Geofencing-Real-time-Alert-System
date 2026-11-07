import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';
import { Link } from 'react-router-dom';

export const AlertSummaryPanel: React.FC = () => {
  const { alerts } = useAlertStore();
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');

  return (
    <div className="rounded-2xl bg-[#0E1726] border border-[#1E293B] p-4 flex flex-col h-[340px]">
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <h3 className="font-semibold text-sm text-slate-200">Critical Zone Violations</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          {criticalAlerts.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
        {criticalAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
            <ShieldAlert className="w-8 h-8 mb-2 text-emerald-500/40" />
            <span className="text-slate-300 font-medium">All Clear</span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              No restricted zone boundary violations detected today.
            </span>
          </div>
        ) : (
          criticalAlerts.map((alert, idx) => (
            <div
              key={alert.event_id || idx}
              className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  RESTRICTED ACCESS
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-slate-300">
                Vehicle <strong className="text-white">{alert.vehicle.vehicle_number}</strong> entered{' '}
                <strong className="text-white">{alert.geofence.geofence_name}</strong>.
              </p>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-red-500/10">
                <span>Driver: {alert.vehicle.driver_name}</span>
                <span className="font-mono text-slate-400">
                  {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

