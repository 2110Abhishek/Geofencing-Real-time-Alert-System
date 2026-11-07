import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Dashboard } from '../pages/Dashboard';
import { LiveTracking } from '../pages/LiveTracking';
import { GeofenceManagement } from '../pages/GeofenceManagement';
import { VehicleManagement } from '../pages/VehicleManagement';
import { AlertCenter } from '../pages/AlertCenter';
import { ViolationHistory } from '../pages/ViolationHistory';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'tracking',
        element: <LiveTracking />,
      },
      {
        path: 'geofences',
        element: <GeofenceManagement />,
      },
      {
        path: 'vehicles',
        element: <VehicleManagement />,
      },
      {
        path: 'alerts',
        element: <AlertCenter />,
      },
      {
        path: 'history',
        element: <ViolationHistory />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);

