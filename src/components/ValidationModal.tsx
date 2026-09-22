import React from 'react';
import { ValidationReport } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  MapPin,
  FileCheck,
  Hash,
} from 'lucide-react';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ValidationReport | null;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {report.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                SIH26011 Cadastral & Relational Integrity Audit
              </h3>
              <p className="text-[11px] text-slate-500">
                Automated rule checking across vertical height, floor overlap, coordinates, foreign keys, and 3D ULPIN.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Metric Strip */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Checks</span>
            <strong className="text-base text-slate-900">{report.totalChecks}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300">
            <span className="text-emerald-700 block text-[10px] uppercase font-semibold">Passed</span>
            <strong className="text-base text-emerald-800">{report.passedChecks}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300">
            <span className="text-rose-700 block text-[10px] uppercase font-semibold">Failed</span>
            <strong className="text-base text-rose-800">{report.failedChecks}</strong>
          </div>
        </div>

        {/* Details List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 text-xs">
          {report.details.map((item, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border flex items-start gap-3 ${
                item.status === 'PASS'
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : item.status === 'WARNING'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {item.status === 'PASS' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="font-semibold text-cyan-800 uppercase tracking-wider">
                    {item.category}
                  </span>
                  <span className="font-mono text-slate-500">{item.entityId}</span>
                </div>
                <p className="text-xs leading-relaxed">{item.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
