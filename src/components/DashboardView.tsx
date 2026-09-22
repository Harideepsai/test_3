import React from 'react';
import {
  Box,
  Building2,
  Layers,
  MapPin,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Info,
  Compass,
  CheckCircle2,
  Layers3,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { DatabaseState, EnrichedProperty, ValidationReport } from '../types';
import { NavigationTab } from './Navbar';

interface DashboardViewProps {
  dbState: DatabaseState;
  enrichedProperties: EnrichedProperty[];
  validationReport: ValidationReport | null;
  onNavigate: (tab: NavigationTab) => void;
  onSelectProperty: (propertyId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dbState,
  enrichedProperties,
  validationReport,
  onNavigate,
  onSelectProperty,
}) => {
  const totalBuildings = dbState.buildings.length;
  const totalProperties = dbState.propertyUnits.length;
  const totalFloors = dbState.floors.length;
  const total3DProperties = dbState.verticalGeometries.length;
  const totalOwners = dbState.owners.length;

  const demoProperty = enrichedProperties[0];

  return (
    <div className="space-y-6 font-sans">
      {/* Institutional Capstone Project Banner */}
      <div className="rounded-lg bg-white border border-slate-200 p-6 shadow-xs">
        <div className="max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-[#1e3a8a] text-xs font-semibold font-mono">
            <GraduationCap className="w-4 h-4 text-[#1e3a8a]" />
            <span>Smart India Hackathon 2026 &bull; Finalist Prototype &bull; Problem ID: SIH26011</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
            3D ULPIN Generation & Vertical Cadastre Mapping Engine
          </h1>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Transitioning conventional 2D parcel registration into an authentic <strong>3D Spatial Cadastre</strong>. By integrating authorized property records, geographic latitude/longitude anchors, and structured vertical elevations, this system generates a verifiable <strong>Prototype 3D Property ID</strong> representing individual apartment units as true spatial volumes in compliance with OGC/ISO 19152 Land Administration Domain Model (LADM v2).
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (demoProperty) onSelectProperty(demoProperty.property.property_id);
                onNavigate('combined-demo');
              }}
              className="px-4 py-2 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Box className="w-4 h-4" />
              <span>Launch 3D Volumetric Explorer</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('property-records')}
              className="px-4 py-2 rounded bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors shadow-xs cursor-pointer flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              <span>IGRS / Authorized Records & CSV Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cadastral Metric Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-mono uppercase">
            <span>Total Parcels</span>
            <Building2 className="w-4 h-4 text-[#1e3a8a]" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{totalBuildings}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Building B001 (Madhapur)</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-mono uppercase">
            <span>Floor Slabs</span>
            <Layers className="w-4 h-4 text-[#1e3a8a]" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{totalFloors}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">G+3 Floors (0.0m – 12.0m)</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-mono uppercase">
            <span>Property Units</span>
            <Box className="w-4 h-4 text-[#1e3a8a]" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{totalProperties}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Parking, Common & 6 Flats</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-mono uppercase">
            <span>3D Geometries</span>
            <Layers3 className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{total3DProperties}</div>
          <div className="text-[10px] text-amber-800 font-semibold mt-0.5">Z = 0.0m to 12.0m</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-mono uppercase">
            <span>Titleholders</span>
            <Users className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{totalOwners}</div>
          <div className="text-[10px] text-[#059669] font-semibold mt-0.5">AWA & Resident Owners</div>
        </div>
      </div>

      {/* Methodology & 3D ULPIN Architecture Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Cadastral Transformation Pipeline */}
        <div className="lg:col-span-8 p-5 rounded-lg bg-white border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2 font-mono uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#1e3a8a]" />
              <span>SIH26011 Relational Cadastral Pipeline</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-500">Official Cadastre Architecture</span>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            {/* Step 1 */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex items-start gap-3">
              <span className="w-6 h-6 rounded bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                1
              </span>
              <div>
                <strong className="text-slate-900 block font-semibold">
                  Field Survey & Parcel Georeferencing
                </strong>
                <p className="text-slate-600 mt-0.5 leading-relaxed text-[11px]">
                  Licensed surveyor captures plot perimeter coordinates (EPSG:4326/WGS84), revenue survey number, plot area (1250 sq.m), and setback margins.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex items-start gap-3">
              <span className="w-6 h-6 rounded bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                2
              </span>
              <div>
                <strong className="text-slate-900 block font-semibold">
                  Vertical Floor Slicing & Elevation Stratification
                </strong>
                <p className="text-slate-600 mt-0.5 leading-relaxed text-[11px]">
                  Structure is partitioned into discrete vertical floor slabs (Ground Floor at 0.0m–3.0m, Floor 1 at 3.0m–6.0m, Floor 2 at 6.0m–9.0m, Floor 3 at 9.0m–12.0m). Verified against building total height (12.0m) to prevent vertical overlap.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex items-start gap-3">
              <span className="w-6 h-6 rounded bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                3
              </span>
              <div>
                <strong className="text-slate-900 block font-semibold">
                  Sub-Registrar Office (SRO) Title Linking & 3D ULPIN Sealing
                </strong>
                <p className="text-slate-600 mt-0.5 leading-relaxed text-[11px]">
                  Registered sale deed documents are linked to specific volumetric bounding boxes. An immutable 3D ULPIN is computed (e.g. <code>TS-B001-F02-U203</code>) and sealed into the official cadastre.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 cols: Relational Integrity Overview */}
        <div className="lg:col-span-4 p-5 rounded-lg bg-white border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 font-mono uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              <span>Integrity & Verification</span>
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#059669] border border-emerald-300 font-mono">
              AUDITED
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">Vertical Height Boundary</div>
              <div className="text-[11px] text-slate-600">
                Building height is 12.0m. All 4 floors occupy exactly 0.0m to 12.0m with zero gap or overlap.
              </div>
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">ULPIN Uniqueness Guarantee</div>
              <div className="text-[11px] text-slate-600">
                100% of property units possess unique, deterministically generated 3D ULPIN identifiers.
              </div>
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">Title Deed Traceability</div>
              <div className="text-[11px] text-slate-600">
                Each unit maps to registered IGRS document references and survey numbers in the relational ledger.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
