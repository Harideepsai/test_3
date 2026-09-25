import React, { useState, useEffect, useRef } from 'react';
import { Building, Floor } from '../types';
import {
  Building2,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Save,
  Plus,
  Ruler,
  Maximize2,
  ShieldCheck,
  Box,
  Database,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  FileCode,
  ExternalLink,
  Eye,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Pagination } from './Pagination';
import { cadastreFileStorage } from '../services/cadastreFileStorage';

interface BuildingDetailsViewProps {
  buildings: Building[];
  floors: Floor[];
  onUpdateBuilding: (bldId: string, updated: Partial<Building>) => Promise<void>;
  onRefresh: () => void;
}

export const BuildingDetailsView: React.FC<BuildingDetailsViewProps> = ({
  buildings,
  floors,
  onUpdateBuilding,
  onRefresh,
}) => {
  const [selectedBldId, setSelectedBldId] = useState<string>(buildings[0]?.building_id || 'B001');

  const fallbackBld: Building = {
    id: 'bld_demo_001',
    building_id: 'B001',
    survey_number: '3127',
    address: 'Plot 42, Cyber Enclave, Hitech City Main Rd, Madhapur, Hyderabad, Telangana 500081',
    latitude: 17.4485,
    longitude: 78.3748,
    plot_area: 1250.0,
    number_of_floors: 4,
    total_building_height: 12.0,
    state_code: 'TS',
    has_database_3d_file: true,
    stored_3d_file_id: '3DF-B001-DEMO',
    stored_3d_file_name: '3127_3D_Cadastral_Model.glb',
    stored_3d_file_size: 1944,
    model_url: '/api/buildings/B001/3d-file',
  };

  const currentBld: Building =
    buildings.find((b) => b.building_id === selectedBldId || b.id === selectedBldId) ||
    buildings[0] ||
    fallbackBld;

  const bldFloors = floors
    .filter((f) => f.building_id === currentBld.building_id || f.building_id === currentBld.id)
    .sort((a, b) => a.floor_number - b.floor_number);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [buildingName, setBuildingName] = useState(currentBld.building_name || currentBld.name || '');
  const [surveyNumber, setSurveyNumber] = useState(currentBld.survey_number);
  const [address, setAddress] = useState(currentBld.address);
  const [latitude, setLatitude] = useState(currentBld.latitude);
  const [longitude, setLongitude] = useState(currentBld.longitude);
  const [plotArea, setPlotArea] = useState(currentBld.plot_area);
  const [numFloors, setNumFloors] = useState(currentBld.number_of_floors || currentBld.total_floors || 4);
  const [totalHeight, setTotalHeight] = useState(currentBld.total_building_height || currentBld.total_height || 12.0);

  // 3D Database Storage Operations State
  const [isUploading3D, setIsUploading3D] = useState(false);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [isDeleting3D, setIsDeleting3D] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewRecordModal, setViewRecordModal] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when building changes
  useEffect(() => {
    setBuildingName(currentBld.building_name || currentBld.name || '');
    setSurveyNumber(currentBld.survey_number);
    setAddress(currentBld.address);
    setLatitude(currentBld.latitude);
    setLongitude(currentBld.longitude);
    setPlotArea(currentBld.plot_area);
    setNumFloors(currentBld.number_of_floors || currentBld.total_floors || 4);
    setTotalHeight(currentBld.total_building_height || currentBld.total_height || 12.0);
    setFeedback(null);
  }, [currentBld.building_id, currentBld.id]);

  // Pagination for floors
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const totalItems = bldFloors.length;
  const paginatedFloors = bldFloors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSaveBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateBuilding(currentBld.building_id, {
        name: buildingName.trim(),
        building_name: buildingName.trim(),
        survey_number: surveyNumber,
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
        plot_area: Number(plotArea),
        number_of_floors: Number(numFloors),
        total_building_height: Number(totalHeight),
      });
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Building parcel attributes successfully updated in database.' });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Failed to update building.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Upload custom 3D file (.glb / .gltf) into database state
  const handleUpload3DFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading3D(true);
    setFeedback(null);
    try {
      const res = await cadastreFileStorage.storeBuilding3DFileInDatabase(
        currentBld.building_id || currentBld.id,
        file,
        {
          fileName: file.name,
          description: `Custom 3D BIM/CAD model for Building ${currentBld.building_id}`,
          storedBy: 'Institutional Cadastre Officer',
          lodLevel: 'LOD2',
        }
      );

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `3D model '${file.name}' (${(file.size / 1024).toFixed(1)} KB) successfully stored in database record (${res.record?.id}).`,
        });
        onRefresh();
      } else {
        throw new Error(res.error || 'Failed to store 3D file in database');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Upload failed' });
    } finally {
      setIsUploading3D(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. Generate and store official 3D GLB volume in database
  const handleGenerateOfficial3D = async () => {
    setIsGenerating3D(true);
    setFeedback(null);
    try {
      const res = await cadastreFileStorage.storeBuilding3DFileInDatabase(
        currentBld.building_id || currentBld.id,
        null,
        {
          description: `Official statutory 3D Cadastral Volumetric Model for Building ${currentBld.building_id} (Survey No. ${currentBld.survey_number})`,
          storedBy: 'Survey of India / Cadastral Directorate Engine',
          lodLevel: 'LOD2',
        }
      );

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Official 3D Cadastral GLB successfully synthesized and stored in database table (Record ID: ${res.record?.id}).`,
        });
        onRefresh();
      } else {
        throw new Error(res.error || 'Generation failed');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || '3D generation failed' });
    } finally {
      setIsGenerating3D(false);
    }
  };

  // 3. Download / Stream 3D File (.glb) from database
  const handleDownload3DFile = () => {
    const url = `/api/buildings/${encodeURIComponent(currentBld.building_id || currentBld.id)}/3d-file`;
    const link = document.createElement('a');
    link.href = url;
    link.download = currentBld.stored_3d_file_name || `${currentBld.survey_number}_3D_Cadastral_Model.glb`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. View Raw Database 3D Record
  const handleInspectDatabaseRecord = async () => {
    try {
      const fileId = currentBld.stored_3d_file_id;
      let record = null;
      if (fileId) {
        const res = await fetch(`/api/database/3d-files/${encodeURIComponent(fileId)}`);
        if (res.ok) {
          const json = await res.json();
          record = json.data;
        }
      }
      if (!record) {
        const allFiles = await cadastreFileStorage.listAllDatabase3DFiles(true);
        record = allFiles.find(
          (f) =>
            f.building_id === currentBld.building_id ||
            f.building_id === currentBld.id ||
            f.survey_number === currentBld.survey_number
        );
      }
      if (record) {
        setViewRecordModal(record);
      } else {
        setFeedback({
          type: 'error',
          message: 'No database 3D file record found for this building.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to inspect database record: ' + err.message });
    }
  };

  // 5. Delete 3D File from Database Table
  const handleDelete3DFile = async () => {
    if (
      !window.confirm(
        `Are you sure you want to remove the stored 3D model record from the database for Building ${currentBld.building_id}?`
      )
    ) {
      return;
    }

    setIsDeleting3D(true);
    setFeedback(null);
    try {
      const fileId = currentBld.stored_3d_file_id;
      if (fileId) {
        await cadastreFileStorage.deleteDatabase3DFile(fileId);
      }
      // Update building state
      await onUpdateBuilding(currentBld.building_id, {
        has_database_3d_file: false,
        stored_3d_file_id: undefined,
        stored_3d_file_name: undefined,
        stored_3d_file_size: undefined,
        model_url: null,
      });
      setFeedback({
        type: 'success',
        message: '3D model record successfully purged from database.',
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to delete 3D model: ' + err.message });
    } finally {
      setIsDeleting3D(false);
    }
  };

  // Floor overlap & elevation validation
  const validationAlerts: { type: 'error' | 'warning' | 'pass'; text: string }[] = [];
  let maxFloorCeiling = 0;

  for (let i = 0; i < bldFloors.length; i++) {
    const fl = bldFloors[i];
    if (fl.top_height <= fl.bottom_height) {
      validationAlerts.push({
        type: 'error',
        text: `Floor ${fl.floor_number}: Top elevation (${fl.top_height}m) must be greater than bottom elevation (${fl.bottom_height}m).`,
      });
    }
    if (i < bldFloors.length - 1) {
      const nextFl = bldFloors[i + 1];
      if (fl.top_height > nextFl.bottom_height) {
        validationAlerts.push({
          type: 'error',
          text: `Vertical overlap detected between Floor ${fl.floor_number} (top: ${fl.top_height}m) and Floor ${nextFl.floor_number} (bottom: ${nextFl.bottom_height}m).`,
        });
      }
    }
    if (fl.top_height > maxFloorCeiling) maxFloorCeiling = fl.top_height;
  }

  if (totalHeight < maxFloorCeiling) {
    validationAlerts.push({
      type: 'warning',
      text: `Building total height (${totalHeight}m) is less than registered floor ceiling (${maxFloorCeiling}m).`,
    });
  } else {
    validationAlerts.push({
      type: 'pass',
      text: `All ${bldFloors.length} floors (0m to ${maxFloorCeiling}m) are bounded within building height (${totalHeight}m).`,
    });
  }

  const hasStored3D = Boolean(currentBld.has_database_3d_file || currentBld.stored_3d_file_id || currentBld.model_url);

  return (
    <div className="space-y-5 font-sans">
      {/* Top Banner with Multi-Building Switcher */}
      <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-[#1e3a8a] border border-blue-200 uppercase font-mono">
              Building Structural Hierarchy
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Survey No: <strong>{currentBld.survey_number}</strong>
            </span>
            {hasStored3D && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-mono">
                <Database className="w-3 h-3" />
                3D File In Database
              </span>
            )}
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1">
            {currentBld.building_name || currentBld.name || `Building ${currentBld.building_id}`}: Parcel Plot, 3D Asset & Vertical Strata
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            Official cadastral parcel definition, geospatial coordinate positioning, binary 3D volumetric model database storage, and floor slab stratification standards.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Building Picker if multiple buildings exist */}
          {buildings.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-200">
              <span className="text-[11px] text-slate-600 font-semibold">Select Building:</span>
              <select
                value={selectedBldId}
                onChange={(e) => setSelectedBldId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded px-2 py-1 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
              >
                {buildings.map((b) => (
                  <option key={b.building_id || b.id} value={b.building_id || b.id}>
                    {b.building_id} {b.building_name || b.name ? `- ${b.building_name || b.name}` : ''} (Sy. {b.survey_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#1e3a8a]" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Parcel Attributes'}</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3D Model Relational Database Storage Card */}
      <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-100 border border-blue-200 flex items-center justify-center text-[#1e3a8a]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Building 3D Model — Relational Database Storage
                </h3>
                {hasStored3D ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" />
                    STORED IN DATABASE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-3 h-3" />
                    NO 3D FILE LINKED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Binary 3D CAD/BIM model persisted in relational database table <code className="text-[#1e3a8a] bg-blue-50 px-1 py-0.5 rounded font-mono">building3DFiles</code> with SHA-256 integrity validation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden file input for uploading .glb or .gltf */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf"
              onChange={handleUpload3DFile}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading3D}
              className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Upload custom .glb or .gltf binary model to store in database record"
            >
              <Upload className="w-3.5 h-3.5 text-[#1e3a8a]" />
              <span>{isUploading3D ? 'Uploading...' : 'Upload 3D File (.glb)'}</span>
            </button>

            <button
              onClick={handleGenerateOfficial3D}
              disabled={isGenerating3D}
              className="px-3 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Synthesize official 3D volumetric GLB envelope and store in database"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isGenerating3D ? 'Synthesizing...' : 'Generate & Store 3D GLB'}</span>
            </button>

            {hasStored3D && (
              <>
                <button
                  onClick={handleDownload3DFile}
                  className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Stream and download binary .glb directly from database endpoint"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download .glb</span>
                </button>

                <button
                  onClick={handleInspectDatabaseRecord}
                  className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Inspect raw database record details, checksum, and metadata"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>Inspect Record</span>
                </button>

                <button
                  onClick={handleDelete3DFile}
                  disabled={isDeleting3D}
                  className="px-2.5 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Delete 3D model from database record"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3D File Relational Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
              Database Record ID
            </span>
            <span className="font-mono font-bold text-slate-900 truncate block mt-0.5" title={currentBld.stored_3d_file_id || 'None'}>
              {currentBld.stored_3d_file_id || 'Not assigned'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
              3D Asset File Name
            </span>
            <span className="font-semibold text-slate-900 truncate block mt-0.5" title={currentBld.stored_3d_file_name || 'None'}>
              {currentBld.stored_3d_file_name || 'No file stored'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
              Binary Size & Format
            </span>
            <span className="font-semibold text-slate-900 block mt-0.5">
              {currentBld.stored_3d_file_size
                ? `${(currentBld.stored_3d_file_size / 1024).toFixed(1)} KB (GLB Binary)`
                : '1.9 KB (Default LOD2)'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
              Database API Route
            </span>
            <span className="font-mono text-[11px] text-[#1e3a8a] truncate block mt-0.5" title={`/api/buildings/${currentBld.building_id}/3d-file`}>
              /api/buildings/{currentBld.building_id}/3d-file
            </span>
          </div>
        </div>
      </div>

      {/* Building Attributes Grid / Structured Edit Form */}
      {isEditing ? (
        <form
          onSubmit={handleSaveBuilding}
          className="p-5 rounded-lg bg-white border border-slate-300 shadow-sm space-y-4 text-xs"
        >
          <div className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1e3a8a]" />
              <span>Update Building {currentBld.building_id} Attributes</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Government Survey Form 4B</span>
          </div>

          <fieldset className="border border-slate-200 rounded p-3 bg-slate-50/50 space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-700 px-1 font-mono">
              1. Spatial Location & Dimensions
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Building / Project Name
                </label>
                <input
                  type="text"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="e.g. Sri Krishna Residency"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Survey Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={surveyNumber}
                  onChange={(e) => setSurveyNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plot Footprint Area (sq.m) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={plotArea}
                  onChange={(e) => setPlotArea(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registered Floors <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  value={numFloors}
                  onChange={(e) => setNumFloors(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Total Building Height (m) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={totalHeight}
                  onChange={(e) => setTotalHeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Institutional Physical Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-slate-200 rounded p-3 bg-slate-50/50 space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-700 px-1 font-mono">
              2. Geodetic Datum Reference (WGS84)
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Latitude (&deg;N)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Longitude (&deg;E)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                />
              </div>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Updating...' : 'Save Parcel Changes'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[10px] uppercase font-bold font-mono">Survey Reference</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{currentBld.survey_number}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">{currentBld.address}</div>
          </div>
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[10px] uppercase font-bold font-mono">Plot Footprint</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{currentBld.plot_area} sq.m</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Coverage: ~65% permissible</div>
          </div>
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[10px] uppercase font-bold font-mono">Vertical Strata</div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {currentBld.number_of_floors || currentBld.total_floors || 4} Floors ({currentBld.total_building_height || currentBld.total_height || 12.0}m)
            </div>
            <div className="text-[11px] text-[#059669] font-medium mt-0.5">Avg Slab Height: 3.0m</div>
          </div>
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[10px] uppercase font-bold font-mono">Jurisdiction</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{currentBld.state_code} &bull; Telangana</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Mandal: {(currentBld as any).mandal_or_taluk || 'Malkajgiri'}</div>
          </div>
        </div>
      )}

      {/* Validation Status Box */}
      <div className="space-y-2">
        {validationAlerts.map((alert, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              alert.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : alert.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            {alert.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
            )}
            <span>{alert.text}</span>
          </div>
        ))}
      </div>

      {/* Floor Strata Table with Reusable Pagination */}
      <div className="rounded-lg bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Layers className="w-4 h-4 text-[#1e3a8a]" />
            <span>Vertical Floor Stratification & Elevation Bounds ({totalItems} Floors)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-600">Standard 3.0m Floor Increment</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Floor ID</th>
                <th className="px-4 py-2.5">Floor Level</th>
                <th className="px-4 py-2.5">Designation</th>
                <th className="px-4 py-2.5">Bottom Elevation</th>
                <th className="px-4 py-2.5">Top Elevation</th>
                <th className="px-4 py-2.5">Clearance (&Delta;h)</th>
                <th className="px-4 py-2.5">Active Unit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginatedFloors.map((fl) => (
                <tr
                  key={fl.id || fl.floor_id}
                  className={`hover:bg-slate-50 transition-colors ${
                    fl.floor_number === 2 ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{fl.floor_id}</td>
                  <td className="px-4 py-2.5 font-semibold text-[#1e3a8a]">Level {fl.floor_number}</td>
                  <td className="px-4 py-2.5 text-slate-700">{fl.floor_name || `Floor ${fl.floor_number}`}</td>
                  <td className="px-4 py-2.5 font-mono text-amber-900">{(fl.bottom_height ?? 0).toFixed(1)} metres</td>
                  <td className="px-4 py-2.5 font-mono text-amber-900">{(fl.top_height ?? 3).toFixed(1)} metres</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700">
                    {((fl.top_height ?? 3) - (fl.bottom_height ?? 0)).toFixed(1)} metres
                  </td>
                  <td className="px-4 py-2.5">
                    {fl.floor_number === 2 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#1e3a8a] border border-blue-300 flex items-center gap-1 w-max">
                        Flat 203 (PROP001)
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Available for expansion</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[3, 5, 10]}
        />
      </div>

      {/* Inspect Database 3D Record Modal */}
      {viewRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#1e3a8a]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Database 3D File Record: {viewRecordModal.id}
                </h3>
              </div>
              <button
                onClick={() => setViewRecordModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block">Building ID</span>
                  <span className="font-mono font-bold text-slate-900">{viewRecordModal.building_id}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block">Survey Number</span>
                  <span className="font-mono font-bold text-slate-900">{viewRecordModal.survey_number}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block">File Name</span>
                  <span className="font-semibold text-slate-900">{viewRecordModal.file_name}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block">Size in Bytes</span>
                  <span className="font-mono font-bold text-slate-900">
                    {viewRecordModal.file_size_bytes} bytes ({((viewRecordModal.file_size_bytes || 0) / 1024).toFixed(2)} KB)
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block">MIME Type</span>
                  <span className="font-mono text-slate-900">{viewRecordModal.mime_type}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block">LOD Level</span>
                  <span className="font-bold text-[#1e3a8a]">{viewRecordModal.lod_level || 'LOD2'}</span>
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block">SHA-256 Checksum</span>
                <span className="font-mono text-[11px] text-slate-900 break-all select-all font-semibold block">
                  {viewRecordModal.checksum_sha256 || 'Not computed'}
                </span>
              </div>

              <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase font-bold block">Stored By & Timestamp</span>
                <span className="text-slate-800 block">
                  <strong>{viewRecordModal.stored_by || 'Cadastral Surveyor'}</strong> at{' '}
                  <span className="font-mono">{new Date(viewRecordModal.created_at).toLocaleString()}</span>
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-600 font-semibold font-mono text-[11px]">Raw JSON Record:</span>
                <pre className="p-3 rounded bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto max-h-48">
                  {JSON.stringify(
                    {
                      ...viewRecordModal,
                      data_base64: viewRecordModal.data_base64
                        ? `[Binary Base64 String: ${viewRecordModal.data_base64.length} chars]`
                        : undefined,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={handleDownload3DFile}
                className="px-3 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Binary File</span>
              </button>
              <button
                onClick={() => setViewRecordModal(null)}
                className="px-4 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
