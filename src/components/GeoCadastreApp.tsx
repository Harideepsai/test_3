import React, { useState, useEffect, useCallback } from 'react';
import {
  Building,
  EnrichedProperty,
  Floor,
  PropertyRecord,
  SpatialLookupResult,
} from '../types';
import { cadastreService } from '../services/cadastreService';
import { LocationSearchHeader } from './LocationSearchHeader';
import { ModelIngestionModal } from './ModelIngestionModal';
import { ThreeCanvas } from './ThreeCanvas';
import { PropertyInfoPanel } from './PropertyInfoPanel';
import { LeafletMap } from './LeafletMap';
import {
  Box,
  Layers,
  MapPin,
  Sliders,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { isSupabaseConfigured, SUPABASE_URL } from '../supabaseClient';

export const GeoCadastreApp: React.FC = () => {
  // 1. Initial State: BLANK SLATE (no pre-loaded building by default)
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchRadius, setSearchRadius] = useState<number>(25);

  // Active Spatial Query State
  const [activeCoordinates, setActiveCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [spatialLookupResult, setSpatialLookupResult] = useState<SpatialLookupResult | null>(null);
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null);
  const [allProperties, setAllProperties] = useState<EnrichedProperty[]>([]);
  const [allFloors, setAllFloors] = useState<Floor[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  // 3D Visual Controls
  const [explodedOffset, setExplodedOffset] = useState<number>(0);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'volumetric' | 'xray' | 'wireframe'>('volumetric');

  // Ingestion Modal State
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<{
    type: 'success' | 'warning' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Execute Spatial Query using bounding radius (25m ST_DWithin)
  const handleCoordinateSearch = useCallback(
    async (coords: { lat: number; lng: number }, radiusMeters: number = 25) => {
      setIsSearching(true);
      setActiveCoordinates(coords);
      setHasSearched(true);
      setSearchFeedback(null);

      try {
        const result = await cadastreService.lookupBuildingByCoordinates(
          coords.lat,
          coords.lng,
          radiusMeters
        );
        setSpatialLookupResult(result);

        if (result.found && result.building) {
          setActiveBuilding(result.building);
          const props = result.allProperties || result.properties || [];
          const flrs = result.allFloors || result.floors || [];
          setAllProperties(props);
          setAllFloors(flrs);

          if (props.length > 0) {
            setSelectedPropertyId(props[0].property.property_id);
          }

          setSearchFeedback({
            type: 'success',
            message: `Spatial Match Found: ${result.building.building_id || 'Building'} (Survey No: ${
              result.building.survey_number || 'Registered'
            }) within ${result.distanceMeters?.toFixed(1) || 0}m of query point.`,
          });
        } else {
          // No building found within bounding radius: render empty illuminated parcel
          setActiveBuilding(null);
          setAllProperties([]);
          setAllFloors([]);
          setSelectedPropertyId('');
          setSearchFeedback({
            type: 'warning',
            message: `No registered 3D building within ${radiusMeters}m of [${coords.lat.toFixed(
              4
            )}, ${coords.lng.toFixed(4)}]. Illuminated parcel footprint active.`,
          });
        }
      } catch (err: any) {
        console.error('Error during spatial lookup:', err);
        setSearchFeedback({
          type: 'error',
          message: `Spatial query error: ${err.message || 'Failed to query cadastre database'}`,
        });
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // When a new building is registered from the ingestion modal
  const handleIngestionSuccess = useCallback(
    (data: {
      building: Building;
      allFloors: Floor[];
      enrichedProperties?: EnrichedProperty[];
    }) => {
      const props = data.enrichedProperties || [];
      setActiveBuilding(data.building);
      setAllFloors(data.allFloors);
      setAllProperties(props);

      if (props.length > 0) {
        setSelectedPropertyId(props[0].property.property_id);
      }

      // Explicitly update spatial lookup result so isEmptyParcel is false and ThreeCanvas extrudes the 3D model
      setSpatialLookupResult({
        found: true,
        searchCoordinates: { lat: data.building.latitude, lng: data.building.longitude },
        searchRadiusMeters: searchRadius,
        building: data.building,
        allProperties: props,
        properties: props,
        allFloors: data.allFloors,
        floors: data.allFloors,
        enrichedProperty: props[0] || null,
        distanceMeters: 0,
      });

      setActiveCoordinates({ lat: data.building.latitude, lng: data.building.longitude });

      setSearchFeedback({
        type: 'success',
        message: `Successfully registered and extruded 3D Building ${data.building.building_id} (${data.building.survey_number}) with ${props.length} cadastral units!`,
      });
    },
    [searchRadius]
  );

  const selectedProperty =
    allProperties.find((p) => p.property.property_id === selectedPropertyId) ||
    allProperties[0] ||
    null;

  const isEmptyParcel = hasSearched && (!spatialLookupResult?.found || !activeBuilding);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* 1. Global Coordinates Search Header */}
      <LocationSearchHeader
        onSearch={handleCoordinateSearch}
        isSearching={isSearching}
        currentCoords={activeCoordinates}
        searchRadius={searchRadius}
        onSearchRadiusChange={setSearchRadius}
        onOpenIngestionModal={() => setIsIngestionModalOpen(true)}
        hasActiveBuilding={!!activeBuilding}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Feedback / Notification Bar */}
        {searchFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 shadow-xs ${
              searchFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : searchFeedback.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {searchFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{searchFeedback.message}</span>
            </div>

            {isEmptyParcel && (
              <button
                id="btn-trigger-ingestion-feedback"
                onClick={() => setIsIngestionModalOpen(true)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                + Register 3D Building Now
              </button>
            )}
          </div>
        )}

        {/* Blank Slate Welcome Hero (Visible only before any coordinate search) */}
        {!hasSearched && (
          <div className="p-8 rounded-2xl bg-gradient-to-br from-white via-cyan-50/40 to-slate-50 border border-cyan-200 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100 border border-cyan-300 text-cyan-700 flex items-center justify-center mx-auto shadow-xs">
              <Compass className="w-7 h-7" />
            </div>
            <div className="max-w-xl mx-auto space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Welcome to GeoCadastre 3D PostGIS Explorer
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter GPS Coordinates (e.g., <strong className="text-cyan-700 font-mono">17.4485, 78.3748</strong>) or paste a Google Maps link above to execute spatial queries with a 25m bounding radius. Unmapped parcels allow instantaneous 3D registration via 2D blueprint extrusion, custom .glb ingestion, or parametric building.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                id="btn-demo-cyber-towers"
                onClick={() => handleCoordinateSearch({ lat: 17.4485, lng: 78.3748 }, searchRadius)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>🏢 Load Cyber Towers Cadastre (17.4485, 78.3748)</span>
              </button>
              <button
                id="btn-demo-unmapped-parcel"
                onClick={() => handleCoordinateSearch({ lat: 17.4435, lng: 78.5410 }, searchRadius)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>📍 Inspect Unmapped Parcel (17.4435, 78.5410)</span>
              </button>
            </div>
          </div>
        )}

        {/* Units Selector Matrix Bar (only visible when a building with units is active) */}
        {activeBuilding && allProperties.length > 0 && (
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Layers className="w-3.5 h-3.5 text-cyan-600" />
                Apartment Units ({allProperties.length} Total Units) &bull; Prototype 3D Property IDs
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Click any card or 3D block to inspect vertical bounds
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {allProperties.map((p) => {
                const isCurrent = p.property.property_id === selectedPropertyId;
                const isGround = p.floor.floor_number === 0;
                return (
                  <button
                    key={p.property.property_id}
                    onClick={() => setSelectedPropertyId(p.property.property_id)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-50 border-cyan-500 shadow-xs ring-1 ring-cyan-400'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase font-mono ${
                          isGround
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        F{p.floor.floor_number}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {p.verticalGeometry.bottom_height}–{p.verticalGeometry.top_height}m
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

        {/* DUAL-VIEW INTERFACE: 3D Viewport on one side, Cadastral Panel on the other */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: 3D WebGL Canvas */}
          <div className="lg:col-span-7 h-[540px] xl:h-[600px] flex flex-col">
            <ThreeCanvas
              enrichedProperty={selectedProperty}
              activeBuilding={activeBuilding}
              allProperties={allProperties}
              allFloors={allFloors}
              isSelected={true}
              onSelectProperty={(id) => setSelectedPropertyId(id)}
              explodedOffset={explodedOffset}
              onExplodedOffsetChange={setExplodedOffset}
              viewMode={viewMode}
              showRuler={showRuler}
              onToggleRuler={() => setShowRuler(!showRuler)}
              isInitialBlank={!hasSearched}
              isEmptyParcel={isEmptyParcel}
              unmappedCoordinates={activeCoordinates}
              onOpenIngestionModal={() => setIsIngestionModalOpen(true)}
            />
          </div>

          {/* Right Column: Structured Cadastral & Ownership Record Side Pane */}
          <div className="lg:col-span-5 h-[540px] xl:h-[600px] overflow-y-auto pr-1">
            {selectedProperty ? (
              <PropertyInfoPanel
                enrichedProperty={selectedProperty}
                onUpdateProperty={async () => {}}
              />
            ) : (
              <div className="h-full bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 font-mono">
                  {isEmptyParcel
                    ? 'Unregistered Cadastral Parcel'
                    : 'Awaiting Parcel Selection'}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  {isEmptyParcel
                    ? 'This location does not have a registered 3D building yet. Use the button below to register, extrude, or upload a 3D model.'
                    : 'Search coordinates above or click a demo location to load cadastral ownership and vertical geometry.'}
                </p>
                {isEmptyParcel && (
                  <button
                    id="btn-register-cadastre-side"
                    onClick={() => setIsIngestionModalOpen(true)}
                    className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Register 3D Building</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SYNCHRONIZED 2D LEAFLET MAP (Below the dual pane) */}
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-600" />
              <span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">
                Synchronized 2D Cadastral GIS & PostGIS Spatial View
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-300 font-mono font-semibold">
                Radius: {searchRadius}m (ST_DWithin)
              </span>
            </div>

            {activeCoordinates && (
              <div className="text-xs text-slate-500 font-mono">
                GPS: <span className="text-cyan-700 font-bold">{activeCoordinates.lat.toFixed(5)}, {activeCoordinates.lng.toFixed(5)}</span>
              </div>
            )}
          </div>

          <div className="h-[340px] w-full relative">
            <LeafletMap
              building={activeBuilding}
              location={
                activeCoordinates
                  ? {
                      id: 'LOC-ACTIVE',
                      location_id: 'LOC-ACTIVE',
                      building_id: activeBuilding?.id || 'B001',
                      latitude: activeCoordinates.lat,
                      longitude: activeCoordinates.lng,
                      address: activeBuilding?.address || 'Searched Parcel Point',
                      created_at: new Date().toISOString(),
                    }
                  : null
              }
              isSelected={true}
              isInitialBlank={!hasSearched}
              isEmptyParcel={isEmptyParcel}
              searchedCoords={activeCoordinates}
              searchRadius={searchRadius}
              onOpenIngestionModal={() => setIsIngestionModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Multi-Option 3D Model Ingestion Modal */}
      {isIngestionModalOpen && activeCoordinates && (
        <ModelIngestionModal
          isOpen={isIngestionModalOpen}
          onClose={() => setIsIngestionModalOpen(false)}
          coordinates={activeCoordinates}
          onSuccess={handleIngestionSuccess}
        />
      )}
    </div>
  );
};
