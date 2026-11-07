import React from 'react';
import { Radio, Bell, ShieldAlert, Activity, Navigation, Plus } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';

interface NavbarProps {
  onOpenTelemetry?: () => void;
  onOpenRegisterVehicle?: () => void;
  onOpenCreateGeofence?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTelemetry,
  onOpenRegisterVehicle,
  onOpenCreateGeofence,
}) => {
  const { connectionStatus, unreadCount, markAllAsRead } = useAlertStore();

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live WebSocket Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Connecting...
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            Disconnected
          </span>
        );
    }
  };

  return (
    <header className="h-16 border-b border-[#1E293B] bg-[#0B1220]/90 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Navigation className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              GeoTrack
            </span>
            <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Fleet v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Smart Geofencing & Real-Time Telematics
          </p>
        </div>
      </div>

      {/* Center status */}
      <div className="hidden md:flex items-center gap-4">
        {getStatusBadge()}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {onOpenTelemetry && (
          <button
            onClick={onOpenTelemetry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
            title="Simulate GPS telemetry ping"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Simulate GPS</span>
          </button>
        )}

        {/* Live Notification Indicator */}
        <div className="relative">
          <button
            onClick={markAllAsRead}
            className="p-2 rounded-lg bg-[#16243C] text-slate-300 hover:text-white border border-[#1E293B] hover:border-slate-600 transition-all relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white animate-bounce shadow">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#1E293B]">
          <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-semibold text-slate-200">
            FA
          </div>
          <div className="hidden lg:block text-left text-xs">
            <div className="font-medium text-slate-200">Fleet Admin</div>
            <div className="text-[10px] text-slate-400">admin@geotrack.io</div>
          </div>
        </div>
      </div>
    </header>
  );
};

