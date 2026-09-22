import React, { useState, useEffect } from 'react';
import { Building, Floor, EnrichedProperty } from '../types';
import { cadastreService } from '../services/cadastreService';
import { useAuth } from '../services/authService';
import {
  Stamp,
  CheckCircle2,
  AlertCircle,
  FileText,
  KeyRound,
  ShieldCheck,
  Building2,
  Layers,
  Lock,
  ExternalLink,
  Search,
  Sparkles,
  Hash,
  MapPin,
  Pencil,
} from 'lucide-react';
import { Pagination } from './Pagination';
import { EditFlatModal } from './EditFlatModal';

interface SROQueueViewProps {
  onSelectBuildingForMap?: (building: Building) => void;
  refreshTrigger?: number;
}

export const SROQueueView: React.FC<SROQueueViewProps> = ({
  onSelectBuildingForMap,
  refreshTrigger,
}) => {
  const { activePersona, currentRole } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [enrichedData, setEnrichedData] = useState<{
    properties: EnrichedProperty[];
    floors: Floor[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form input
  const [deedReference, setDeedReference] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit flat modal state
  const [editingProperty, setEditingProperty] = useState<EnrichedProperty | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Pagination for units table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await cadastreService.getAllBuildings();
      setBuildings(all);

      // Prefer first 'plan_verified' building
      const defaultBld = all.find((b) => b.status === 'plan_verified') || all[0];
      if (defaultBld) {
        setSelectedBuilding(defaultBld);
        setDeedReference(
          defaultBld.deed_reference ||
            `DOC-2026-TEL-${defaultBld.building_id}-${Math.floor(1000 + Math.random() * 9000)}`
        );
        const data = await cadastreService.getEnrichedBuildingData(defaultBld.building_id || defaultBld.id);
        setEnrichedData({
          properties: data.allProperties,
          floors: data.allFloors,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('cadastre-application-created', handleUpdate);
    window.addEventListener('cadastre-status-changed', handleUpdate);
    return () => {
      window.removeEventListener('cadastre-application-created', handleUpdate);
      window.removeEventListener('cadastre-status-changed', handleUpdate);
    };
  }, [refreshTrigger]);

  const handleSelectBuilding = async (bld: Building) => {
    setSelectedBuilding(bld);
    setDeedReference(
      bld.deed_reference ||
        `DOC-2026-TEL-${bld.building_id}-${Math.floor(1000 + Math.random() * 9000)}`
    );
    setSuccessMessage(null);
    setErrorMessage(null);
    setCurrentPage(1);
    try {
      const data = await cadastreService.getEnrichedBuildingData(bld.building_id || bld.id);
      setEnrichedData({
        properties: data.allProperties,
        floors: data.allFloors,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegisterCadastre = async () => {
    if (!selectedBuilding || !deedReference.trim()) {
      setErrorMessage('Please provide a valid Registration Deed Document Reference number.');
      return;
    }

    setIsRegistering(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await cadastreService.registerCadastre(
        selectedBuilding.id,
        deedReference.trim()
      );

      if (res) {
        setSuccessMessage(
          `Official 3D Cadastre locked! Building ${res.building.building_id} (${res.building.survey_number}) is registered under Deed "${deedReference}". All ${res.totalUnitsUpdated} vertical strata units assigned immutable 3D ULPINs.`
        );
        await loadData();
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOpenEditModal = (property: EnrichedProperty) => {
    setEditingProperty(property);
    setIsEditModalOpen(true);
  };

  const handleFlatSaved = async (unitName: string) => {
    setSuccessMessage(`Details for ${unitName} updated successfully in the 3D Cadastre registry!`);
    if (selectedBuilding) {
      const data = await cadastreService.getEnrichedBuildingData(
        selectedBuilding.building_id || selectedBuilding.id
      );
      setEnrichedData({
        properties: data.allProperties,
        floors: data.allFloors,
      });
    }
  };

  const isSRO = currentRole === 'sro_officer';
  const planVerifiedBuildings = buildings.filter((b) => b.status === 'plan_verified');
  const registeredBuildings = buildings.filter((b) => b.status === 'registered');

  const allUnits = enrichedData?.properties || [];
  const totalUnits = allUnits.length;
  const paginatedUnits = allUnits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-sans">
      {/* Top Banner: Institutional Indian Municipal Web Portal Style */}
      <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-[#1e3a8a] border border-blue-200 text-xs font-mono font-bold flex items-center gap-1.5">
              <Stamp className="w-3.5 h-3.5 text-[#1e3a8a]" /> Sub-Registrar Office (SRO / IGRS) Registration Portal
            </span>
            <span className="text-xs text-slate-600 font-mono">
              Authorized Registrar: <strong className="text-slate-900">{activePersona.name}</strong>
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Title Deed Linking & Official 3D ULPIN Registration
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Statutory stage 3 execution: Lock municipal-approved 3D geometry with registered sale deeds,
            generate immutable 3D ULPINs for vertical strata units, and publish certified title records.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 shadow-xs text-center">
            <div className="text-base font-bold text-[#1e3a8a] font-mono">
              {planVerifiedBuildings.length}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Ready to Register</div>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 shadow-xs text-center">
            <div className="text-base font-bold text-[#059669] font-mono">
              {registeredBuildings.length}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Sealed 3D Cadastres</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-800 hover:text-emerald-950 font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Buildings List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2 font-mono uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-[#1e3a8a]" />
                SRO Action Queue
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                {buildings.length} total parcels
              </span>
            </div>

            <div className="space-y-2">
              {buildings.map((bld) => {
                const isSelected = selectedBuilding?.id === bld.id;
                const isReady = bld.status === 'plan_verified';
                const isRegistered = bld.status === 'registered';

                return (
                  <div
                    key={bld.id}
                    onClick={() => handleSelectBuilding(bld)}
                    className={`p-3 rounded-lg border text-xs transition-colors cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-[#1e3a8a] bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        Building {bld.building_id}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          isRegistered
                            ? 'bg-emerald-50 text-[#059669] border-emerald-300'
                            : isReady
                            ? 'bg-blue-50 text-[#1e3a8a] border-blue-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {isRegistered
                          ? 'Deed Sealed'
                          : isReady
                          ? 'Awaiting SRO Deed'
                          : 'In Municipal Audit'}
                      </span>
                    </div>

                    <div className="text-slate-600 truncate text-[11px]">
                      Survey No: <strong>{bld.survey_number}</strong> &bull; {bld.address}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                      <span>Floors: {bld.number_of_floors || 4} levels</span>
                      {bld.deed_reference ? (
                        <span className="text-[#059669] font-semibold">{bld.deed_reference}</span>
                      ) : (
                        <span className="text-[#1e3a8a] font-semibold">Ready to Seal &rarr;</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Title Deed Linking Form & Units Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedBuilding ? (
            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Building {selectedBuilding.building_id}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      Survey: {selectedBuilding.survey_number}
                    </span>
                    {selectedBuilding.ulpin && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-[#059669] border border-emerald-300">
                        Building 3D ULPIN: {selectedBuilding.ulpin}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedBuilding.address}</span>
                  </p>
                </div>

                {onSelectBuildingForMap && (
                  <button
                    onClick={() => onSelectBuildingForMap(selectedBuilding)}
                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#1e3a8a]" />
                    <span>Cadastre Map</span>
                  </button>
                )}
              </div>

              {/* Title Deed Input Form Card */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-[#1e3a8a]" />
                    <span>IGRS Registered Sale Deed Reference</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Sub-Registrar Office Registry Protocol
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Deed Document Reference Number <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="input-sro-deed-reference"
                      type="text"
                      value={deedReference}
                      onChange={(e) => setDeedReference(e.target.value)}
                      placeholder="e.g. DOC-2026-TEL-3127-8821"
                      className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                    />
                  </div>

                  <div>
                    {isSRO ? (
                      <button
                        id="btn-sro-lock-cadastre"
                        onClick={handleRegisterCadastre}
                        disabled={isRegistering || !deedReference.trim()}
                        className="w-full px-3.5 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock 3D Cadastre & Issue ULPIN</span>
                      </button>
                    ) : (
                      <div className="p-1.5 rounded bg-slate-100 border border-slate-200 text-center text-[11px] text-slate-600 font-mono">
                        Switch to SRO Officer to sign
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Units & 3D ULPIN Matrix Table with Pagination */}
              <div className="rounded-lg border border-slate-200 overflow-hidden shadow-xs bg-white">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-2 font-mono uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-[#1e3a8a]" />
                    <span>Vertical Strata Units & 3D ULPIN Catalog ({totalUnits})</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    ISO 19152 LADM Specification
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Floor & Unit</th>
                        <th className="px-3 py-2.5">Vertical Extent</th>
                        <th className="px-3 py-2.5">Assigned Owner</th>
                        <th className="px-3 py-2.5">3D ULPIN Identifier</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-mono">
                      {paginatedUnits.map((p) => {
                        const unit = p.property;
                        const floor = p.floor;
                        const geom = p.verticalGeometry;
                        const p3d = p.prototype3DId;
                        const owner = p.owners[0]?.owner;

                        return (
                          <tr key={unit.property_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-slate-900 font-sans">
                              <div className="flex items-center gap-1.5">
                                <span>{unit.flat_number}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-normal">
                                {unit.property_type} &bull; {unit.area} m&sup2;
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-slate-700">
                              <span className="text-[#1e3a8a] font-bold">
                                {(geom?.bottom_height ?? 0).toFixed(1)}m – {(geom?.top_height ?? 3).toFixed(1)}m
                              </span>
                              <div className="text-[10px] text-slate-500 font-sans">
                                Level {floor.floor_number} (&Delta;h={(geom?.height ?? (geom?.top_height && geom?.bottom_height ? geom.top_height - geom.bottom_height : 3)).toFixed(1)}m)
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-slate-700 font-sans">
                              <div className="font-semibold text-slate-900 truncate max-w-[160px]">
                                {owner?.owner_name || 'Assigned Titleholder'}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {p.owners[0]?.ownership?.ownership_share ?? 100}% Share &bull;{' '}
                                {p.owners[0]?.ownership?.ownership_type || 'Sole Title'}
                              </div>
                            </td>

                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1e3a8a] border border-blue-200 text-[11px] font-bold">
                                {p3d?.generated_identifier || `TS-${selectedBuilding.building_id}-F01-U01`}
                              </span>
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              {selectedBuilding.status === 'registered' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[#059669] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-[#059669]" /> SEALED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-bold">
                                  <Lock className="w-3 h-3 text-amber-600" /> PENDING
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2.5 text-right font-sans">
                              <button
                                id={`btn-edit-flat-${(unit?.flat_number || 'unit').replace(/\s+/g, '-').toLowerCase()}`}
                                onClick={() => handleOpenEditModal(p)}
                                className="px-2.5 py-1 rounded bg-[#1e3a8a]/10 hover:bg-[#1e3a8a]/20 text-[#1e3a8a] border border-[#1e3a8a]/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title={`Edit details of ${unit?.flat_number || 'unit'}`}
                              >
                                <Pencil className="w-3 h-3 text-[#1e3a8a]" />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Reusable Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalUnits}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20]}
                />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg bg-white font-mono">
              Select a verified submission to enter deed references and seal the 3D cadastre.
            </div>
          )}
        </div>
      </div>

      {/* SRO Strata Flat Details Edit Modal */}
      {isEditModalOpen && editingProperty && (
        <EditFlatModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingProperty(null);
          }}
          enrichedProperty={editingProperty}
          building={selectedBuilding}
          onSaved={handleFlatSaved}
        />
      )}
    </div>
  );
};
