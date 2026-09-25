import React, { useState, useMemo } from 'react';
import { Building, Floor, EnrichedProperty } from '../types';
import {
  List,
  Box,
  Plus,
  Edit3,
  CheckCircle2,
  Sparkles,
  MapPin,
  Layers,
  User,
  FileText,
  Building2,
  Search,
  Download,
  Database,
  Hash,
  ExternalLink,
  Compass,
  Eye,
  EyeOff,
  ChevronDown,
  Navigation,
} from 'lucide-react';
import { Pagination } from './Pagination';
import { parseCoordinatesOrUrl } from './LocationSearchHeader';
import { ThreeCanvas } from './ThreeCanvas';

interface PropertyDetailsViewProps {
  enrichedProperties: EnrichedProperty[];
  selectedPropertyId: string;
  onSelectProperty: (propertyId: string) => void;
  onCreateProperty: (payload: any) => Promise<void>;
  onRefresh: () => void;
  buildings?: Building[];
  allFloors?: Floor[];
}

export const PropertyDetailsView: React.FC<PropertyDetailsViewProps> = ({
  enrichedProperties,
  selectedPropertyId,
  onSelectProperty,
  onCreateProperty,
  onRefresh,
  buildings = [],
  allFloors = [],
}) => {
  // Collect all unique buildings from props and enriched properties
  const availableBuildings = useMemo(() => {
    const map = new Map<string, Building>();
    buildings.forEach((b) => {
      if (b.building_id) map.set(b.building_id, b);
      else if (b.id) map.set(b.id, b);
    });
    enrichedProperties.forEach((p) => {
      if (p.building?.building_id && !map.has(p.building.building_id)) {
        map.set(p.building.building_id, p.building);
      }
    });
    return Array.from(map.values());
  }, [buildings, enrichedProperties]);

  // Selected building state (defaults to matching selectedPropertyId or first building)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(() => {
    if (selectedPropertyId) {
      const match = enrichedProperties.find((p) => p.property.property_id === selectedPropertyId);
      if (match?.building?.building_id) return match.building.building_id;
    }
    return availableBuildings[0]?.building_id || 'B001';
  });

  // Search input for building access via Coordinates, Survey Number, or Google Maps URL
  const [buildingSearchInput, setBuildingSearchInput] = useState<string>('');
  const [searchFeedback, setSearchFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // 3D Model Preview toggle
  const [show3dPreview, setShow3dPreview] = useState<boolean>(false);

  // Unit creation modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Table filter states
  const [unitSearchTerm, setUnitSearchTerm] = useState<string>('');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  // Active Building Object
  const currentBuilding: Building | undefined = useMemo(() => {
    if (selectedBuildingId === 'ALL') return undefined;
    return availableBuildings.find((b) => b.building_id === selectedBuildingId || b.id === selectedBuildingId) || availableBuildings[0];
  }, [selectedBuildingId, availableBuildings]);

  // Floors for the active building
  const buildingFloors: Floor[] = useMemo(() => {
    if (!currentBuilding) return allFloors;
    const bldId = currentBuilding.building_id || currentBuilding.id;
    const flrs = allFloors.filter((f) => f.building_id === bldId || f.building_id === currentBuilding.id);
    if (flrs.length > 0) return flrs;

    // Fallback: derive floors from enrichedProperties
    const derivedMap = new Map<string, Floor>();
    enrichedProperties
      .filter((p) => p.building.building_id === bldId)
      .forEach((p) => {
        if (p.floor?.floor_id && !derivedMap.has(p.floor.floor_id)) {
          derivedMap.set(p.floor.floor_id, p.floor);
        }
      });
    return Array.from(derivedMap.values()).sort((a, b) => a.floor_number - b.floor_number);
  }, [currentBuilding, allFloors, enrichedProperties]);

  // Form states for new unit
  const [flatNumber, setFlatNumber] = useState('Flat 204');
  const [floorId, setFloorId] = useState(buildingFloors[0]?.floor_id || 'B001-F01');
  const [ownerName, setOwnerName] = useState('Assigned Titleholder');
  const [propertyType, setPropertyType] = useState('Residential Apartment (2BHK)');
  const [area, setArea] = useState(95);
  const [bottomHeight, setBottomHeight] = useState(3.0);
  const [topHeight, setTopHeight] = useState(6.0);
  const [width, setWidth] = useState(8.0);
  const [length, setLength] = useState(10.0);

  // Handle Search for Building via Coordinates, Survey Number, or Google Maps URL
  const handleBuildingLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const query = buildingSearchInput.trim();
    if (!query) {
      setSearchFeedback(null);
      return;
    }

    // 1. Check for GPS Coordinates or Google Maps Link
    const parsedCoords = parseCoordinatesOrUrl(query);
    if (parsedCoords) {
      let closest: Building | null = null;
      let minDistance = Infinity;

      for (const b of availableBuildings) {
        if (typeof b.latitude === 'number' && typeof b.longitude === 'number') {
          const dLat = (b.latitude - parsedCoords.lat) * 111320;
          const dLng = (b.longitude - parsedCoords.lng) * (40075000 * Math.cos((b.latitude * Math.PI) / 180) / 360);
          const dist = Math.hypot(dLat, dLng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = b;
          }
        }
      }

      if (closest && closest.building_id) {
        setSelectedBuildingId(closest.building_id);
        setFloorFilter('ALL');
        setCurrentPage(1);
        const distStr = minDistance < 1000 ? `${Math.round(minDistance)}m` : `${(minDistance / 1000).toFixed(2)}km`;
        setSearchFeedback({
          type: 'success',
          message: `Located nearest parcel via ${parsedCoords.source}: ${closest.building_name || `Building ${closest.building_id}`} (Survey No. ${closest.survey_number}) at ${closest.latitude.toFixed(4)}°, ${closest.longitude.toFixed(4)}° (${distStr} from queried location).`,
        });
        return;
      }
    }

    // 2. Check for Survey Number (case-insensitive)
    const norm = query.toLowerCase().replace(/[\s\-_/]/g, '');
    const matchedBySurvey = availableBuildings.find((b) => {
      const s = (b.survey_number || '').toLowerCase().replace(/[\s\-_/]/g, '');
      return s.includes(norm) || norm.includes(s);
    });

    if (matchedBySurvey && matchedBySurvey.building_id) {
      setSelectedBuildingId(matchedBySurvey.building_id);
      setFloorFilter('ALL');
      setCurrentPage(1);
      setSearchFeedback({
        type: 'success',
        message: `Found Survey Record: ${matchedBySurvey.building_name || `Building ${matchedBySurvey.building_id}`} &bull; Survey No. ${matchedBySurvey.survey_number} &bull; Locality: ${matchedBySurvey.address}`,
      });
      return;
    }

    // 3. Check for Building ID or Application Number or Building Name
    const matchedByMeta = availableBuildings.find((b) => {
      const id = (b.building_id || '').toLowerCase();
      const name = (b.building_name || b.name || '').toLowerCase();
      const app = (b.application_number || '').toLowerCase();
      const q = query.toLowerCase();
      return id.includes(q) || name.includes(q) || app.includes(q);
    });

    if (matchedByMeta && matchedByMeta.building_id) {
      setSelectedBuildingId(matchedByMeta.building_id);
      setFloorFilter('ALL');
      setCurrentPage(1);
      setSearchFeedback({
        type: 'success',
        message: `Selected: ${matchedByMeta.building_name || `Building ${matchedByMeta.building_id}`} (ID: ${matchedByMeta.building_id}) &bull; Survey No. ${matchedByMeta.survey_number}`,
      });
      return;
    }

    // Not found
    setSearchFeedback({
      type: 'error',
      message: `No building registered matching "${query}". You can enter GPS coordinates (e.g. 17.4433, 78.5410), Survey No. (e.g. 3127, SY-276/2B), or a Google Maps link.`,
    });
  };

  // Submit new unit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const targetBuildingId = currentBuilding?.building_id || 'B001';
    try {
      await onCreateProperty({
        building_id: targetBuildingId,
        floor_id: floorId,
        flat_number: flatNumber,
        area: Number(area),
        property_type: propertyType,
        owner_name: ownerName,
        bottom_height: Number(bottomHeight),
        top_height: Number(topHeight),
        width: Number(width),
        length: Number(length),
      });
      setShowCreateModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter properties according to selected building, floor, and search query
  const buildingScopedProperties = useMemo(() => {
    if (selectedBuildingId === 'ALL') return enrichedProperties;
    return enrichedProperties.filter(
      (p) => p.building.building_id === selectedBuildingId || p.building.id === selectedBuildingId
    );
  }, [selectedBuildingId, enrichedProperties]);

  const filteredList = useMemo(() => {
    return buildingScopedProperties.filter((p) => {
      const matchesFloor = floorFilter === 'ALL' || p.floor.floor_id === floorFilter;
      const q = unitSearchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        p.property.flat_number.toLowerCase().includes(q) ||
        p.prototype3DId.generated_identifier.toLowerCase().includes(q) ||
        (p.owners[0]?.owner.owner_name || '').toLowerCase().includes(q) ||
        p.building.building_id.toLowerCase().includes(q) ||
        p.building.survey_number.toLowerCase().includes(q);
      return matchesFloor && matchesSearch;
    });
  }, [buildingScopedProperties, floorFilter, unitSearchTerm]);

  const totalItems = filteredList.length;
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Export CSV for active view
  const exportCSV = () => {
    const headers = [
      'BUILDING_ID',
      'BUILDING_NAME',
      'FLOOR',
      'FLAT_NUMBER',
      'ULPIN_3D',
      'AREA_SQM',
      'OWNER_NAME',
      'SURVEY_NUMBER',
      'Z_BOTTOM_M',
      'Z_TOP_M',
      'PROPERTY_TYPE',
    ];
    const rows = filteredList.map((p) => [
      p.building.building_id,
      `"${p.building.building_name || p.building.name || `Building ${p.building.building_id}`}"`,
      `Floor ${p.floor.floor_number}`,
      p.property.flat_number,
      p.prototype3DId.generated_identifier,
      p.property.area,
      `"${p.owners[0]?.owner.owner_name || 'Unassigned'}"`,
      p.building.survey_number,
      p.verticalGeometry.bottom_height,
      p.verticalGeometry.top_height,
      `"${p.property.property_type}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileNameSuffix = currentBuilding ? `_${currentBuilding.building_id}_Survey_${currentBuilding.survey_number}` : '_All_Buildings';
    link.setAttribute('download', `Cadastral_Catalog${fileNameSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-[#1e3a8a] border border-blue-200 uppercase flex items-center gap-1 font-mono">
              <Database className="w-3 h-3 text-[#1e3a8a]" />
              Cadastral Relational Database
            </span>
            {currentBuilding ? (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-800 border border-slate-300 font-mono">
                Survey No. {currentBuilding.survey_number} &bull; {currentBuilding.building_name || `Building ${currentBuilding.building_id}`}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-800 border border-slate-300 font-mono">
                All Registered Cadastral Parcels ({availableBuildings.length} Buildings)
              </span>
            )}
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1">
            Cadastral Unit Catalog: Building, Floor, Flat, ULPIN, Area & Owner Records
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            Official municipal register of multi-storey vertical strata, unique 3D ULPIN identifiers, surveyed floor elevations, and statutory ownership titles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentBuilding && (
            <button
              onClick={() => setShow3dPreview(!show3dPreview)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer ${
                show3dPreview
                  ? 'bg-blue-50 text-[#1e3a8a] border-blue-300 font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Toggle 3D Cadastral Volumetric Model for this building"
            >
              {show3dPreview ? <EyeOff className="w-3.5 h-3.5 text-[#1e3a8a]" /> : <Eye className="w-3.5 h-3.5 text-[#1e3a8a]" />}
              <span>{show3dPreview ? 'Hide 3D View' : 'Inspect 3D Model'}</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Export Cadastral Database Table to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#1e3a8a]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Property Unit</span>
          </button>
        </div>
      </div>

      {/* Building Access & Universal Search Bar: Coordinates, Survey Number, Google Maps Link */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleBuildingLookup} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5 text-[#1e3a8a]" />
              <span>Access Any Building & Units (By Coordinates, Survey No., or Google Maps Link)</span>
            </label>
            <span className="text-[11px] text-slate-500 font-mono">
              {availableBuildings.length} registered buildings in cadastre
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={buildingSearchInput}
                onChange={(e) => setBuildingSearchInput(e.target.value)}
                placeholder="Enter Location Coordinates (e.g. 17.4433, 78.5410), Survey No. (e.g. 3127, SY-276/2B), or Google Maps URL..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Locate Building</span>
            </button>
          </div>
        </form>

        {/* Search Feedback Message */}
        {searchFeedback && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
              searchFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : searchFeedback.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span className="flex items-center gap-2 font-mono text-[11px]">
              {searchFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              <span>{searchFeedback.message}</span>
            </span>
            <button
              onClick={() => setSearchFeedback(null)}
              className="text-slate-400 hover:text-slate-700 px-1 py-0.5 text-xs font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Quick Select Building Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-mono text-slate-500 font-semibold mr-1">Switch Building:</span>
          {availableBuildings.map((bld) => {
            const isSelected = selectedBuildingId === bld.building_id;
            const unitCount = enrichedProperties.filter((p) => p.building.building_id === bld.building_id).length;
            const bName = bld.building_name || bld.name;
            return (
              <button
                key={bld.building_id || bld.id}
                type="button"
                onClick={() => {
                  setSelectedBuildingId(bld.building_id || '');
                  setFloorFilter('ALL');
                  setCurrentPage(1);
                  setSearchFeedback({
                    type: 'info',
                    message: `Switched to ${bName || `Building ${bld.building_id}`} &bull; Survey No. ${bld.survey_number} (${unitCount} registered units)`,
                  });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                  isSelected
                    ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] font-bold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 opacity-80" />
                <span>
                  {bld.building_id} ({bld.survey_number})
                </span>
                {bName && <span className="opacity-90 font-sans truncate max-w-[120px]">- {bName}</span>}
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] ${
                    isSelected ? 'bg-blue-900 text-blue-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {unitCount} units
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setSelectedBuildingId('ALL');
              setFloorFilter('ALL');
              setCurrentPage(1);
              setSearchFeedback({
                type: 'info',
                message: `Showing all ${enrichedProperties.length} units across all cadastral parcels.`,
              });
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              selectedBuildingId === 'ALL'
                ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] font-bold shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>All Parcels Unified ({enrichedProperties.length})</span>
          </button>
        </div>
      </div>

      {/* Building Dynamic Schema Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">BUILDING</span>
          <strong className="text-base font-bold text-slate-900 block mt-0.5 truncate">
            {currentBuilding?.building_id || 'All Parcels'}
          </strong>
          <span className="text-[10px] text-blue-800 font-mono truncate block">
            {currentBuilding ? `Survey ${currentBuilding.survey_number}` : `${availableBuildings.length} Buildings`}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">TOTAL FLOORS</span>
          <strong className="text-base font-bold text-slate-900 block mt-0.5">
            {currentBuilding ? `${currentBuilding.total_floors || currentBuilding.number_of_floors || 4} Floors` : 'Multi-Storey'}
          </strong>
          <span className="text-[10px] text-slate-500 font-mono">
            {currentBuilding ? `0.0m to ${currentBuilding.total_height || currentBuilding.total_building_height || 12}m` : 'Various'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">PARCEL UNITS</span>
          <strong className="text-base font-bold text-[#1e3a8a] block mt-0.5">
            {buildingScopedProperties.length} Units
          </strong>
          <span className="text-[10px] text-slate-500">Registered Strata</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">ULPIN SCHEME</span>
          <strong className="text-xs font-mono font-bold text-amber-800 block mt-1 truncate">
            {currentBuilding ? `TS-${currentBuilding.building_id}-FXX-UXXX` : 'TS-BXXX-FXX-UXXX'}
          </strong>
          <span className="text-[10px] text-[#059669] font-semibold">ISO 19152 LADM</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">TOTAL BUILT AREA</span>
          <strong className="text-base font-bold text-slate-900 block mt-0.5">
            {buildingScopedProperties.reduce((acc, p) => acc + (p.property.area || 0), 0)} sq.m
          </strong>
          <span className="text-[10px] text-slate-500">
            {currentBuilding ? `Plot: ${currentBuilding.plot_area} sq.m` : 'Cadastral Sum'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">LOCATION AREA</span>
          <strong className="text-xs font-bold text-slate-900 block mt-1 truncate">
            {currentBuilding?.village_or_locality || currentBuilding?.address || 'Hyderabad Region'}
          </strong>
          <span className="text-[10px] font-mono text-slate-600 block truncate">
            {currentBuilding ? `${currentBuilding.latitude?.toFixed(4)}°, ${currentBuilding.longitude?.toFixed(4)}°` : 'Multi-GPS'}
          </span>
        </div>
      </div>

      {/* Collapsible Interactive 3D Cadastral Volumetric Model Viewport */}
      {show3dPreview && currentBuilding && (
        <div className="rounded-xl border border-slate-300 overflow-hidden bg-white shadow-md">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1e3a8a]" />
              <span className="font-bold text-xs text-slate-900 font-mono">
                Interactive 3D Cadastral Mesh Inspection &bull; {currentBuilding.building_name || `Building ${currentBuilding.building_id}`} (Survey {currentBuilding.survey_number})
              </span>
            </div>
            <button
              onClick={() => setShow3dPreview(false)}
              className="text-xs font-mono text-slate-500 hover:text-slate-800"
            >
              Close Viewport &times;
            </button>
          </div>
          <div className="h-[420px] w-full relative bg-slate-100">
            <ThreeCanvas
              enrichedProperty={buildingScopedProperties[0] || null}
              activeBuilding={currentBuilding}
              allProperties={buildingScopedProperties}
              allFloors={buildingFloors}
              isSelected={true}
              viewMode="volumetric"
              showRuler={true}
              showUnderground={false}
            />
          </div>
          <div className="p-2 bg-white border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between px-3 font-mono">
            <span>Volumetric 3D Strata Mesh with ISO 19152 ULPIN geometry binding</span>
            <a
              href={`https://www.google.com/maps/@${currentBuilding.latitude},${currentBuilding.longitude},18z`}
              target="_blank"
              rel="noreferrer"
              className="text-[#1e3a8a] hover:underline flex items-center gap-1"
            >
              <span>View in Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Structured Modal / Form Card for Adding New Property Unit */}
      {showCreateModal && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold">
                <Box className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Generate New 3D Property Unit & ULPIN for {currentBuilding ? `${currentBuilding.building_name || currentBuilding.building_id} (Survey ${currentBuilding.survey_number})` : 'Building'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Assign vertical bounding box coordinates, floor assignment, and owner title
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5 cursor-pointer text-base"
            >
              &times;
            </button>
          </div>

          <fieldset className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-700 px-1 font-mono">
              1. Flat Unit & Ownership
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Flat / Unit Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Floor Level <span className="text-rose-600">*</span>
                </label>
                <select
                  value={floorId}
                  onChange={(e) => setFloorId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] cursor-pointer"
                >
                  {buildingFloors.length > 0 ? (
                    buildingFloors.map((fl) => (
                      <option key={fl.floor_id} value={fl.floor_id}>
                        {fl.floor_name || `Floor ${fl.floor_number}`} ({fl.bottom_height}m - {fl.top_height}m)
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="B001-F00">Ground Floor (0.0m - 3.0m)</option>
                      <option value="B001-F01">Floor 1 (3.0m - 6.0m)</option>
                      <option value="B001-F02">Floor 2 (6.0m - 9.0m)</option>
                      <option value="B001-F03">Floor 3 (9.0m - 12.0m)</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-700 px-1 font-mono">
              2. Volumetric Geometry (Z-Bounds & Area)
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Area (sq.m) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Z Bottom (m) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={bottomHeight}
                  onChange={(e) => setBottomHeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Z Top (m) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={topHeight}
                  onChange={(e) => setTopHeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Width &times; Length (m)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-center"
                  />
                  <span>&times;</span>
                  <input
                    type="number"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-center"
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Generating 3D ULPIN...' : 'Generate 3D Property Unit'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Main Required Cadastral Database Table */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter & Search Controls */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#1e3a8a]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
              Cadastral Records Table ({filteredList.length} of {buildingScopedProperties.length} Units in View)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search flat, owner, ULPIN..."
                value={unitSearchTerm}
                onChange={(e) => {
                  setUnitSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#1e3a8a] w-48 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium text-[11px] font-mono">Floor:</span>
              <select
                value={floorFilter}
                onChange={(e) => {
                  setFloorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#1e3a8a] cursor-pointer"
              >
                <option value="ALL">All Levels</option>
                {buildingFloors.length > 0 ? (
                  buildingFloors.map((fl) => (
                    <option key={fl.floor_id} value={fl.floor_id}>
                      {fl.floor_name || `Floor ${fl.floor_number}`} ({fl.bottom_height}m - {fl.top_height}m)
                    </option>
                  ))
                ) : (
                  <>
                    <option value="B001-F00">Ground Floor</option>
                    <option value="B001-F01">Floor 1</option>
                    <option value="B001-F02">Floor 2</option>
                    <option value="B001-F03">Floor 3</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Building & Parcel</th>
                <th className="px-4 py-2.5">Floor Level</th>
                <th className="px-4 py-2.5">Unit / Flat</th>
                <th className="px-4 py-2.5">Standard 3D ULPIN</th>
                <th className="px-4 py-2.5">Area (sq.m)</th>
                <th className="px-4 py-2.5">Owner Title</th>
                <th className="px-4 py-2.5">Survey No.</th>
                <th className="px-4 py-2.5">Z-Elevation Bounds</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-mono">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 font-mono">
                    No cadastral units found matching criteria for this building.
                  </td>
                </tr>
              ) : (
                paginatedList.map((p) => {
                  const isCurrent = p.property.property_id === selectedPropertyId;
                  const ownerNameDisplay = p.owners[0]?.owner.owner_name || 'Unassigned';
                  return (
                    <tr
                      key={p.property.id || p.property.property_id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCurrent ? 'bg-blue-50/60 font-semibold' : ''
                      }`}
                    >
                      {/* BUILDING */}
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#1e3a8a]" />
                          <span>{p.building.building_id}</span>
                          {p.building.building_name && (
                            <span className="font-normal font-sans text-slate-500 text-[11px] truncate max-w-[120px]">
                              ({p.building.building_name})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* FLOOR */}
                      <td className="px-4 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                          {p.floor.floor_name || `Floor ${p.floor.floor_number}`}
                        </span>
                      </td>

                      {/* FLAT */}
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {p.property.flat_number}
                      </td>

                      {/* ULPIN */}
                      <td className="px-4 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded bg-blue-50 text-[#1e3a8a] border border-blue-200 text-[11px] font-bold select-all inline-block"
                          title="Statutory ISO 19152 3D ULPIN"
                        >
                          {p.prototype3DId.generated_identifier}
                        </span>
                      </td>

                      {/* AREA */}
                      <td className="px-4 py-2.5 text-slate-800">
                        {p.property.area} sq.m
                      </td>

                      {/* OWNER */}
                      <td className="px-4 py-2.5 font-sans font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{ownerNameDisplay}</span>
                        </div>
                      </td>

                      {/* SURVEY NO */}
                      <td className="px-4 py-2.5 text-slate-600">
                        {p.building.survey_number}
                      </td>

                      {/* Z-BOUNDS */}
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {p.verticalGeometry.bottom_height}m &rarr; {p.verticalGeometry.top_height}m
                      </td>

                      {/* ACTION */}
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProperty(p.property.property_id);
                            if (p.building.building_id) {
                              setSelectedBuildingId(p.building.building_id);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-[#1e3a8a] text-white'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isCurrent ? 'Active Unit' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalItems > pageSize && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
