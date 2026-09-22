import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Layers,
  FileText,
  User,
  Ruler,
  CheckCircle2,
  AlertCircle,
  Hash,
  Sparkles,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { Building, EnrichedProperty } from '../types';
import { cadastreService } from '../services/cadastreService';

interface EditFlatModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrichedProperty: EnrichedProperty | null;
  building: Building | null;
  onSaved: (unitName: string) => void;
}

const COMMON_PROPERTY_TYPES = [
  'Residential Apartment',
  'Residential Apartment (3BHK)',
  'Residential Apartment (2BHK)',
  'Residential Apartment (1BHK)',
  'Commercial Suite / Office',
  'Retail Storefront / Showroom',
  'Ground Floor Facility / Parking',
  'Duplex Penthouse',
  'Terrace / Rooftop Area',
  'Common Utility Space',
];

const OWNERSHIP_TYPES = [
  'Sole Title',
  'Joint Tenancy',
  'Tenancy in Common',
  'Undivided Share (UDS)',
  'Corporate Entity',
  'Government / ULB Allocated',
];

export const EditFlatModal: React.FC<EditFlatModalProps> = ({
  isOpen,
  onClose,
  enrichedProperty,
  building,
  onSaved,
}) => {
  const [flatNumber, setFlatNumber] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [customPropertyType, setCustomPropertyType] = useState<string>('');
  const [isCustomType, setIsCustomType] = useState<boolean>(false);
  const [area, setArea] = useState<number | string>(100);
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownershipShare, setOwnershipShare] = useState<number | string>(100);
  const [ownershipType, setOwnershipType] = useState<string>('Sole Title');
  const [ulpin, setUlpin] = useState<string>('');
  const [bottomHeight, setBottomHeight] = useState<number | string>(0);
  const [topHeight, setTopHeight] = useState<number | string>(3);
  const [deedReference, setDeedReference] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state whenever selected flat changes
  useEffect(() => {
    if (enrichedProperty) {
      const u = enrichedProperty.property;
      const f = enrichedProperty.floor;
      const g = enrichedProperty.verticalGeometry;
      const p = enrichedProperty.prototype3DId;
      const fo = enrichedProperty.owners?.[0];

      setFlatNumber(u.flat_number || '');
      
      const type = u.property_type || 'Residential Apartment';
      if (COMMON_PROPERTY_TYPES.includes(type)) {
        setPropertyType(type);
        setIsCustomType(false);
        setCustomPropertyType('');
      } else {
        setPropertyType('Custom');
        setIsCustomType(true);
        setCustomPropertyType(type);
      }

      setArea(u.area || 100);
      setOwnerName(fo?.owner?.owner_name || 'Assigned Titleholder');
      setOwnershipShare(fo?.ownership?.ownership_share ?? 100);
      setOwnershipType(fo?.ownership?.ownership_type || 'Sole Title');
      setUlpin(
        p?.generated_identifier ||
          `TS-${building?.building_id || 'B001'}-F${(f?.floor_number ?? 0).toString().padStart(2, '0')}-U${(u.flat_number || '01').replace(/[^a-zA-Z0-9]/g, '')}`
      );
      setBottomHeight(g?.bottom_height ?? (f?.bottom_height ?? 0));
      setTopHeight(g?.top_height ?? (f?.top_height ?? 3));
      setDeedReference(u.property_record_ref || building?.deed_reference || '');
      setErrorMessage(null);
    }
  }, [enrichedProperty, building]);

  if (!isOpen || !enrichedProperty) return null;

  const unit = enrichedProperty.property;
  const floor = enrichedProperty.floor;
  const geom = enrichedProperty.verticalGeometry;
  const p3d = enrichedProperty.prototype3DId;
  const firstOwner = enrichedProperty.owners[0];

  const handleRegenerateUlpin = () => {
    const bId = building?.building_id || 'B001';
    const flrNum = (floor.floor_number ?? 0).toString().padStart(2, '0');
    const cleanUnit = flatNumber.replace(/[^a-zA-Z0-9]/g, '') || 'U01';
    setUlpin(`TS-${bId}-F${flrNum}-${cleanUnit}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedFlat = flatNumber.trim();
    if (!trimmedFlat) {
      setErrorMessage('Flat / Unit number cannot be empty.');
      return;
    }

    const numArea = Number(area);
    if (isNaN(numArea) || numArea <= 0) {
      setErrorMessage('Carpet area must be a positive number.');
      return;
    }

    const numBottom = Number(bottomHeight);
    const numTop = Number(topHeight);
    if (isNaN(numBottom) || isNaN(numTop)) {
      setErrorMessage('Vertical heights must be valid numbers.');
      return;
    }

    if (numTop <= numBottom) {
      setErrorMessage('Top height (Z-Max) must be strictly greater than bottom height (Z-Min).');
      return;
    }

    const finalPropertyType = isCustomType ? customPropertyType.trim() || 'Residential Apartment' : propertyType;

    setIsSaving(true);
    try {
      const res = await cadastreService.updateFlatDetails({
        propertyId: unit.property_id,
        buildingId: building?.building_id,
        flatNumber: trimmedFlat,
        propertyType: finalPropertyType,
        area: numArea,
        ownerName: ownerName.trim() || 'Assigned Titleholder',
        ownershipShare: Number(ownershipShare) || 100,
        ownershipType: ownershipType,
        ulpin: ulpin.trim(),
        bottomHeight: numBottom,
        topHeight: numTop,
        propertyRecordRef: deedReference.trim(),
      });

      if (res) {
        onSaved(trimmedFlat);
        onClose();
      } else {
        setErrorMessage('Failed to update flat details in repository.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error occurred while saving flat details.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentHeightDiff = Math.max(0, (Number(topHeight) || 0) - (Number(bottomHeight) || 0));
  const sqFtApprox = Math.round((Number(area) || 0) * 10.7639);

  return (
    <div
      id="modal-edit-flat"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Institutional Header */}
        <div className="px-5 py-4 bg-[#1e3a8a] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide">Edit Strata Flat Details</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-900/60 text-blue-200 border border-blue-400/30">
                  {unit.flat_number}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80 font-mono">
                Building {building?.building_id || 'B001'} &bull; Survey No: {building?.survey_number || 'N/A'} &bull; Floor {floor.floor_number}
              </p>
            </div>
          </div>

          <button
            id="btn-close-edit-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Regulatory Sub-Header Info Banner */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1e3a8a] shrink-0" />
            <span className="font-medium text-slate-700">
              Sub-Registrar Office (SRO) Title & Spatial Registry
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">ISO 19152 LADM Strata Unit</span>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-5">
          {/* Section 1: Unit Identification & Classification */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-mono uppercase tracking-wider pb-1 border-b border-slate-100">
              <Hash className="w-3.5 h-3.5 text-[#1e3a8a]" />
              <span>Unit Identity & Usage Classification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Flat / Unit Identifier <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-flat-number"
                  type="text"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  placeholder="e.g. Flat 101, Unit G01"
                  required
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Municipal flat badge / door number
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Property Classification <span className="text-rose-600">*</span>
                </label>
                <select
                  id="select-property-type"
                  value={isCustomType ? 'Custom' : propertyType}
                  onChange={(e) => {
                    if (e.target.value === 'Custom') {
                      setIsCustomType(true);
                    } else {
                      setIsCustomType(false);
                      setPropertyType(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] bg-white"
                >
                  {COMMON_PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Custom">Other / Custom Classification...</option>
                </select>

                {isCustomType && (
                  <input
                    id="input-custom-property-type"
                    type="text"
                    value={customPropertyType}
                    onChange={(e) => setCustomPropertyType(e.target.value)}
                    placeholder="Enter custom classification"
                    className="w-full mt-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Carpet / Built-up Area (sq. metres) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-flat-area"
                    type="number"
                    step="0.1"
                    min="1"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] pr-12 font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                    m&sup2;
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Approx. {sqFtApprox.toLocaleString()} sq.ft built-up area
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Floor Level / Allocation
                </label>
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
                  <span>Level {floor.floor_number}</span>
                  <span className="text-slate-500 text-[11px] font-sans">
                    {floor.floor_name || (floor.floor_number === 0 ? 'Ground Floor' : `Floor ${floor.floor_number}`)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Floor structure is linked to building CAD geometry
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Assigned Titleholder & Ownership Record */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-mono uppercase tracking-wider pb-1 border-b border-slate-100">
              <User className="w-3.5 h-3.5 text-[#1e3a8a]" />
              <span>Assigned Titleholder & Deed Record</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Owner / Titleholder Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-owner-name"
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Sri V. Anand Kumar"
                  required
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ownership Share (%)
                </label>
                <div className="relative">
                  <input
                    id="input-ownership-share"
                    type="number"
                    min="1"
                    max="100"
                    value={ownershipShare}
                    onChange={(e) => setOwnershipShare(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] pr-8 font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ownership Legal Tenure
                </label>
                <select
                  id="select-ownership-type"
                  value={ownershipType}
                  onChange={(e) => setOwnershipType(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] bg-white"
                >
                  {OWNERSHIP_TYPES.map((ot) => (
                    <option key={ot} value={ot}>
                      {ot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IGRS Sale Deed Document Reference
                </label>
                <input
                  id="input-flat-deed-ref"
                  type="text"
                  value={deedReference}
                  onChange={(e) => setDeedReference(e.target.value)}
                  placeholder="e.g. DOC-2026-TEL-B264-5877"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: 3D Spatial Geometry & ULPIN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
                <Ruler className="w-3.5 h-3.5 text-[#1e3a8a]" />
                <span>3D Spatial Geometry & Vertical Extents (Z-Axis)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1e3a8a] border border-blue-200">
                Height &Delta;h = {currentHeightDiff.toFixed(1)}m
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bottom Height Z-Min (metres) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-bottom-height"
                    type="number"
                    step="0.1"
                    value={bottomHeight}
                    onChange={(e) => setBottomHeight(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                    m
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Ground reference baseline elevation
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Top Height Z-Max (metres) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-top-height"
                    type="number"
                    step="0.1"
                    value={topHeight}
                    onChange={(e) => setTopHeight(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                    m
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Ceiling/slab boundary level
                </span>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    3D ULPIN Identifier
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateUlpin}
                    className="text-[11px] text-[#1e3a8a] hover:text-blue-900 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Format Standard</span>
                  </button>
                </div>
                <input
                  id="input-flat-ulpin"
                  type="text"
                  value={ulpin}
                  onChange={(e) => setUlpin(e.target.value)}
                  placeholder="e.g. TS-B264-F01-U101"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-[#1e3a8a] font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] bg-blue-50/40"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Format: &#123;STATE&#125;-&#123;BUILDING&#125;-&#123;FLOOR&#125;-&#123;UNIT&#125;
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              id="btn-cancel-edit-flat"
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="btn-save-flat-details"
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Flat Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
