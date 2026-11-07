import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { VehicleTelemetryModal } from '../vehicles/VehicleTelemetryModal';
import { VehicleRegisterModal } from '../vehicles/VehicleRegisterModal';
import { GeofenceCreateModal } from '../geofences/GeofenceCreateModal';

export const MainLayout: React.FC = () => {
  // Connect to live WebSocket alerts stream across application lifecycle
  useWebSocket();

  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isRegisterVehicleOpen, setIsRegisterVehicleOpen] = useState(false);
  const [isCreateGeofenceOpen, setIsCreateGeofenceOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1220] text-[#F8FAFC]">
      <Navbar
        onOpenTelemetry={() => setIsTelemetryOpen(true)}
        onOpenRegisterVehicle={() => setIsRegisterVehicleOpen(true)}
        onOpenCreateGeofence={() => setIsCreateGeofenceOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-[#0B1220]/60">
          <Outlet context={{
            openTelemetry: () => setIsTelemetryOpen(true),
            openRegisterVehicle: () => setIsRegisterVehicleOpen(true),
            openCreateGeofence: () => setIsCreateGeofenceOpen(true),
          }} />
        </main>
      </div>

      {/* Global Action Modals */}
      {isTelemetryOpen && (
        <VehicleTelemetryModal onClose={() => setIsTelemetryOpen(false)} />
      )}
      {isRegisterVehicleOpen && (
        <VehicleRegisterModal onClose={() => setIsRegisterVehicleOpen(false)} />
      )}
      {isCreateGeofenceOpen && (
        <GeofenceCreateModal onClose={() => setIsCreateGeofenceOpen(false)} />
      )}
    </div>
  );
};

