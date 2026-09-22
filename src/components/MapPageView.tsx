import React, { useState } from 'react';
import { EnrichedProperty, Floor } from '../types';
import { LeafletMap } from './LeafletMap';
import { ThreeCanvas } from './ThreeCanvas';
import { PropertyInfoPanel } from './PropertyInfoPanel';
import {
  MapPin,
  Box,
  Layers,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
  Maximize2,
  Sliders,
  Filter,
  CheckCircle2,
  Building2,
  Compass,
  FileText,
  Map as MapIcon,
  ChevronLeft,
} from 'lucide-react';

interface MapPageViewProps {
  enrichedProperty: EnrichedProperty | null;
  allProperties: EnrichedProperty[];
  allFloors: Floor[];
  selectedPropertyId: string;
  onSelectProperty: (propertyId: string) => void;
  onUpdateProperty?: (updatedFields: any) => Promise<void>;
  onUpdateCoordinates?: (lat: number, lng: number) => Promise<void>;
  onRefresh?: () => void;
}

export const MapPageView: React.FC<MapPageViewProps> = ({
  enrichedProperty,
  allProperties,
  allFloors,
  selectedPropertyId,
  onSelectProperty,
  onUpdateProperty,
  onUpdateCoordinates,
  onRefresh,
}) => {
  // Modes: 'map' (2D GIS Map), '3d' (Full 3D Building Model), 'split' (Side-by-side)
  const [viewModeState, setViewModeState] = useState<'map' | '3d' | 'split'>('map');
  const [explodedOffset, setExplodedOffset] = useState<number>(0);
  const [renderStyle, setRenderStyle] = useState<'volumetric' | 'xray' | 'wireframe'>('volumetric');
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [filterFloor, setFilterFloor] = useState<number | 'ALL'>('ALL');
  const [transitionNotification, setTransitionNotification] = useState<string | null>(null);

  const isSelected = !!enrichedProperty && enrichedProperty.property.property_id === selectedPropertyId;

  const handleBuildingClick = (buildingId: string) => {
    setViewModeState('3d');
    setTransitionNotification(`Transformed Map into 3D Building Model for ${buildingId}`);
    setTimeout(() => setTransitionNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Toggle Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-100 text-cyan-800 border border-cyan-300 uppercase">
              Interactive Map to 3D Cadastre
            </span>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {viewModeState === 'map'
                ? 'Geographic Map View (Click Building to Open 3D Model)'
                : viewModeState === '3d'
                ? 'Building 3D Model & Multi-Unit Inspector'
                : 'Split Map & 3D Model View'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {viewModeState === 'map'
              ? 'Click on the Building B001 marker or parcel boundary on the map to transform it into the 3D Building Model.'
              : 'Click on ANY unit in the 3D building below to inspect its vertical elevation bounds, cadastral record, and Prototype 3D Property ID.'}
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setViewModeState('map')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewModeState === 'map'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>2D Map</span>
            </button>

            <button
              onClick={() => setViewModeState('3d')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewModeState === '3d'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Building Model</span>
            </button>

            <button
              onClick={() => setViewModeState('split')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewModeState === 'split'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transition Alert Notification */}
      {transitionNotification && (
        <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-300 text-cyan-900 text-xs flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600" />
            <span className="font-semibold">{transitionNotification}</span>
            <span className="text-slate-500 text-[11px]">| Click any unit to view its cadastral details.</span>
          </div>
          <button
            onClick={() => setTransitionNotification(null)}
            className="text-cyan-700 hover:text-cyan-900 text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Unit Selector Strip (Active in 3D and Split Modes) */}
      {viewModeState !== 'map' && (
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-600" />
              Click Any Unit to Display Full Cadastral Info ({allProperties.length} Units Available)
            </span>
            <span className="text-[11px] text-cyan-700 font-mono font-semibold">
              Selected: {enrichedProperty?.property.flat_number} ({enrichedProperty?.prototype3DId.generated_identifier})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {allProperties.map((p) => {
              const isCurrent = p.property.property_id === selectedPropertyId;
              const isGround = p.floor.floor_number === 0;
              return (
                <button
                  key={p.property.property_id}
                  onClick={() => onSelectProperty(p.property.property_id)}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-cyan-50 border-cyan-500 shadow-xs ring-2 ring-cyan-400'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isGround
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}
                    >
                      Floor {p.floor.floor_number}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      Z:{p.verticalGeometry.bottom_height}–{p.verticalGeometry.top_height}m
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate" title={p.property.flat_number}>
                    {p.property.flat_number}
                  </div>
                  <div className="text-[10px] text-cyan-700 font-mono truncate mt-0.5">
                    {p.prototype3DId.generated_identifier}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 1: MAP MODE (Click on Building -> Turns to 3D) */}
      {viewModeState === 'map' && (
        <div className="space-y-4">
          {/* Interactive Callout Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-50 via-sky-50 to-indigo-50 border border-cyan-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-700">
                <Building2 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Cadastral Parcel for Building B001</span>
                  <span className="text-[10px] bg-cyan-600 text-white font-bold px-2 py-0.5 rounded uppercase">
                    Interactive 3D Target
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Survey No. #{enrichedProperty?.building.survey_number || 'SY-402/1A'} &bull; Lat: {enrichedProperty?.location.latitude.toFixed(4)}° N, Lng: {enrichedProperty?.location.longitude.toFixed(4)}° E
                </p>
              </div>
            </div>

            <button
              onClick={() => handleBuildingClick('B001')}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Box className="w-4 h-4" />
              <span>Click to Turn into 3D Model</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Leaflet Map */}
          <div className="h-[520px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative">
            <LeafletMap
              building={enrichedProperty?.building || null}
              location={enrichedProperty?.location || null}
              isSelected={true}
              allowEditCoordinates={true}
              onCoordinatesChange={async (lat, lng) => {
                if (onUpdateCoordinates) {
                  await onUpdateCoordinates(lat, lng);
                }
              }}
              onBuildingClick={handleBuildingClick}
            />
          </div>
        </div>
      )}

      {/* VIEW 2: FULL 3D MODEL & UNIT INFO VIEW */}
      {viewModeState === '3d' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 3D Three.js WebGL Canvas (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold px-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewModeState('map')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to 2D Map</span>
                </button>
                <div className="flex items-center gap-1.5 text-cyan-700">
                  <Box className="w-4 h-4" />
                  <span>Building B001 (Click ANY Unit to Inspect)</span>
                </div>
              </div>
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                Drag: Orbit | Scroll: Zoom | Click Unit: Select
              </span>
            </div>

            {/* 3D WebGL Canvas */}
            <div className="h-[480px] w-full">
              <ThreeCanvas
                enrichedProperty={enrichedProperty}
                allProperties={allProperties}
                allFloors={allFloors}
                isSelected={isSelected}
                onSelectProperty={onSelectProperty}
                explodedOffset={explodedOffset}
                viewMode={renderStyle}
                showRuler={showRuler}
                filterFloor={filterFloor}
              />
            </div>

            {/* 3D Customization Bar */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
              {/* Render Style */}
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Render:</span>
                <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                  <button
                    onClick={() => setRenderStyle('volumetric')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      renderStyle === 'volumetric' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Solid Volumetric
                  </button>
                  <button
                    onClick={() => setRenderStyle('xray')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      renderStyle === 'xray' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    X-Ray Glass
                  </button>
                  <button
                    onClick={() => setRenderStyle('wireframe')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      renderStyle === 'wireframe' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Wireframe
                  </button>
                </div>
              </div>

              {/* Floor Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600 font-medium">Floor:</span>
                <select
                  value={filterFloor}
                  onChange={(e) => setFilterFloor(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">All 4 Floors (Full Building)</option>
                  <option value={0}>Ground Floor (Parking & Watchman)</option>
                  <option value={1}>1st Floor (Flats 101 & 102)</option>
                  <option value={2}>2nd Floor (Flats 201 & 202)</option>
                  <option value={3}>3rd Floor (Flats 301 & 302)</option>
                </select>
              </div>

              {/* Exploded Slider */}
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Explode:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={explodedOffset}
                  onChange={(e) => setExplodedOffset(parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                />
                <span className="font-mono text-cyan-700 text-[11px] font-bold">{(explodedOffset * 100).toFixed(0)}%</span>
              </div>

              {/* Ruler Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={showRuler}
                  onChange={(e) => setShowRuler(e.target.checked)}
                  className="rounded bg-white border-slate-300 text-cyan-600 focus:ring-0 cursor-pointer"
                />
                <span>Height Ruler</span>
              </label>
            </div>
          </div>

          {/* Right: Unit Information & Cadastre Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold px-1">
              <div className="flex items-center gap-1.5 text-cyan-700">
                <Building2 className="w-4 h-4" />
                <span>Selected Unit Information & Cadastral Record</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">{enrichedProperty?.property.property_id}</span>
            </div>

            <PropertyInfoPanel
              enrichedProperty={enrichedProperty}
              onUpdateProperty={onUpdateProperty}
              onRefresh={onRefresh}
            />
          </div>
        </div>
      )}

      {/* VIEW 3: SPLIT MAP & 3D MODEL VIEW */}
      {viewModeState === 'split' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: 2D Leaflet Map (6 cols) */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-700 font-semibold px-1">
                <div className="flex items-center gap-1.5 text-cyan-700">
                  <MapPin className="w-4 h-4" />
                  <span>2D Geographic Parcel Cadastre</span>
                </div>
                <span className="text-slate-500 text-[11px]">Building B001 &bull; Survey #402/1A</span>
              </div>
              <div className="h-[460px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                <LeafletMap
                  building={enrichedProperty?.building || null}
                  location={enrichedProperty?.location || null}
                  isSelected={true}
                  allowEditCoordinates={true}
                  onCoordinatesChange={async (lat, lng) => {
                    if (onUpdateCoordinates) {
                      await onUpdateCoordinates(lat, lng);
                    }
                  }}
                  onBuildingClick={handleBuildingClick}
                />
              </div>
            </div>

            {/* Right: 3D WebGL Multi-Unit Canvas (6 cols) */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-700 font-semibold px-1">
                <div className="flex items-center gap-1.5 text-cyan-700">
                  <Box className="w-4 h-4" />
                  <span>3D Building Model (Click ANY Unit)</span>
                </div>
                <span className="text-cyan-700 font-mono text-[11px] font-bold">
                  {enrichedProperty?.prototype3DId.generated_identifier}
                </span>
              </div>
              <div className="h-[460px] w-full">
                <ThreeCanvas
                  enrichedProperty={enrichedProperty}
                  allProperties={allProperties}
                  allFloors={allFloors}
                  isSelected={isSelected}
                  onSelectProperty={onSelectProperty}
                  explodedOffset={explodedOffset}
                  viewMode={renderStyle}
                  showRuler={showRuler}
                  filterFloor={filterFloor}
                />
              </div>
            </div>
          </div>

          {/* Unit Detailed Information Card in Split Mode */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12">
              <PropertyInfoPanel
                enrichedProperty={enrichedProperty}
                onUpdateProperty={onUpdateProperty}
                onRefresh={onRefresh}
              />
            </div>
          </div>
        </div>
      )}

      {/* SIH26011 Compliance Summary */}
      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-3">
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-600" />
          <span>Interactive Cadastral GIS & 3D Vertical Spatial Pipeline</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700">
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
            <strong className="text-cyan-700 block mb-1">1. Map Anchor:</strong>
            Geographic parcel mapped at ({enrichedProperty?.location.latitude.toFixed(4)}, {enrichedProperty?.location.longitude.toFixed(4)}) with verified SRO Document <span className="font-mono text-slate-900">{enrichedProperty?.property.property_record_ref}</span>.
          </div>
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
            <strong className="text-cyan-700 block mb-1">2. 3D Spatial Transformation:</strong>
            Clicking the building switches from 2D cadastral parcel to 3D volumetric multi-unit extrusion.
          </div>
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
            <strong className="text-cyan-700 block mb-1">3. Unit-Level Inspection:</strong>
            Clicking any unit in 3D displays its vertical bounds (Z-bottom to Z-top) and generates its unique Prototype 3D Property ID <span className="font-mono text-amber-800 font-bold">{enrichedProperty?.prototype3DId.generated_identifier}</span>.
          </div>
        </div>
      </div>
    </div>
  );
};
