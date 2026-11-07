import { create } from 'zustand';
import { WSAlertPayload } from '../types';

interface AlertState {
  alerts: WSAlertPayload[];
  unreadCount: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  addAlert: (alert: WSAlertPayload) => void;
  markAllAsRead: () => void;
  clearAlerts: () => void;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,
  connectionStatus: 'disconnected',
  addAlert: (alert: WSAlertPayload) =>
    set((state) => ({
      alerts: [alert, ...state.alerts.slice(0, 99)], // keep latest 100
      unreadCount: state.unreadCount + 1,
    })),
  markAllAsRead: () => set({ unreadCount: 0 }),
  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));

