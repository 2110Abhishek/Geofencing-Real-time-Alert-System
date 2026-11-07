import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Undo, Trash2, CheckCircle, Info } from 'lucide-react';

interface PolygonDrawerProps {
  onCoordinatesChange: (coords: [number, number][]) => void;
  height?: string;
}

const pointIcon = L.divIcon({
  className: 'custom-point-icon',
  html: `<div class="w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full shadow-md"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const firstPointIcon = L.divIcon({
  className: 'custom-first-point-icon',
  html: `<div class="w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-lg ring-2 ring-emerald-400/50 animate-pulse"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const MapEvents: React.FC<{ onAddPoint: (lat: number, lng: number) => void }> = ({ onAddPoint }) => {
  useMapEvents({
    click(e) {
      onAddPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const PolygonDrawer: React.FC<PolygonDrawerProps> = ({
  onCoordinatesChange,
  height = '350px',
}) => {
  const [points, setPoints] = useState<[number, number][]>([]);

  const handleAddPoint = (lat: number, lng: number) => {
    const newPoints: [number, number][] = [...points, [lat, lng]];
    setPoints(newPoints);

    // If 3 or more points exist, close polygon by copying first point to end
    if (newPoints.length >= 3) {
      const closed: [number, number][] = [...newPoints, newPoints[0]];
      onCoordinatesChange(closed);
    } else {
      onCoordinatesChange([]);
    }
  };

  const handleUndo = () => {
    if (points.length === 0) return;
    const newPoints = points.slice(0, points.length - 1);
    setPoints(newPoints);
    if (newPoints.length >= 3) {
      onCoordinatesChange([...newPoints, newPoints[0]]);
    } else {
      onCoordinatesChange([]);
    }
  };

  const handleClear = () => {
    setPoints([]);
    onCoordinatesChange([]);
  };

  const isClosed = points.length >= 3;
  const closedPolyline = isClosed ? [...points, points[0]] : points;

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border border-[#1E293B] shadow-inner" style={{ height }}>
        <MapContainer
          center={[37.7749, -122.4194]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapEvents onAddPoint={handleAddPoint} />

          {/* Point markers */}
          {points.map((pt, idx) => (
            <Marker
              key={idx}
              position={pt}
              icon={idx === 0 ? firstPointIcon : pointIcon}
            />
          ))}

          {/* Render boundary line */}
          {points.length > 1 && (
            <Polyline
              positions={closedPolyline}
              pathOptions={{
                color: isClosed ? '#10B981' : '#3B82F6',
                weight: 2,
                dashArray: isClosed ? undefined : '5, 5',
              }}
            />
          )}

          {/* Render filled polygon when valid */}
          {isClosed && (
            <Polygon
              positions={closedPolyline}
              pathOptions={{
                color: '#10B981',
                fillColor: '#10B981',
                fillOpacity: 0.25,
                weight: 2,
              }}
            />
          )}
        </MapContainer>

        {/* Floating Instruction overlay */}
        <div className="absolute top-3 left-3 z-[500] bg-[#0E1726]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1E293B] text-xs text-slate-300 flex items-center gap-1.5 shadow">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>Click map to add boundary points (minimum 3 vertices)</span>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-3 left-3 z-[500] flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={points.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-[#16243C]/90 text-slate-300 hover:text-white border border-[#1E293B] disabled:opacity-40 transition-all shadow"
          >
            <Undo className="w-3 h-3" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={points.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-40 transition-all shadow"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>

        {/* Vertex counter badge */}
        <div className="absolute bottom-3 right-3 z-[500] bg-[#0E1726]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#1E293B] text-xs text-slate-300 shadow">
          {points.length} vertices {isClosed ? '✓ Closed' : '(add ' + (3 - points.length) + ' more)'}
        </div>
      </div>
    </div>
  );
};

