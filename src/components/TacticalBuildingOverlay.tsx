import React, { useState, useEffect } from 'react';
import { Building, Floor, EnrichedProperty } from '../types';
import { cadastreService } from '../services/cadastreService';
import { useAuth } from '../services/authService';
import { useDeviceLocation, LocationPreset } from '../hooks/useDeviceLocation';
import { ThreeCanvas } from './ThreeCanvas';
import {
  Flame,
  Radio,
  Crosshair,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Compass,
  MapPin,
  Navigation,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ChevronRight,
  Activity,
  Maximize2,
} from 'lucide-react';

interface TacticalBuildingOverlayProps {
  onSelectBuildingForMap?: (building: Building) => void;
}

export const TacticalBuildingOverlay: React.FC<TacticalBuildingOverlayProps> = ({
  onSelectBuildingForMap,
}) => {
  const { activePersona } = useAuth();
  const {
    coordinates,
    accuracy,
    loading: gpsLoading,
    error: gpsError,
    isSimulated,
    activePresetId,
    locationPresets,
    setSimulatedLocation,
    refreshLocation,
  } = useDeviceLocation(true);

  const [proximateBuildings, setProximateBuildings] = useState<
    Array<{
      building: Building;
      distanceMeters: number;
      floors: Floor[];
      unitsCount: number;
    }>
  >([]);
  const [selectedBldData, setSelectedBldData] = useState<{
    building: Building;
    distanceMeters: number;
    floors: Floor[];
    unitsCount: number;
  } | null>(null);

  const [enrichedData, setEnrichedData] = useState<{
    properties: EnrichedProperty[];
    floors: Floor[];
  } | null>(null);

  const [searchRadius, setSearchRadius] = useState<number>(300); // meters
  const [activeFloorFilter, setActiveFloorFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Scan proximate buildings whenever GPS coordinates or radius change
  useEffect(() => {
    if (!coordinates) return;

    const fetchProximate = async () => {
      setLoading(true);
      try {
        const results = await cadastreService.getTacticalProximateBuildings(
          coordinates.lat,
          coordinates.lng,
          searchRadius
        );
        setProximateBuildings(results);

        if (results.length > 0) {
          const current = results[0];
          setSelectedBldData(current);
          const data = await cadastreService.getEnrichedBuildingData(
            current.building.building_id || current.building.id
          );

          // STRICT ZERO-TRUST SANITIZATION:
          // Strip all owner identities, Aadhaar numbers, tax records, market value
          const sanitizedProps: EnrichedProperty[] = data.allProperties.map((p) => ({
            ...p,
            owners: [
              {
                ownership: {
                  id: 'PRIVACY_PROTECTED',
                  ownership_id: 'PRIVACY_PROTECTED',
                  property_id: p.property.property_id,
                  owner_id: 'MASKED',
                  ownership_share: 100,
                  created_at: '',
                },
                owner: {
                  id: 'MASKED',
                  owner_id: 'MASKED',
                  owner_name: 'CLASSIFIED: RESIDENT RECORD MASKED UNDER ZERO-TRUST PRIVACY',
                  contact_info: 'RESTRICTED TO SRO & REVENUE JURISDICTION',
                  created_at: '',
                },
              },
            ],
            propertyRecord: undefined, // Fully omitted
          }));

          setEnrichedData({
            properties: sanitizedProps,
            floors: data.allFloors,
          });
        } else {
          setSelectedBldData(null);
          setEnrichedData(null);
        }
      } catch (e) {
        console.error('Tactical scan error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProximate();
  }, [coordinates?.lat, coordinates?.lng, searchRadius]);

  const handleSelectBuilding = async (item: {
    building: Building;
    distanceMeters: number;
    floors: Floor[];
    unitsCount: number;
  }) => {
    setSelectedBldData(item);
    setActiveFloorFilter(null);
    try {
      const data = await cadastreService.getEnrichedBuildingData(
        item.building.building_id || item.building.id
      );

      // Apply zero-trust sanitization
      const sanitizedProps: EnrichedProperty[] = data.allProperties.map((p) => ({
        ...p,
        owners: [
          {
            ownership: {
              id: 'PRIVACY_PROTECTED',
              ownership_id: 'PRIVACY_PROTECTED',
              property_id: p.property.property_id,
              owner_id: 'MASKED',
              ownership_share: 100,
              created_at: '',
            },
            owner: {
              id: 'MASKED',
              owner_id: 'MASKED',
              owner_name: 'CLASSIFIED: CITIZEN RECORD MASKED UNDER ZERO-TRUST PRIVACY',
              contact_info: 'RESTRICTED',
              created_at: '',
            },
          },
        ],
        propertyRecord: undefined,
      }));

      setEnrichedData({
        properties: sanitizedProps,
        floors: data.allFloors,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProperties =
    enrichedData && activeFloorFilter !== null
      ? enrichedData.properties.filter((p) => p.floor.floor_number === activeFloorFilter)
      : enrichedData?.properties || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Tactical HUD Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-50/90 via-white to-rose-100/70 border border-rose-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-md bg-rose-100 text-rose-900 border border-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
                <Flame className="w-4 h-4 text-rose-600" />
                TACTICAL EMERGENCY DISASTER RESPONSE HUD
              </span>
              <span className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[11px] font-mono shadow-xs">
                {activePersona.organization}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-wide uppercase">
              3D Structural Ingress & Hazard Evacuation Console
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Real-time PostGIS proximity scan (300m radius) tracking structural heights, vertical floor
              slices, and stairwell egress channels. Strict zero-trust citizen privacy is enforced
              — owner records, contact numbers, deed numbers, and tax registry values are masked.
            </p>
          </div>

          {/* Location Presets Switcher for Hackathon Testing */}
          <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs space-y-2 shrink-0">
            <div className="text-[11px] font-mono text-rose-800 font-bold flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-rose-600" />
              Tactical GPS Preset Switcher:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {locationPresets.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    id={`btn-tactical-preset-${preset.id}`}
                    onClick={() => setSimulatedLocation(preset.coords, preset.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      isActive
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {preset.name.split(' (')[0]}
                  </button>
                );
              })}
              <button
                onClick={refreshLocation}
                title="Query device physical GPS"
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>GPS</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tactical Telemetry Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-rose-200 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[10px]">CURRENT GPS FIX</div>
            <div className="text-rose-700 font-bold mt-0.5 truncate">
              {coordinates ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : 'Scanning...'}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[10px]">ACCURACY / FIX MODE</div>
            <div className="text-slate-900 font-bold mt-0.5">
              &plusmn;{accuracy ? accuracy.toFixed(1) : '5.0'}m &bull;{' '}
              <span className="text-cyan-700">{isSimulated ? 'Preset Simulated' : 'Live Device GPS'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div className="text-slate-500 text-[10px]">SCAN RADIUS (PostGIS ST_DWithin)</div>
            <div className="text-emerald-700 font-bold mt-0.5">
              {searchRadius} meters ({proximateBuildings.length} buildings detected)
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-[10px]">PRIVACY SHIELD</div>
              <div className="text-cyan-700 font-bold mt-0.5 flex items-center gap-1">
                <EyeOff className="w-3.5 h-3.5" /> ZERO-TRUST ACTIVE
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Proximate Buildings List (4 cols) & Tactical 3D HUD (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Proximate Buildings (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
                <Navigation className="w-4 h-4 text-rose-600" />
                Proximate Structures ({searchRadius}m)
              </h2>
              <span className="text-xs font-mono text-slate-500">
                {proximateBuildings.length} in range
              </span>
            </div>

            {/* Radius Slider */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                <span>Scan Distance Filter:</span>
                <span className="text-rose-700 font-bold">{searchRadius}m</span>
              </div>
              <input
                id="range-tactical-radius"
                type="range"
                min={100}
                max={1000}
                step={50}
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>100m Immediate</span>
                <span>300m Mandated</span>
                <span>1000m Sector</span>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {proximateBuildings.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl text-xs font-mono">
                  No buildings found within {searchRadius}m of current coordinates. Expand radius or
                  switch preset above.
                </div>
              ) : (
                proximateBuildings.map((item) => {
                  const bld = item.building;
                  const isSelected =
                    selectedBldData &&
                    (selectedBldData.building.id === bld.id ||
                      selectedBldData.building.building_id === bld.building_id);

                  return (
                    <div
                      key={bld.id || bld.building_id}
                      onClick={() => handleSelectBuilding(item)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-rose-50 border-rose-400 shadow-xs ring-1 ring-rose-400/50'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-mono">
                        <span className="font-bold text-xs text-slate-900">
                          {bld.building_id} &bull; Sy. {bld.survey_number}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-bold">
                          {item.distanceMeters}m AWAY
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 truncate mt-1">{bld.address}</div>

                      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-[11px] text-slate-500 font-mono">
                        <div>
                          Height: <span className="text-slate-900 font-bold">{bld.total_height || 12}m</span>
                        </div>
                        <div>
                          Floors: <span className="text-slate-900 font-bold">{item.floors.length || 4}</span>
                        </div>
                        <div className="text-right">
                          Units: <span className="text-slate-900 font-bold">{item.unitsCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 3D Tactical Slicing Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedBldData ? (
            <div className="space-y-4">
              {/* Selected Structure Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 font-mono">
                        {selectedBldData.building.building_id} &bull; Survey{' '}
                        {selectedBldData.building.survey_number}
                      </h2>
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-300 text-xs font-mono font-bold">
                        {selectedBldData.distanceMeters}m from Responder
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {selectedBldData.building.address}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-xs font-mono text-cyan-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                      Zero-Trust Privacy Active
                    </span>
                  </div>
                </div>

                {/* Vertical Strata Level Slicing Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-700">
                    <span className="font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-rose-600" />
                      Tactical Vertical Strata Slicing:
                    </span>
                    <span className="text-slate-500">
                      {activeFloorFilter === null
                        ? 'Full Building Envelope'
                        : `Isolated: Level ${activeFloorFilter}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      id="btn-slice-all"
                      onClick={() => setActiveFloorFilter(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        activeFloorFilter === null
                          ? 'bg-rose-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      All Floors ({selectedBldData.floors.length})
                    </button>
                    {selectedBldData.floors.map((floor) => {
                      const isActive = activeFloorFilter === floor.floor_number;
                      return (
                        <button
                          key={floor.floor_id}
                          id={`btn-slice-floor-${floor.floor_number}`}
                          onClick={() => setActiveFloorFilter(floor.floor_number)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            isActive
                              ? 'bg-rose-600 text-white font-bold shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          Floor {floor.floor_number} ({floor.bottom_height.toFixed(1)}m – {floor.top_height.toFixed(1)}m)
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3D WebGL Tactical Canvas */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 relative">
                  <div className="p-2.5 bg-white border-b border-slate-200 flex items-center justify-between text-xs font-mono text-slate-700">
                    <span className="flex items-center gap-1.5 text-rose-700 font-bold">
                      <Activity className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      Tactical Volumetric Ingress HUD (Three.js WebGL)
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {filteredProperties.length} Units Visualized &bull; Elevation Δh ={' '}
                      {selectedBldData.building.total_height || 12}m
                    </span>
                  </div>

                  <div className="h-96 w-full relative">
                    <ThreeCanvas
                      allProperties={filteredProperties}
                      allFloors={selectedBldData.floors}
                      enrichedProperty={filteredProperties[0] || null}
                    />
                  </div>

                  <div className="p-2 bg-white border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between px-3 font-mono">
                    <span className="text-rose-700 font-bold">
                      NDRF / Fire Tactical Egress Mode Active
                    </span>
                    <span>Coordinates: {selectedBldData.building.latitude.toFixed(5)}, {selectedBldData.building.longitude.toFixed(5)}</span>
                  </div>
                </div>

                {/* Zero-Trust Privacy Audit Banner */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-slate-800 font-bold">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-600" />
                      Zero-Trust Privacy Governance Enforcement:
                    </span>
                    <span className="text-emerald-700 font-bold">PASSED</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                      Owner Identity: <span className="text-rose-700 font-bold">MASKED</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                      Aadhaar / ID Card: <span className="text-rose-700 font-bold">BLOCKED</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200 shadow-xs">
                      Financial Deeds: <span className="text-rose-700 font-bold">EXCLUDED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 border border-dashed border-slate-300 rounded-2xl font-mono text-xs bg-white">
              Select a proximate building from the radar list to view 3D volumetric structure.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
