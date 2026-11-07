import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation2,
  MapPin,
  Truck,
  BellRing,
  History,
  Settings,
} from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';

export const Sidebar: React.FC = () => {
  const { unreadCount } = useAlertStore();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Live Tracking', path: '/tracking', icon: Navigation2 },
    { label: 'Geofences', path: '/geofences', icon: MapPin },
    { label: 'Vehicles', path: '/vehicles', icon: Truck },
    { label: 'Alert Center', path: '/alerts', icon: BellRing, badge: unreadCount },
    { label: 'Violation History', path: '/history', icon: History },
  ];

  return (
    <aside className="w-64 border-r border-[#1E293B] bg-[#0E1726] flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Fleet Operations
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#16243C]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* System Status info footer */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0B1220]/40">
        <div className="p-3 rounded-xl bg-[#16243C]/80 border border-[#1E293B] text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>Engine</span>
            <span className="text-emerald-400 font-mono font-medium">PostGIS ST_Covers</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Timing SLA</span>
            <span className="text-blue-400 font-mono font-medium">&lt; 200 ms</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Protocol</span>
            <span className="text-purple-400 font-mono font-medium">WSS + REST</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

