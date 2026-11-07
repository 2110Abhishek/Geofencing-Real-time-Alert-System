import React from 'react';
import { LogIn, LogOut, ShieldAlert, Clock, ArrowRight } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';
import { Link } from 'react-router-dom';

export const ActivityFeed: React.FC = () => {
  const { alerts } = useAlertStore();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="rounded-2xl bg-[#0E1726] border border-[#1E293B] p-4 flex flex-col h-[340px]">
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm text-slate-200">Real-Time Event Stream</h3>
        </div>
        <Link
          to="/history"
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
        >
          <span>Full History</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Clock className="w-8 h-8 mb-2 opacity-30" />
            <span>Listening for geofence transitions...</span>
            <span className="text-[11px] text-slate-400 mt-1">Use "Simulate GPS" to test events live.</span>
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const isEntry = alert.event_type === 'entry';
            const Icon = isEntry ? LogIn : LogOut;
            const iconColor = isEntry ? 'text-emerald-400' : 'text-amber-400';
            const iconBg = isEntry ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20';

            return (
              <div
                key={alert.event_id || idx}
                className="p-2.5 rounded-xl bg-[#16243C]/60 border border-[#1E293B] hover:border-slate-600 transition-all text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg border ${iconBg}`}>
                    <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        {alert.vehicle.vehicle_number}
                      </span>
                      <span className="text-slate-400 capitalize">
                        {alert.event_type}
                      </span>
                      <span className="font-medium text-slate-300">
                        "{alert.geofence.geofence_name}"
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Driver: {alert.vehicle.driver_name}</span>
                      <span>•</span>
                      <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold border ${getSeverityBadge(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

