import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { registerVehicle } from '../../services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  onClose: () => void;
}

export const VehicleBulkImportModal: React.FC<Props> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvContent, setCsvContent] = useState<string>('');
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
      setCsvContent(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      toast.error('Please upload or paste a CSV file');
      return;
    }

    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      toast.error('CSV must contain a header row and at least one vehicle row');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const numIdx = headers.indexOf('vehicle_number');
    const driverIdx = headers.indexOf('driver_name');
    const typeIdx = headers.indexOf('vehicle_type');
    const phoneIdx = headers.indexOf('phone');

    if (numIdx === -1 || driverIdx === -1) {
      toast.error('CSV must include "vehicle_number" and "driver_name" columns');
      return;
    }

    setIsLoading(true);
    let imported = 0;
    const errors: string[] = [];
    const rows = lines.slice(1);

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].split(',').map(c => c.trim());
      if (cols.length <= numIdx || !cols[numIdx]) continue;

      const vNum = cols[numIdx].toUpperCase();
      const driver = cols[driverIdx] || 'Unassigned';
      const type = (typeIdx !== -1 && cols[typeIdx]) ? cols[typeIdx] : 'Truck';
      const phone = (phoneIdx !== -1 && cols[phoneIdx]) ? cols[phoneIdx] : '+1-000-0000';

      try {
        await registerVehicle({
          vehicle_number: vNum,
          driver_name: driver,
          vehicle_type: type,
          phone: phone,
        });
        imported++;
      } catch (err: any) {
        const msg = err.response?.data?.error || `Row ${i + 2}: Failed`;
        errors.push(`${vNum}: ${msg}`);
      }
    }

    setProgress({ imported, total: rows.length, errors });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    setIsLoading(false);

    if (imported > 0) {
      toast.success(`Successfully registered ${imported} real client vehicles`);
    }
  };

  const downloadSampleTemplate = () => {
    const template = `vehicle_number,driver_name,vehicle_type,phone\nKA-05-MJ-9901,Rajesh Kumar,Truck,+91-9876543210\nMH-02-XY-4321,Priya Sharma,Van,+91-9876543211\nDL-01-AB-1234,Amit Verma,Truck,+91-9876543212`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicles_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      style={{ isolation: 'isolate' }}
    >
      <div className="relative z-[100000] w-full max-w-lg rounded-2xl bg-[#0E1726] border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#1E293B] bg-[#111C2E]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Bulk Import Real Client Vehicles</h3>
              <p className="text-xs text-slate-400">Upload fleet CSV spreadsheet to register units in batch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#16243C] border border-transparent hover:border-[#1E293B] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-2xl border-2 border-dashed border-[#1E293B] hover:border-blue-500/60 bg-[#16243C]/40 hover:bg-[#16243C]/80 cursor-pointer text-center transition-all flex flex-col items-center justify-center space-y-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileText className="w-8 h-8 text-blue-400 opacity-80" />
            <div className="text-xs font-semibold text-slate-200">
              {fileName ? fileName : 'Click to select client vehicles CSV'}
            </div>
            <p className="text-[11px] text-slate-400">
              Supports columns: <code>vehicle_number, driver_name, vehicle_type, phone</code>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download sample CSV template</span>
            </button>
          </div>

          {/* Direct CSV Paste */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Or Paste CSV Data Directly:
            </label>
            <textarea
              rows={4}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="vehicle_number,driver_name,vehicle_type,phone&#10;KA-01-AB-1234,John Doe,Truck,+91-9876543210"
              className="w-full p-3 rounded-xl bg-[#16243C] border border-[#1E293B] text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Progress / Results */}
          {progress && (
            <div className="p-4 rounded-xl bg-[#16243C] border border-[#1E293B] text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Import Result: {progress.imported} of {progress.total} registered</span>
              </div>
              {progress.errors.length > 0 && (
                <div className="text-red-400 space-y-1 pt-1 border-t border-[#1E293B] text-[11px]">
                  {progress.errors.slice(0, 3).map((err, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                  {progress.errors.length > 3 && (
                    <div className="text-slate-400">...and {progress.errors.length - 3} more</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-300 hover:text-white hover:bg-[#16243C] transition-all"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isLoading || !csvContent.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Importing Fleet...' : 'Import Vehicles'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

