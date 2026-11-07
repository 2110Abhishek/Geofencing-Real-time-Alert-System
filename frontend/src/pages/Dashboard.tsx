import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVehicles, getGeofences, getAlerts } from '../services/api';
import { StatsCards } from '../components/dashboard/StatsCards';
import { FleetMap } from '../components/maps/FleetMap';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { AlertSummaryPanel } from '../components/dashboard/AlertSummaryPanel';
import { useAlertStore } from '../store/alertStore';
import { useOutletContext } from 'react-router-dom';
import { Plus, Navigation, MapPin } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const context = useOutletContext<{
    openTelemetry: () => void;
    openRegisterVehicle: () => void;
    openCreateGeofence: () => void;
  }>();

  const { data: vehicleData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    refetchInterval: 5000,
  });

  const { data: geofenceData, isLoading: geofencesLoading } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => getGeofences(),
  });

  const { alerts } = useAlertStore();

  const vehicles = vehicleData?.vehicles || [];
  const geofences = geofenceData?.geofences || [];

  const activeVehicles = vehicles.filter((v) => v.last_location).length;
  const vehiclesInZones = vehicles.filter((v) => v.current_geofences && v.current_geofences.length > 0).length;
  const restrictedViolations = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Fleet Monitoring Dashboard</h1>
          <p className="text-xs text-slate-400">
            Real-time geospatial telemetry, boundary intersection engine & alert hub
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={context?.openRegisterVehicle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#16243C] hover:bg-[#1E293B] text-slate-200 border border-[#1E293B] transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Vehicle</span>
          </button>
          <button
            onClick={context?.openCreateGeofence}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#16243C] hover:bg-[#1E293B] text-slate-200 border border-[#1E293B] transition-all"
          >
            <MapPin className="w-3.5 h-3.5 text-purple-400" />
            <span>Draw Geofence</span>
          </button>
          <button
            onClick={context?.openTelemetry}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Simulate GPS Telemetry</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <StatsCards
        totalVehicles={vehicles.length}
        activeVehicles={activeVehicles}
        vehiclesInZones={vehiclesInZones}
        totalGeofences={geofences.length}
        todayAlerts={alerts.length}
        restrictedViolations={restrictedViolations}
      />

      {/* Main Map */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Live Fleet Geospatial Positioning
          </span>
          <span className="text-xs text-slate-500">
            {activeVehicles} active units • {geofences.length} monitored boundaries
          </span>
        </div>
        <FleetMap
          vehicles={vehicles}
          geofences={geofences}
          height="480px"
        />
      </div>

      {/* Activity and Alerts Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed />
        <AlertSummaryPanel />
      </div>
    </div>
  );
};

