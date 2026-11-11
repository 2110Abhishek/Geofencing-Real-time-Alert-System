import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, FileCode, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { createGeofence } from '../../services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  onClose: () => void;
}

export const GeofenceBulkImportModal: React.FC<Props> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonContent, setJsonContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ imported: number; total: number; errors: string[] } | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonContent(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonContent.trim()) {
      toast.error('Please upload or paste a JSON or GeoJSON boundary file');
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (err: any) {
      toast.error(`Invalid JSON syntax: ${err.message}`);
      return;
    }

    // Support GeoJSON FeatureCollection or standard JSON array
    let geofenceList: any[] = [];
    if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
      geofenceList = parsed.features.map((feat: any, idx: number) => {
        const props = feat.properties || {};
        let coords: [number, number][] = [];
        if (feat.geometry?.type === 'Polygon' && feat.geometry.coordinates?.[0]) {
          // GeoJSON is [lon, lat], backend needs [lat, lon]
          coords = feat.geometry.coordinates[0].map((pt: [number, number]) => [pt[1], pt[0]]);
        }
        return {
          name: props.name || `Boundary Zone #${idx + 1}`,
          description: props.description || 'Imported from GeoJSON',
          category: props.category || 'delivery_zone',
          coordinates: coords,
        };
      });
    } else if (Array.isArray(parsed)) {
      geofenceList = parsed;
    } else if (parsed.coordinates) {
      geofenceList = [parsed];
    } else {
      toast.error('Unrecognized format. Must be JSON array or GeoJSON FeatureCollection.');
      return;
    }

    if (geofenceList.length === 0) {
      toast.error('No valid geofences found in file');
      return;
    }

    setIsLoading(true);
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < geofenceList.length; i++) {
      const g = geofenceList[i];
      if (!g.name || !g.coordinates || !Array.isArray(g.coordinates) || g.coordinates.length < 4) {
        errors.push(`Zone #${i + 1} (${g.name || 'unnamed'}): Requires name and at least 4 coordinate pairs.`);
        continue;
      }

      // Ensure closed polygon
      const coords = [...g.coordinates];
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([first[0], first[1]]);
      }

      try {
        await createGeofence({
          name: g.name,
          description: g.description || '',
          category: g.category || 'delivery_zone',
          coordinates: coords,
        });
        imported++;
      } catch (err: any) {
        errors.push(`Zone "${g.name}": ${err.response?.data?.error || err.message}`);
      }
    }

    setIsLoading(false);
    setProgress({ imported, total: geofenceList.length, errors });

    if (imported > 0) {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      toast.success(`Successfully imported ${imported} real geofence zones!`);
    } else {
      toast.error('Failed to import geofences. Check the errors list.');
    }
  };

  const sampleTemplate = `[
  {
    "name": "Downtown Distribution Hub",
    "description": "Primary fulfillment facility",
    "category": "delivery_zone",
    "coordinates": [
      [37.7749, -122.4194],
      [37.7849, -122.4194],
      [37.7849, -122.4094],
      [37.7749, -122.4094],
      [37.7749, -122.4194]
    ]
  },
  {
    "name": "Port Security Zone",
    "description": "Restricted maritime perimeter",
    "category": "restricted_zone",
    "coordinates": [
      [37.7950, -122.4000],
      [37.8050, -122.4000],
      [37.8050, -122.3900],
      [37.7950, -122.3900],
      [37.7950, -122.4000]
    ]
  }
]`;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      style={{ zIndex: 99999, isolation: 'isolate' }}
    >
      <div className="bg-[#0E1726] border border-[#1E293B] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Real Geofences (JSON / GeoJSON)</h2>
              <p className="text-xs text-slate-400">Batch load operational perimeters and security boundaries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* File Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#1E293B] hover:border-purple-500/50 bg-[#16243C]/40 hover:bg-[#16243C]/70 rounded-xl p-5 text-center cursor-pointer transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.geojson"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileCode className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-200">
              {fileName ? `Loaded: ${fileName}` : 'Click to upload .json or .geojson boundary file'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Supports GeoJSON FeatureCollections and JSON arrays</p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Or paste JSON / GeoJSON boundary data:</span>
            <button
              type="button"
              onClick={() => setJsonContent(sampleTemplate)}
              className="text-purple-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
            >
              <Download className="w-3 h-3" /> Load Sample JSON
            </button>
          </div>

          <textarea
            rows={8}
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            placeholder={sampleTemplate}
            className="w-full bg-[#16243C] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500"
          />

          {/* Progress / Results */}
          {progress && (
            <div className="p-3.5 rounded-xl bg-[#16243C] border border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2 text-xs">
                {progress.imported === progress.total ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
                <span className="font-semibold text-slate-200">
                  Imported {progress.imported} of {progress.total} geofence boundaries
                </span>
              </div>

              {progress.errors.length > 0 && (
                <div className="text-[11px] text-red-400 max-h-24 overflow-y-auto space-y-1 bg-red-950/20 p-2 rounded-lg border border-red-900/30 font-mono">
                  {progress.errors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1E293B] bg-[#16243C]/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isLoading || !jsonContent.trim()}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Import Geofences</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

