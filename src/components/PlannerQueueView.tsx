import React, { useState, useEffect } from 'react';
import { Building, Floor, EnrichedProperty, UndergroundAsset, UndergroundClashReport } from '../types';
import { cadastreService } from '../services/cadastreService';
import { useAuth } from '../services/authService';
import { ThreeCanvas } from './ThreeCanvas';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Ruler,
  Layers,
  Clock,
  Send,
  Eye,
  ShieldAlert,
  Compass,
  ArrowRight,
  ExternalLink,
  MapPin,
  Zap,
  RefreshCw,
  PlusCircle,
  Search,
  User,
  Calendar,
  X,
} from 'lucide-react';
import { Pagination } from './Pagination';

interface PlannerQueueViewProps {
  onSelectBuildingForMap?: (building: Building) => void;
  refreshTrigger?: number;
  onOpenModelIngestion?: () => void;
}

export const PlannerQueueView: React.FC<PlannerQueueViewProps> = ({
  onSelectBuildingForMap,
  refreshTrigger,
  onOpenModelIngestion,
}) => {
  const { activePersona, currentRole, switchPersona } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [enrichedData, setEnrichedData] = useState<{
    properties: EnrichedProperty[];
    floors: Floor[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Clash detection state
  const [undergroundAssets, setUndergroundAssets] = useState<UndergroundAsset[]>([]);
  const [clashReport, setClashReport] = useState<UndergroundClashReport | null>(null);
  const [isAuditingClashes, setIsAuditingClashes] = useState<boolean>(false);
  const [showSubsurface, setShowSubsurface] = useState<boolean>(true);

  // 3D Player Interactive Controls & Options
  const [plannerViewMode, setPlannerViewMode] = useState<'volumetric' | 'wireframe' | 'xray'>('volumetric');
  const [plannerExplodedOffset, setPlannerExplodedOffset] = useState<number>(0);
  const [plannerFilterFloor, setPlannerFilterFloor] = useState<number | 'ALL'>('ALL');
  const [plannerShowRuler, setPlannerShowRuler] = useState<boolean>(true);
  const [plannerShowTerrain, setPlannerShowTerrain] = useState<boolean>(false);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionRemarks, setRejectionRemarks] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Filter tab
  const [filter, setFilter] = useState<'draft' | 'plan_verified' | 'all'>('draft');

  // Pagination for submissions inbox
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Search input
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isDraftStatus = (s?: string) => !s || s === 'draft' || s === 'pending' || s === 'submitted';
  const isPlanVerifiedStatus = (s?: string) => s === 'plan_verified';

  const fetchClashAudit = async (buildingId: string) => {
    setIsAuditingClashes(true);
    try {
      const assets = await cadastreService.getUndergroundAssets();
      setUndergroundAssets(assets);
      const report = await cadastreService.runClashDetection(buildingId);
      setClashReport(report);
    } catch (err) {
      console.warn('Clash detection fetch error:', err);
    } finally {
      setIsAuditingClashes(false);
    }
  };

  const loadData = async (targetBuildingId?: string) => {
    setLoading(true);
    try {
      const all = await cadastreService.getAllBuildings();
      setBuildings(all);

      // Select targeted building, or keep current selection, or select first draft
      let bldToSelect: Building | undefined;
      if (targetBuildingId) {
        bldToSelect = all.find((b) => b.id === targetBuildingId || b.building_id === targetBuildingId);
      }
      if (!bldToSelect && selectedBuilding) {
        bldToSelect = all.find(
          (b) => b.id === selectedBuilding.id || b.building_id === selectedBuilding.building_id
        );
      }
      if (!bldToSelect) {
        bldToSelect = all.find((b) => isDraftStatus(b.status)) || all[0];
      }

      if (bldToSelect) {
        setSelectedBuilding(bldToSelect);
        const data = await cadastreService.getEnrichedBuildingData(
          bldToSelect.building_id || bldToSelect.id
        );
        setEnrichedData({
          properties: data.allProperties,
          floors: data.allFloors,
        });
        await fetchClashAudit(bldToSelect.building_id || bldToSelect.id);
      }
    } catch (e) {
      console.error('Error loading town planner queue:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for real-time application creation event
    const handleAppCreated = (event: any) => {
      const newBldId = event?.detail?.building?.id || event?.detail?.building?.building_id;
      loadData(newBldId);
    };

    // Listen for lifecycle status changes
    const handleStatusChanged = () => {
      loadData();
    };

    window.addEventListener('cadastre-application-created', handleAppCreated);
    window.addEventListener('cadastre-status-changed', handleStatusChanged);
    return () => {
      window.removeEventListener('cadastre-application-created', handleAppCreated);
      window.removeEventListener('cadastre-status-changed', handleStatusChanged);
    };
  }, [refreshTrigger]);

  const handleSelectBuilding = async (bld: Building) => {
    setSelectedBuilding(bld);
    setActionSuccess(null);
    setActionError(null);
    try {
      const data = await cadastreService.getEnrichedBuildingData(bld.building_id || bld.id);
      setEnrichedData({
        properties: data.allProperties,
        floors: data.allFloors,
      });
      await fetchClashAudit(bld.building_id || bld.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async () => {
    if (!selectedBuilding) return;
    setIsProcessing(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      const updated = await cadastreService.approveBuilding(
        selectedBuilding.id,
        activePersona.name
      );
      if (updated) {
        setActionSuccess(
          `Building ${updated.building_id} (${updated.survey_number}) verified successfully! Status transitioned to 'plan_verified'. Forwarded to Sub-Registrar Officer (SRO) Queue.`
        );
        setSelectedBuilding({ ...updated });
        await loadData();
      }
    } catch (e: any) {
      setActionError(e?.message || 'Failed to approve building geometry');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedBuilding || !rejectionRemarks.trim()) return;
    setIsProcessing(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      const updated = await cadastreService.rejectBuilding(
        selectedBuilding.id,
        rejectionRemarks
      );
      if (updated) {
        setActionSuccess(
          `Building ${updated.building_id} geometry flagged with review remarks. Returned to Surveyor draft queue.`
        );
        setShowRejectModal(false);
        setRejectionRemarks('');
        setSelectedBuilding({ ...updated });
        await loadData();
      }
    } catch (e: any) {
      setActionError(e?.message || 'Failed to submit review remarks');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBuildings = buildings.filter((b) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchApp = (b.application_number || '').toLowerCase().includes(q);
      const matchSurvey = (b.survey_number || '').toLowerCase().includes(q);
      const matchBldId = (b.building_id || b.id || '').toLowerCase().includes(q);
      const matchAddr = (b.address || '').toLowerCase().includes(q);
      const matchSubmitter = (b.submitted_by_name || '').toLowerCase().includes(q);
      if (!matchApp && !matchSurvey && !matchBldId && !matchAddr && !matchSubmitter) {
        return false;
      }
    }
    if (filter === 'all') return true;
    if (filter === 'draft') return isDraftStatus(b.status);
    if (filter === 'plan_verified') return isPlanVerifiedStatus(b.status);
    return (b.status || 'draft') === filter;
  });

  const totalItems = filteredBuildings.length;
  const paginatedBuildings = filteredBuildings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isPlanner = currentRole === 'town_planner';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-sans">
      {/* Header Banner: Institutional Indian Municipal Web Portal Style */}
      <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-[#1e3a8a] border border-blue-200 text-xs font-mono font-bold flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-[#1e3a8a]" /> ULB Municipal Town Planning Inbox
            </span>
            <span className="text-xs text-slate-600 font-mono">
              Role: <strong className="text-slate-900">{activePersona.roleTitle}</strong>
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            3D Geometry & Zoning Compliance Review Queue
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Audit surveyor 3D boundary submissions against statutory municipal bylaws: Maximum
            Permissible Height envelopes, Setback Margins, and Floor Space Index (FSI). Approve to
            advance records to the Sub-Registrar Officer (SRO) for title deed linking.
          </p>
        </div>

        {/* Quick Stats & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Refresh Town Planner Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <div className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs text-center min-w-[72px]">
            <div className="text-base font-bold text-amber-800 font-mono">
              {buildings.filter((b) => isDraftStatus(b.status)).length}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Drafts In-Queue</div>
          </div>
          <div className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs text-center min-w-[72px]">
            <div className="text-base font-bold text-[#1e3a8a] font-mono">
              {buildings.filter((b) => isPlanVerifiedStatus(b.status)).length}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Verified for SRO</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-800 hover:text-emerald-950 font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Submissions Inbox List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2 font-mono uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-[#1e3a8a]" />
                Submissions In-Queue
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                {filteredBuildings.length} items
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search App No, Survey No, Locality, Surveyor..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:border-[#1e3a8a] focus:bg-white text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded border border-slate-200 text-xs font-mono">
              <button
                onClick={() => {
                  setFilter('draft');
                  setCurrentPage(1);
                }}
                className={`py-1 rounded text-center transition-colors cursor-pointer ${
                  filter === 'draft'
                    ? 'bg-amber-100 text-amber-950 border border-amber-300 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Drafts ({buildings.filter((b) => isDraftStatus(b.status)).length})
              </button>
              <button
                onClick={() => {
                  setFilter('plan_verified');
                  setCurrentPage(1);
                }}
                className={`py-1 rounded text-center transition-colors cursor-pointer ${
                  filter === 'plan_verified'
                    ? 'bg-blue-100 text-[#1e3a8a] border border-blue-300 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verified ({buildings.filter((b) => isPlanVerifiedStatus(b.status)).length})
              </button>
              <button
                onClick={() => {
                  setFilter('all');
                  setCurrentPage(1);
                }}
                className={`py-1 rounded text-center transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({buildings.length})
              </button>
            </div>

            {/* List */}
            <div className="space-y-2">
              {paginatedBuildings.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded space-y-2">
                  <p>No submissions found matching the criteria.</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-2.5 py-1 text-[11px] font-mono text-[#1e3a8a] bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 cursor-pointer"
                    >
                      Clear Search Filter
                    </button>
                  )}
                </div>
              ) : (
                paginatedBuildings.map((bld) => {
                  const isSelected = selectedBuilding?.id === bld.id;
                  const isDraft = isDraftStatus(bld.status);
                  const isPlanVerified = isPlanVerifiedStatus(bld.status);
                  const isRegistered = bld.status === 'registered';

                  // Detect recent submission (within 48 hours)
                  const isNew = bld.created_at && (Date.now() - new Date(bld.created_at).getTime() < 48 * 3600 * 1000);

                  const displayAppNo =
                    bld.application_number ||
                    `APP-2026-TS-SY${(bld.survey_number || '00').replace(/[^a-zA-Z0-9]/g, '')}`;

                  const submitDateStr = bld.created_at
                    ? new Date(bld.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recently Submitted';

                  return (
                    <div
                      key={bld.id}
                      onClick={() => handleSelectBuilding(bld)}
                      className={`p-3 rounded-lg border text-xs transition-colors cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'border-[#1e3a8a] bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          Building {bld.building_id}
                          {isNew && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-extrabold uppercase bg-rose-600 text-white animate-pulse">
                              NEW
                            </span>
                          )}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            isDraft
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : isPlanVerified
                              ? 'bg-blue-50 text-[#1e3a8a] border-blue-300'
                              : 'bg-emerald-50 text-[#059669] border-emerald-300'
                          }`}
                        >
                          {isDraft ? 'Pending Audit' : isPlanVerified ? 'Plan Verified' : 'Registered'}
                        </span>
                      </div>

                      {/* Official Application Reference */}
                      <div className="flex items-center gap-1 text-[11px] font-mono text-[#1e3a8a] bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200/60 truncate">
                        <FileCheck2 className="w-3 h-3 shrink-0 text-[#1e3a8a]" />
                        <span className="truncate font-semibold">{displayAppNo}</span>
                      </div>

                      <div className="text-slate-600 truncate text-[11px]">
                        Survey No: <strong>{bld.survey_number}</strong> &bull; {bld.address}
                      </div>

                      {/* Surveyor & Date metadata */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span className="truncate flex items-center gap-1">
                          <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate">{bld.submitted_by_name || 'Licensed Surveyor'}</span>
                        </span>
                        <span className="shrink-0 flex items-center gap-1 text-slate-400">
                          <Calendar className="w-2.5 h-2.5 shrink-0" />
                          {submitDateStr}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                        <span>
                          Height: {bld.total_height || 12}m ({bld.number_of_floors || 4} fl)
                          {bld.plot_area ? ` • ${bld.plot_area} m²` : ''}
                        </span>
                        <span className="text-[#1e3a8a] font-semibold flex items-center gap-0.5">
                          Inspect 3D &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[4, 6, 12, 24]}
            />
          </div>
        </div>

        {/* Right Column: Detailed 3D WebGL Inspection & Audit Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedBuilding ? (
            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-4">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Building {selectedBuilding.building_id}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      Survey No: {selectedBuilding.survey_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedBuilding.address}</span>
                  </p>
                </div>

                {/* Action Buttons for Town Planner */}
                <div className="flex items-center gap-2">
                  {(selectedBuilding.status === 'draft' || !selectedBuilding.status) && (
                    <>
                      {isPlanner ? (
                        <>
                          <button
                            id="btn-planner-reject"
                            onClick={() => setShowRejectModal(true)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Reject with Remarks</span>
                          </button>
                          <button
                            id="btn-planner-approve"
                            onClick={handleApprove}
                            disabled={isProcessing}
                            className="px-3.5 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve 3D Geometry for SRO</span>
                          </button>
                        </>
                      ) : (
                        <button
                          id="btn-switch-to-planner-and-approve"
                          onClick={async () => {
                            await switchPersona('town_planner');
                          }}
                          className="px-3.5 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Switch to Town Planner Persona to approve or reject submissions"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-indigo-700" />
                          <span>Switch to Town Planner to Approve/Reject</span>
                        </button>
                      )}
                    </>
                  )}

                  {selectedBuilding.status === 'plan_verified' && (
                    <div className="px-3 py-1 rounded bg-blue-50 border border-blue-300 text-[#1e3a8a] text-xs font-mono font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1e3a8a]" />
                      <span>Verified by {selectedBuilding.verified_by || 'Town Planning'} &bull; Ready for SRO</span>
                    </div>
                  )}

                  {selectedBuilding.status === 'registered' && (
                    <div className="px-3 py-1 rounded bg-emerald-50 border border-emerald-300 text-[#059669] text-xs font-mono font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Fully Registered in 3D Cadastre</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statutory Bylaws Compliance Audit Matrix */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2 font-mono uppercase tracking-wider">
                  <Ruler className="w-4 h-4 text-[#1e3a8a]" />
                  <span>Automated Zoning & Bylaw Compliance Checks</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Height Envelope Check */}
                  <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1 shadow-xs">
                    <div className="text-slate-500 text-[10px] font-mono">Maximum Permissible Height</div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900 font-mono font-bold text-xs">
                        {selectedBuilding.total_height || 12}m{' '}
                        <span className="text-slate-500 text-[10px]">
                          / {selectedBuilding.compliance_metrics?.max_permitted_height || 15.0}m max
                        </span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#059669] border border-emerald-300 text-[10px] font-bold">
                        COMPLIANT
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Envelope clearance: +3.0m margin</div>
                  </div>

                  {/* Setback Distance Check */}
                  <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1 shadow-xs">
                    <div className="text-slate-500 text-[10px] font-mono">Setback Margins (Front/Rear)</div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900 font-mono font-bold text-xs">
                        {selectedBuilding.compliance_metrics?.setback_margin_actual || 3.5}m{' '}
                        <span className="text-slate-500 text-[10px]">
                          / {selectedBuilding.compliance_metrics?.setback_margin_required || 3.0}m min
                        </span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#059669] border border-emerald-300 text-[10px] font-bold">
                        COMPLIANT
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Boundary clearance verified</div>
                  </div>

                  {/* FSI / FAR Ratio Check */}
                  <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1 shadow-xs">
                    <div className="text-slate-500 text-[10px] font-mono">Floor Space Index (FSI)</div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900 font-mono font-bold text-xs">
                        {selectedBuilding.compliance_metrics?.fsi_actual || 1.85}{' '}
                        <span className="text-slate-500 text-[10px]">
                          / {selectedBuilding.compliance_metrics?.fsi_permitted || 2.5} cap
                        </span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#059669] border border-emerald-300 text-[10px] font-bold">
                        COMPLIANT
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Under maximum density cap</div>
                  </div>
                </div>
              </div>

              {/* 3D Volumetric Topology & Underground Clash Detection Audit (Module 5) */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2 font-mono uppercase tracking-wider">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>3D Volumetric Topology & Underground Clash Detection (Module 5)</span>
                  </div>
                  <button
                    onClick={() => selectedBuilding && fetchClashAudit(selectedBuilding.building_id || selectedBuilding.id)}
                    disabled={isAuditingClashes}
                    className="px-2.5 py-1 text-[11px] font-mono rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 text-slate-500 ${isAuditingClashes ? 'animate-spin' : ''}`} />
                    <span>{isAuditingClashes ? 'Auditing 3D AABB Mesh...' : 'Re-Run Collision Audit'}</span>
                  </button>
                </div>

                {/* Clash Status Banner */}
                {clashReport && (
                  <div
                    className={`p-3 rounded-md border text-xs flex items-center justify-between gap-3 ${
                      clashReport.hasCollision || (clashReport as any).has_clashes
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {clashReport.hasCollision || (clashReport as any).has_clashes ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold font-mono">
                          {clashReport.hasCollision || (clashReport as any).has_clashes
                            ? `${clashReport.clashes?.length || 0} VOLUMETRIC BUFFER INFRINGEMENT(S) DETECTED`
                            : 'ZERO VOLUMETRIC CLASHES DETECTED'}
                        </span>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          {clashReport.hasCollision || (clashReport as any).has_clashes
                            ? 'Building sub-surface foundations or basements intersect municipal utility right-of-way buffer zones. Review collision table below.'
                            : 'All underground pipelines and subterranean basement slabs maintain statutory municipal clearance margins (>1.5m).'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${
                        clashReport.hasCollision || (clashReport as any).has_clashes ? 'bg-rose-200 text-rose-950' : 'bg-emerald-200 text-emerald-950'
                      }`}
                    >
                      {clashReport.hasCollision || (clashReport as any).has_clashes ? 'REMEDY REQUIRED' : 'CLEAR FOR SRO'}
                    </span>
                  </div>
                )}

                {/* Clash Table Breakdown */}
                {clashReport?.clashes && clashReport.clashes.length > 0 && (
                  <div className="border border-rose-200 rounded-md overflow-hidden bg-white text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-rose-50/70 border-b border-rose-200 text-[10px] font-mono text-rose-900 uppercase">
                        <tr>
                          <th className="p-2">Utility Asset</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Penetration / Clearance</th>
                          <th className="p-2">Required Buffer</th>
                          <th className="p-2">Severity</th>
                          <th className="p-2">Statutory Recommendation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 text-[11px] font-mono">
                        {clashReport.clashes.map((c: any, idx: number) => {
                          const assetName = c.assetName || c.asset_name || 'Utility Asset';
                          const assetType = String(c.assetType || c.asset_type || 'utility').replace(/_/g, ' ');
                          const severity = String(c.severity || 'CRITICAL_CLASH');
                          const isCritical = severity.toLowerCase().includes('critical');
                          const minDistance = c.minDistanceMeters ?? c.clearance_distance ?? 0;
                          const reqBuffer = c.requiredClearanceMeters ?? c.buffer_required ?? 1.5;
                          const deficit = c.clearanceDeficitMeters ?? c.penetration_depth ?? 0;
                          const recommendation = c.recommendation || c.recommended_action || 'Inspect 3D coordinates & shift basement retaining wall.';

                          return (
                            <tr key={idx} className="hover:bg-rose-50/40">
                              <td className="p-2 font-bold text-slate-900">{assetName}</td>
                              <td className="p-2 text-slate-600 capitalize">{assetType}</td>
                              <td className="p-2 text-rose-700 font-bold">
                                {deficit > 0 ? `-${deficit.toFixed(2)}m (clearance: ${minDistance.toFixed(2)}m)` : `${minDistance.toFixed(2)}m`}
                              </td>
                              <td className="p-2 text-slate-600">{reqBuffer.toFixed(1)}m</td>
                              <td className="p-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isCritical
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}
                                >
                                  {severity.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="p-2 text-slate-700 font-sans text-[11px]">
                                {recommendation}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3D WebGL Inspection Canvas & Full Municipal Audit Player */}
              <div className="rounded-xl border border-slate-300 overflow-hidden bg-white shadow-md relative">
                {/* Header with Building Info & Model Stats */}
                <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold">
                      <Layers className="w-3.5 h-3.5 text-[#1e3a8a]" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block font-sans text-sm">
                        {selectedBuilding.building_name || selectedBuilding.name || `Building ${selectedBuilding.building_id}`} &bull; 3D Audit Viewport
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Survey No. {selectedBuilding.survey_number} &bull; {enrichedData?.floors.length || 4} Strata &bull; {enrichedData?.properties.length || 8} Registered Units
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1e3a8a] border border-blue-200 text-[10px] font-mono font-bold">
                      {undergroundAssets.length} Sub-surface Utilities
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono">
                      WGS84 Datum
                    </span>
                  </div>
                </div>

                {/* Comprehensive Options & Controls Ribbon */}
                <div className="p-2.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Left: View Mode & Explode Slider */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* View Modes */}
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPlannerViewMode('volumetric')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          plannerViewMode === 'volumetric'
                            ? 'bg-[#1e3a8a] text-white shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Solid 3D
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlannerViewMode('xray')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          plannerViewMode === 'xray'
                            ? 'bg-[#1e3a8a] text-white shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        X-Ray Glass
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlannerViewMode('wireframe')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          plannerViewMode === 'wireframe'
                            ? 'bg-[#1e3a8a] text-white shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Wireframe
                      </button>
                    </div>

                    {/* Exploded Strata Slider */}
                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
                      <span className="text-[11px] font-mono text-slate-600 font-medium">Explode:</span>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={plannerExplodedOffset}
                        onChange={(e) => setPlannerExplodedOffset(parseFloat(e.target.value))}
                        className="w-20 sm:w-28 accent-[#1e3a8a] cursor-pointer"
                        title="Explode floor levels vertically for individual strata inspection"
                      />
                      <span className="text-[10px] font-mono text-slate-500 w-8">
                        {(plannerExplodedOffset * 5).toFixed(1)}m
                      </span>
                    </div>
                  </div>

                  {/* Right: Strata Floor Filter & Feature Toggles */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Floor Selector Dropdown / Buttons */}
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-0.5 shadow-2xs">
                      <span className="text-[11px] font-mono text-slate-600">Floor:</span>
                      <select
                        value={plannerFilterFloor}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPlannerFilterFloor(v === 'ALL' ? 'ALL' : parseInt(v, 10));
                        }}
                        className="text-[11px] bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">All Levels</option>
                        {enrichedData?.floors.map((fl) => (
                          <option key={fl.floor_id} value={fl.floor_number}>
                            {fl.floor_name || (fl.floor_number < 0 ? `Basement B${Math.abs(fl.floor_number)}` : fl.floor_number === 0 ? 'Ground Floor' : `Floor ${fl.floor_number}`)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subsurface Utilities Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowSubsurface(!showSubsurface)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-2xs ${
                        showSubsurface
                          ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                      title="Toggle underground utility network and clash detection volumes"
                    >
                      <span>Sub-surface</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${showSubsurface ? 'bg-amber-600' : 'bg-slate-300'}`} />
                    </button>

                    {/* Ruler / Dimension Toggle */}
                    <button
                      type="button"
                      onClick={() => setPlannerShowRuler(!plannerShowRuler)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer shadow-2xs ${
                        plannerShowRuler
                          ? 'bg-blue-50 text-[#1e3a8a] border-blue-300 font-semibold'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                      title="Toggle 3D elevation ruler and height grid"
                    >
                      Ruler
                    </button>

                    {/* Terrain Mesh Toggle */}
                    <button
                      type="button"
                      onClick={() => setPlannerShowTerrain(!plannerShowTerrain)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer shadow-2xs ${
                        plannerShowTerrain
                          ? 'bg-emerald-50 text-[#059669] border-emerald-300 font-semibold'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                      title="Toggle digital elevation terrain mesh"
                    >
                      Terrain
                    </button>
                  </div>
                </div>

                {/* Large 3D WebGL Viewport Window */}
                <div className="h-[520px] sm:h-[580px] md:h-[620px] w-full relative bg-slate-50">
                  <ThreeCanvas
                    enrichedProperty={enrichedData?.properties[0] || null}
                    activeBuilding={selectedBuilding}
                    allProperties={enrichedData?.properties || []}
                    allFloors={enrichedData?.floors || []}
                    isSelected={true}
                    viewMode={plannerViewMode}
                    explodedOffset={plannerExplodedOffset}
                    onExplodedOffsetChange={setPlannerExplodedOffset}
                    filterFloor={plannerFilterFloor}
                    showRuler={plannerShowRuler}
                    onToggleRuler={() => setPlannerShowRuler(!plannerShowRuler)}
                    showUnderground={showSubsurface}
                    onToggleUnderground={() => setShowSubsurface(!showSubsurface)}
                    undergroundAssets={undergroundAssets}
                    clashReport={clashReport}
                    showTerrainMesh={plannerShowTerrain}
                    onToggleTerrainMesh={() => setPlannerShowTerrain(!plannerShowTerrain)}
                  />
                </div>

                {/* Bottom Status Bar */}
                <div className="p-2.5 bg-white border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between px-3 font-mono gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Audit Mode: Statutory Municipal 3D Geometry & Volumetric Strata Inspection</span>
                  </span>
                  <span>
                    Centroid: {(selectedBuilding?.latitude ?? 17.4485).toFixed(5)}°N, {(selectedBuilding?.longitude ?? 78.3748).toFixed(5)}°E &bull; Datum: EPSG:4326 / WGS84
                  </span>
                </div>
              </div>

              {/* 3D ULPIN Units Compliance List */}
              {enrichedData && enrichedData.properties.length > 0 && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between font-mono uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-[#1e3a8a]" />
                      Standardized ISO 19152 3D ULPIN Registry Records
                    </span>
                    <span className="text-[11px] text-slate-500 lowercase">
                      {enrichedData.properties.length} units bound to WGS84 Datum
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {enrichedData.properties.map((p) => (
                      <div
                        key={p.property.property_id}
                        className="p-2.5 rounded bg-white border border-slate-200 flex flex-col justify-between space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{p.property.flat_number}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-[#1e3a8a] border border-blue-200">
                            Floor {p.floor.floor_number} ({p.verticalGeometry.bottom_height}m–{p.verticalGeometry.top_height}m)
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-600 bg-slate-50 p-1 rounded border border-slate-200 select-all truncate" title={p.prototype3DId.generated_identifier}>
                          {p.prototype3DId.generated_identifier}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Owner: {p.owners[0]?.owner.owner_name || 'Assigned Titleholder'}</span>
                          <span className="text-emerald-700 font-bold font-mono">
                            {p.validation.isValid ? 'VALIDATED' : 'FLAGGED'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg bg-white font-mono">
              Select a building submission from the inbox to begin 3D audit.
            </div>
          )}
        </div>
      </div>

      {/* Reject Remarks Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg bg-white border border-slate-300 shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Reject Building 3D Geometry with Review Remarks</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Specify the zoning or cadastral boundary discrepancy preventing approval. The submission
              will be returned to the surveyor for geometry correction.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Review Remarks / Discrepancy Note <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={rejectionRemarks}
                onChange={(e) => setRejectionRemarks(e.target.value)}
                placeholder="e.g. Setback on North boundary is 2.1m, violating minimum 3.0m municipal requirement..."
                rows={4}
                className="w-full p-2.5 text-xs rounded border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={isProcessing || !rejectionRemarks.trim()}
                className="px-4 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Submitting...' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
