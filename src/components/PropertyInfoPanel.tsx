import React, { useState } from 'react';
import { EnrichedProperty } from '../types';
import {
  Building2,
  User,
  MapPin,
  Maximize2,
  FileText,
  Hash,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Edit3,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface PropertyInfoPanelProps {
  enrichedProperty: EnrichedProperty | null;
  onUpdateProperty?: (updatedFields: any) => Promise<void>;
  onRefresh?: () => void;
}

export const PropertyInfoPanel: React.FC<PropertyInfoPanelProps> = ({
  enrichedProperty,
  onUpdateProperty,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form edit states
  const [flatNumber, setFlatNumber] = useState(enrichedProperty?.property.flat_number || 'Flat 203');
  const [ownerName, setOwnerName] = useState(
    enrichedProperty?.owners[0]?.owner.owner_name || 'Demo Owner'
  );
  const [propertyType, setPropertyType] = useState(
    enrichedProperty?.property.property_type || 'Residential Apartment (3BHK)'
  );
  const [area, setArea] = useState(enrichedProperty?.property.area || 120);
  const [bottomHeight, setBottomHeight] = useState(
    enrichedProperty?.verticalGeometry.bottom_height || 3.0
  );
  const [topHeight, setTopHeight] = useState(
    enrichedProperty?.verticalGeometry.top_height || 6.0
  );
  const [width, setWidth] = useState(enrichedProperty?.verticalGeometry.width || 10.0);
  const [length, setLength] = useState(enrichedProperty?.verticalGeometry.length || 12.0);
  const [docRef, setDocRef] = useState(
    enrichedProperty?.property.property_record_ref || 'DOC-2024-TEL-08912'
  );
  const [sourceType, setSourceType] = useState<string>(
    enrichedProperty?.propertyRecord?.source_reference || 'Demo Data'
  );

  if (!enrichedProperty) {
    return (
      <div className="p-8 rounded-xl bg-white border border-slate-200 shadow-xs text-center flex flex-col items-center justify-center">
        <Building2 className="w-12 h-12 text-slate-400 mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-slate-700">No Property Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select an apartment volume in the 3D cadastre viewer.</p>
      </div>
    );
  }

  const {
    property,
    building,
    floor,
    verticalGeometry,
    prototype3DId,
    owners,
    propertyRecord,
    location,
    validation,
  } = enrichedProperty;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProperty) return;

    setIsSaving(true);
    try {
      await onUpdateProperty({
        flat_number: flatNumber,
        owner_name: ownerName,
        property_type: propertyType,
        area: Number(area),
        bottom_height: Number(bottomHeight),
        top_height: Number(topHeight),
        width: Number(width),
        length: Number(length),
        property_record_ref: docRef,
        source_reference: sourceType,
      });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const calculatedHeight = Math.max(0, (topHeight || 6) - (bottomHeight || 3));

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      {/* Header Banner: Prototype 3D Property ID Display */}
      <div className="p-4 bg-gradient-to-r from-slate-50 via-cyan-50/40 to-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded bg-cyan-100 text-cyan-800 border border-cyan-300 uppercase">
              SIH26011 Cadastral Record
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-900 border border-amber-300">
              {propertyRecord?.source_reference || 'DEMO DATA'}
            </span>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5 text-cyan-600" />}
            <span>{isEditing ? 'Cancel' : 'Edit Geometry'}</span>
          </button>
        </div>

        {/* Prototype 3D Property ID Display (Emphasized as required by prompt) */}
        <div className="mt-3 p-3 rounded-lg bg-white border border-cyan-300 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-cyan-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-600" />
              Prototype 3D Property ID
            </span>
            <span className="text-[10px] text-slate-400">SIH 2026 Format Specification</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-slate-900 tracking-wider flex items-center justify-between">
            <span className="text-cyan-800">{prototype3DId?.generated_identifier || 'TS-B001-F02-U203'}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-sans font-medium">
              Active Cadastre
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-tight font-mono">
            Structure: <span className="font-bold text-cyan-700">TS</span> (State) -{' '}
            <span className="font-bold text-cyan-700">{building.building_id}</span> (Building) -{' '}
            <span className="font-bold text-cyan-700">F0{floor?.floor_number ?? 0}</span> (Floor) -{' '}
            <span className="font-bold text-cyan-700">U{(property?.flat_number || '').replace(/\D/g, '') || '203'}</span> (Unit)
          </p>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="mx-4 mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Property geometry and 3D ULPIN regenerated and saved to database!</span>
        </div>
      )}

      {/* Validation Banner if warnings or errors */}
      {validation.errors.length > 0 && (
        <div className="mx-4 mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Validation Inconsistency Detected:</div>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Edit Form Modal/Drawer vs Structured Information View */}
      {isEditing ? (
        <form onSubmit={handleSave} className="p-4 space-y-4 text-xs overflow-y-auto max-h-[500px]">
          <div className="p-2.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs leading-relaxed">
            <Info className="w-4 h-4 inline mr-1 text-cyan-600" />
            Adjusting height parameters will dynamically update the 3D spatial volume, database foreign keys, and regenerate the Prototype 3D Property ID.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Flat / Unit Number</label>
              <input
                type="text"
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Primary Owner Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Property Type</label>
              <input
                type="text"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Carpet Area (sq.m)</label>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Vertical Height & Elevation Controls */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <div className="font-semibold text-amber-800 flex items-center justify-between">
              <span>Vertical Elevation Parameters (Z-Axis)</span>
              <span className="text-[11px] font-mono text-slate-500">
                Height Δh = {calculatedHeight.toFixed(1)}m
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Bottom Elevation (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={bottomHeight}
                  onChange={(e) => setBottomHeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Top Elevation (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={topHeight}
                  onChange={(e) => setTopHeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Width (m)</label>
                <input
                  type="number"
                  step="0.5"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Length (m)</label>
                <input
                  type="number"
                  step="0.5"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Document Reference No.</label>
              <input
                type="text"
                value={docRef}
                onChange={(e) => setDocRef(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Cadastral Data Source</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white cursor-pointer"
              >
                <option value="Demo Data">Demo Data (Synthetic Demonstration)</option>
                <option value="IGRS / Authorized Property Record">IGRS / Authorized Property Record</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving to Database...' : 'Save & Update 3D Model'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Structured Information Display */
        <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[500px]">
          {/* Entity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Property Unit & Owner */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-800 font-semibold uppercase tracking-wider text-[11px]">
                <User className="w-3.5 h-3.5 text-cyan-600" />
                <span>Unit & Ownership Entity</span>
              </div>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Property ID:</span>
                  <strong className="font-mono text-slate-900">{property.property_id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit / Flat:</span>
                  <strong className="text-cyan-800">{property.flat_number}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Owner Name:</span>
                  <strong className="text-slate-900">
                    {owners[0]?.owner.owner_name || 'Demo Owner'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ownership Share:</span>
                  <span className="text-slate-700">{owners[0]?.ownership.ownership_share || 100}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Property Type:</span>
                  <span className="text-slate-700 truncate max-w-[140px]">{property.property_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Carpet Area:</span>
                  <span className="text-slate-700">{property.area} sq.m (~{(property.area * 10.764).toFixed(0)} sq.ft)</span>
                </div>
              </div>
            </div>

            {/* Vertical Geometry & Spatial Volume */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-800 font-semibold uppercase tracking-wider text-[11px]">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Vertical Geometry Entity</span>
              </div>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Floor Assignment:</span>
                  <strong className="text-slate-900">Floor {floor.floor_number} ({floor.floor_id})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bottom Elevation:</span>
                  <span className="font-mono text-amber-800">{verticalGeometry.bottom_height.toFixed(1)} metres</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Top Elevation:</span>
                  <span className="font-mono text-amber-800">{verticalGeometry.top_height.toFixed(1)} metres</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Height (Δh):</span>
                  <strong className="font-mono text-slate-900">{verticalGeometry.height.toFixed(1)} metres</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">3D Dimensions (W×L):</span>
                  <span className="font-mono text-slate-700">{verticalGeometry.width}m × {verticalGeometry.length}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">3D Spatial Volume:</span>
                  <strong className="font-mono text-cyan-800">
                    {(verticalGeometry.width * verticalGeometry.length * verticalGeometry.height).toFixed(0)} m³
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Building & Geographic Location */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-cyan-800 font-semibold uppercase tracking-wider text-[11px]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                <span>Building & Geographic Location</span>
              </div>
              <span className="text-slate-500 font-mono text-[10px]">{location.location_id}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-500 block">Building ID / Survey No:</span>
                <strong className="text-slate-900">{building.building_id} | Survey #{building.survey_number}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Latitude & Longitude:</span>
                <strong className="font-mono text-cyan-800">{location.latitude.toFixed(5)}° N, {location.longitude.toFixed(5)}° E</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block">Cadastral Address:</span>
                <span className="text-slate-700 text-[11px]">{location.address}</span>
              </div>
            </div>
          </div>

          {/* IGRS / Property Record Source Reference */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-indigo-800 font-semibold uppercase tracking-wider text-[11px]">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Property Record Reference</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">
                {propertyRecord?.source_reference || 'Demo Data'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-500 block">Document Number:</span>
                <strong className="font-mono text-slate-900">{property.property_record_ref}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">SRO Office:</span>
                <span className="text-slate-700">{propertyRecord?.sub_registrar_office || 'SRO Serilingampally'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
