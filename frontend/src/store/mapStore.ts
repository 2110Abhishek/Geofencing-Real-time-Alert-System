import { create } from 'zustand';

interface MapState {
  center: [number, number];
  zoom: number;
  selectedVehicleId: string | null;
  selectedGeofenceId: string | null;
  categoryFilter: string | null;
  showDelivery: boolean;
  showRestricted: boolean;
  showToll: boolean;
  showCustomer: boolean;
  setCenter: (center: [number, number], zoom?: number) => void;
  setSelectedVehicleId: (id: string | null) => void;
  setSelectedGeofenceId: (id: string | null) => void;
  setCategoryFilter: (category: string | null) => void;
  toggleLayer: (layer: 'showDelivery' | 'showRestricted' | 'showToll' | 'showCustomer') => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: [37.7749, -122.4194], // Default San Francisco coordinates
  zoom: 13,
  selectedVehicleId: null,
  selectedGeofenceId: null,
  categoryFilter: null,
  showDelivery: true,
  showRestricted: true,
  showToll: true,
  showCustomer: true,
  setCenter: (center, zoom) =>
    set((state) => ({ center, zoom: zoom !== undefined ? zoom : state.zoom })),
  setSelectedVehicleId: (id) => set({ selectedVehicleId: id }),
  setSelectedGeofenceId: (id) => set({ selectedGeofenceId: id }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  toggleLayer: (layer) =>
    set((state) => ({ [layer]: !state[layer] })),
}));

