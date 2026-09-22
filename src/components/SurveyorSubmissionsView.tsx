import React, { useState, useEffect } from 'react';
import { Building, Floor, EnrichedProperty } from '../types';
import { cadastreService } from '../services/cadastreService';
import { cadastreFileStorage } from '../services/cadastreFileStorage';
import { useAuth } from '../services/authService';
import {
  Building2,
  PlusCircle,
  FileCheck2,
  Stamp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  UploadCloud,
  ChevronRight,
  Sparkles,
  Layers,
  Compass,
  MapPin,
  Calendar,
  Box,
  Download,
  FolderArchive,
  HardDrive,
  FileCode,
} from 'lucide-react';
import { Pagination } from './Pagination';

interface SurveyorSubmissionsViewProps {
  onOpenModelIngestion: () => void;
  onSelectBuildingForMap?: (building: Building) => void;
  refreshTrigger?: number;
}

export const SurveyorSubmissionsView: React.FC<SurveyorSubmissionsViewProps> = ({
  onOpenModelIngestion,
  onSelectBuildingForMap,
  refreshTrigger,
}) => {
  const { activePersona } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [storedCatalog, setStoredCatalog] = useState<Array<{
    surveyNumber: string;
    safeSurveyNumber: string;
    fileName: string;
    sizeBytes: number;
    storedAt: string;
  }>>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(4);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await cadastreService.getAllBuildings();
      setBuildings(all);
      const catalog = await cadastreFileStorage.listAllStored3DFiles();
      setStoredCatalog(catalog);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for real-time application creation event
    const handleAppCreated = () => {
      loadData();
    };

    window.addEventListener('cadastre-application-created', handleAppCreated);
    return () => {
      window.removeEventListener('cadastre-application-created', handleAppCreated);
    };
  }, [refreshTrigger]);

  const getStageNumber = (status?: string) => {
    switch (status) {
      case 'registered':
        return 3;
      case 'plan_verified':
        return 2;
      case 'draft':
      default:
        return 1;
    }
  };

  const totalItems = buildings.length;
  const paginatedBuildings = buildings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-sans">
      {/* Top Banner: Institutional Indian Municipal Web Portal Style */}
      <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-[#1e3a8a] border border-blue-200 text-xs font-mono font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#1e3a8a]" /> Surveyor Cadastral Submissions Hub
            </span>
            <span className="text-xs text-slate-600 font-mono">
              Surveyor: <strong className="text-slate-900">{activePersona.name}</strong>
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            3D Cadastral Lifecycle Pipeline & Submissions
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Statutory workflow progression from licensed field survey coordinate capture to municipal Town
            Planning 3D geometry audit, through to Sub-Registrar Officer (SRO) deed registration and
            3D ULPIN sealing. All 3D architectural & volumetric models (.glb) are stored and indexed by Cadastral Survey Number.
          </p>
        </div>

        {/* Apply for New Cadastral Application Action Button */}
        <button
          id="btn-surveyor-new-ingest"
          onClick={onOpenModelIngestion}
          className="px-4 py-2.5 rounded-lg bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start md:self-auto shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Apply for New Cadastral Application (Form 3)</span>
        </button>
      </div>

      {/* Lifecycle Progress Pipeline Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-amber-800">STAGE 1: DRAFT / FIELD</span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold">
              {buildings.filter((b) => (b.status || 'draft') === 'draft').length} Records
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-snug">
            Raw coordinates and 3D meshes submitted by licensed surveyors awaiting ULB review.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#1e3a8a]">STAGE 2: PLAN AUDITED</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1e3a8a] border border-blue-300 text-[10px] font-mono font-bold">
              {buildings.filter((b) => b.status === 'plan_verified').length} Records
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-snug">
            FSI, setback, and height envelopes audited and approved by Town Planning officers.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#059669]">STAGE 3: REGISTERED & SEALED</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#059669] border border-emerald-300 text-[10px] font-mono font-bold">
              {buildings.filter((b) => b.status === 'registered').length} Records
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-snug">
            Deed references appended, official 3D ULPIN issued, locked for public citizen lookup.
          </p>
        </div>
      </div>

      {/* Buildings Cards & Pipeline Status List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1e3a8a]" />
            Active Cadastral Submissions ({buildings.length})
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Form 3-Cadastre &bull; Real-time Relational Sync
          </span>
        </div>

        <div className="space-y-3">
          {paginatedBuildings.map((bld) => {
            const stage = getStageNumber(bld.status);
            return (
              <div
                key={bld.id}
                className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
              >
                {/* Top Row: Building Info & Current Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-slate-900">
                        Building {bld.building_id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        Survey No. {bld.survey_number}
                      </span>
                      {bld.application_number && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200">
                          App: {bld.application_number}
                        </span>
                      )}
                      {bld.ulpin && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#059669] border border-emerald-300">
                          3D ULPIN: {bld.ulpin}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{bld.address}</span>
                      <span className="font-mono text-slate-400">
                        ({(bld.latitude ?? 17.4485).toFixed(4)}°N, {(bld.longitude ?? 78.3748).toFixed(4)}°E)
                      </span>
                    </div>
                  </div>

                  {/* Stage Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                        stage === 3
                          ? 'bg-emerald-50 text-[#059669] border-emerald-300'
                          : stage === 2
                          ? 'bg-blue-50 text-[#1e3a8a] border-blue-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      {stage === 3
                        ? '3. SRO Deed Sealed'
                        : stage === 2
                        ? '2. Town Plan Approved'
                        : '1. Field Survey Draft'}
                    </span>

                    {onSelectBuildingForMap && (
                      <button
                        onClick={() => onSelectBuildingForMap(bld)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Compass className="w-3 h-3 text-[#1e3a8a]" />
                        <span>Map View</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Stored 3D Asset for this Survey Number */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Box className="w-4 h-4 text-[#1e3a8a]" />
                    <span className="font-semibold text-slate-800">
                      Archived 3D Asset:
                    </span>
                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-700">
                      surveys/{bld.survey_number}/{bld.stored_3d_file_name || `${bld.survey_number}_model.glb`}
                    </span>
                    {bld.stored_3d_file_size ? (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {((bld.stored_3d_file_size / 1024) || 0).toFixed(1)} KB
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cadastreFileStorage.triggerFileDownload(bld.survey_number, bld.stored_3d_file_name)}
                      className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      title={`Download 3D GLB model archived under Survey No. ${bld.survey_number}`}
                    >
                      <Download className="w-3.5 h-3.5 text-[#1e3a8a]" />
                      <span>Download 3D File (.glb)</span>
                    </button>
                  </div>
                </div>

                {/* Statutory Progress Stepper */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Statutory Approval Progression
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {/* Stage 1 */}
                    <div
                      className={`flex items-center gap-2 p-2 rounded border ${
                        stage >= 1
                          ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${stage >= 1 ? 'text-amber-700' : 'text-slate-400'}`} />
                      <span>1. Survey Ingest</span>
                    </div>

                    {/* Stage 2 */}
                    <div
                      className={`flex items-center gap-2 p-2 rounded border ${
                        stage >= 2
                          ? 'bg-blue-50 border-blue-300 text-[#1e3a8a] font-bold'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${stage >= 2 ? 'text-[#1e3a8a]' : 'text-slate-400'}`} />
                      <span>2. Town Plan Audit</span>
                    </div>

                    {/* Stage 3 */}
                    <div
                      className={`flex items-center gap-2 p-2 rounded border ${
                        stage >= 3
                          ? 'bg-emerald-50 border-emerald-300 text-[#059669] font-bold'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${stage >= 3 ? 'text-[#059669]' : 'text-slate-400'}`} />
                      <span>3. SRO Deed Sealed</span>
                    </div>
                  </div>
                </div>

                {/* Rejection Remarks Banner if Present */}
                {bld.rejection_remarks && (
                  <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 shadow-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-900">Town Planner Rejection Notice:</div>
                      <div className="mt-0.5 leading-relaxed text-rose-800">{bld.rejection_remarks}</div>
                      <div className="mt-2">
                        <button
                          onClick={onOpenModelIngestion}
                          className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 text-white font-mono text-[11px] font-semibold cursor-pointer"
                        >
                          Amend & Re-upload 3D Geometry
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                  <div>
                    Submitted by: <span className="text-slate-800 font-semibold">{bld.submitted_by_name || 'Er. Rajesh Varma (Licensed Surveyor)'}</span>
                  </div>
                  {bld.verified_by && (
                    <div>
                      Verified by: <span className="text-[#1e3a8a] font-semibold">{bld.verified_by}</span>
                    </div>
                  )}
                  {bld.deed_reference && (
                    <div>
                      Deed Ref: <span className="text-[#059669] font-semibold">{bld.deed_reference}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reusable Pagination */}
        <div className="rounded-lg bg-white border border-slate-200 shadow-xs overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[2, 4, 8]}
          />
        </div>

        {/* 3D Cadastre File Repository by Survey Number */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-[#1e3a8a]" />
              <h3 className="text-sm font-bold text-slate-900">
                3D File Storage Directory (Indexed by Cadastral Survey Number)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Storage Target: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-800">/data/3d_files/{'{survey_number}'}/</code>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {buildings.map((b) => (
              <div
                key={`repo-${b.id}`}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 space-y-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1e3a8a] border border-blue-200 text-[10px] font-mono font-bold">
                    Survey No: {b.survey_number}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {b.building_id}
                  </span>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 truncate">
                    {b.stored_3d_file_name || `${b.survey_number}_model.glb`}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    surveys/{b.survey_number}/{b.stored_3d_file_name || `${b.survey_number}_model.glb`}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {b.stored_3d_file_size ? `${(b.stored_3d_file_size / 1024).toFixed(1)} KB` : 'GLB Ready'}
                  </span>
                  <button
                    onClick={() => cadastreFileStorage.triggerFileDownload(b.survey_number, b.stored_3d_file_name)}
                    className="px-2 py-1 bg-white hover:bg-blue-50 text-[#1e3a8a] border border-slate-300 hover:border-blue-300 rounded text-[11px] font-mono font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Download className="w-3 h-3 text-[#1e3a8a]" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
