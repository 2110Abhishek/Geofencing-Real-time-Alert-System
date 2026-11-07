import React from 'react';
import { Truck, ShieldCheck, MapPin, Bell, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface StatsProps {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesInZones: number;
  totalGeofences: number;
  todayAlerts: number;
  restrictedViolations: number;
}

export const StatsCards: React.FC<StatsProps> = ({
  totalVehicles,
  activeVehicles,
  vehiclesInZones,
  totalGeofences,
  todayAlerts,
  restrictedViolations,
}) => {
  const cards = [
    {
      label: 'Total Vehicles',
      value: totalVehicles,
      icon: Truck,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      subtitle: `${activeVehicles} reporting telemetry`,
    },
    {
      label: 'Active Vehicles',
      value: activeVehicles,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      subtitle: 'Operational fleet',
    },
    {
      label: 'Inside Geofences',
      value: vehiclesInZones,
      icon: ShieldCheck,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      subtitle: 'Currently in monitored zones',
    },
    {
      label: 'Active Geofences',
      value: totalGeofences,
      icon: MapPin,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      subtitle: 'Polygons configured',
    },
    {
      label: "Today's Alerts",
      value: todayAlerts,
      icon: Bell,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      subtitle: 'Entry / Exit transitions',
    },
    {
      label: 'Restricted Violations',
      value: restrictedViolations,
      icon: ShieldAlert,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      subtitle: 'High priority alerts',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#0E1726] border border-[#1E293B] shadow-sm hover:border-slate-600 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.label}</span>
              <div className={`p-2 rounded-xl ${card.bgColor} ${card.borderColor} border`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-white">{card.value}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{card.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

