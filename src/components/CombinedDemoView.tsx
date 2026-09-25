import React, { useState, useEffect, useCallback } from 'react';
import { EnrichedProperty, Floor, Building, Location, SpatialLookupResult } from '../types';
import { ThreeCanvas } from './ThreeCanvas';
import { PropertyInfoPanel } from './PropertyInfoPanel';
import { LeafletMap } from './LeafletMap';
import { cadastreService } from '../services/cadastreService';
import { parseCoordinatesOrUrl } from './LocationSearchHeader';
import { api } from '../services/api';
import {
  Box,
  Layers,
  MapPin,
  Sparkles,
  Info,
  Building2,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Filter,
  Search,
  Crosshair,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Navigation,
  Compass,
  FileCheck2,
  Check,
  ExternalLink,
} from 'lucide-react';

interface CombinedDemoViewProps {
  enrichedProperty: EnrichedProperty | null;
  allProperties: EnrichedProperty[];
  allFloors: Floor[];
  selectedPropertyId: string;
  onSelectProperty: (propertyId: string) => void;
  onUpdateProperty: (updatedFields: any) => Promise<void>;
  onRefresh: () => void;
}

export const CombinedDemoView: React.FC<CombinedDemoViewProps> = ({
  enrichedProperty,
  allProperties,
  allFloors,
  selectedPropertyId,
  onSelectProperty,
  onUpdateProperty,
  onRefresh,
}) => {
  // 3D Canvas Controls
  const [explodedOffset, setExplodedOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'volumetric' | 'xray' | 'wireframe'>('volumetric');
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [filterFloor, setFilterFloor] = useState<number | 'ALL'>('ALL');

  // Helper to strictly isolate flats belonging ONLY to the displaying building
  const getFlatsForBuilding = useCallback(
    (properties: EnrichedProperty[], bld: Building | null): EnrichedProperty[] => {
      if (!bld) return properties;
      const bldId = bld.building_id || bld.id;
      if (!bldId) return properties;
      const filtered = properties.filter((p) => {
        const propBldId =
          p.building?.building_id ||
          p.building?.id ||
          p.property?.building_id ||
          p.floor?.building_id ||
          p.location?.building_id;
        return propBldId === bldId;
      });
      return filtered.length > 0 ? filtered : properties;
    },
    []
  );

  const getFloorsForBuilding = useCallback(
    (floors: Floor[], bld: Building | null): Floor[] => {
      if (!bld) return floors;
      const bldId = bld.building_id || bld.id;
      if (!bldId) return floors;
      const filtered = floors.filter((f) => f.building_id === bldId);
      return filtered.length > 0 ? filtered : floors;
    },
    []
  );

  // Active Building & Dynamic Property State
  const initialLat = enrichedProperty?.location?.latitude ?? enrichedProperty?.building?.latitude ?? 17.443372;
  const initialLng = enrichedProperty?.location?.longitude ?? enrichedProperty?.building?.longitude ?? 78.541003;

  const initialBuilding = enrichedProperty?.building || allProperties[0]?.building || null;
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(initialBuilding);
  const [displayProperties, setDisplayProperties] = useState<EnrichedProperty[]>(() =>
    getFlatsForBuilding(allProperties, initialBuilding)
  );
  const [displayFloors, setDisplayFloors] = useState<Floor[]>(() =>
    getFloorsForBuilding(allFloors, initialBuilding)
  );
  const [currentSelectedId, setCurrentSelectedId] = useState<string>(selectedPropertyId);

  // Coordinate Search State
  const [coordinateInput, setCoordinateInput] = useState<string>(`${initialLat.toFixed(5)}, ${initialLng.toFixed(5)}`);
  const [manualLat, setManualLat] = useState<string>(initialLat.toFixed(5));
  const [manualLng, setManualLng] = useState<string>(initialLng.toFixed(5));
  const [showManualFields, setShowManualFields] = useState<boolean>(false);
  const [searchRadius, setSearchRadius] = useState<number>(25);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Spatial Lookup Result & Parcel Pinpoint State
  const [searchedCoords, setSearchedCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [isEmptyParcel, setIsEmptyParcel] = useState<boolean>(false);
  const [searchStatus, setSearchStatus] = useState<{
    type: 'idle' | 'success' | 'empty' | 'sample';
    message: string;
    buildingName?: string;
    surveyNumber?: string;
    distance?: number;
  }>({
    type: 'idle',
    message: 'Displaying initial cadastral demonstration building.',
  });

  // Keep displayProperties and displayFloors in sync with props when not overridden by custom coordinate search
  useEffect(() => {
    if (searchStatus.type === 'idle') {
      const bld = enrichedProperty?.building || allProperties[0]?.building || null;
      setActiveBuilding(bld);
      const bldProps = getFlatsForBuilding(allProperties, bld);
      const bldFloors = getFloorsForBuilding(allFloors, bld);

      setDisplayProperties(bldProps);
      setDisplayFloors(bldFloors);
      if (bldProps.length > 0 && !bldProps.some((p) => p.property.property_id === currentSelectedId)) {
        setCurrentSelectedId(bldProps[0].property.property_id);
      }
    }
  }, [allProperties, allFloors, enrichedProperty, searchStatus.type, getFlatsForBuilding, getFloorsForBuilding]);

  // Derived current active property
  const currentActiveProperty: EnrichedProperty | null =
    displayProperties.find((p) => p.property.property_id === currentSelectedId) ||
    displayProperties[0] ||
    enrichedProperty;

  // Execute Coordinate Lookup and Display Corresponding 3D Model
  const executeCoordinateSearch = useCallback(
    async (lat: number, lng: number, radius: number = searchRadius) => {
      setIsSearching(true);
      setSearchError(null);
      setGpsNotice(null);
      setSearchedCoords({ lat, lng });
      setCoordinateInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setManualLat(lat.toFixed(5));
      setManualLng(lng.toFixed(5));

      try {
        const result: SpatialLookupResult = await cadastreService.lookupBuildingByCoordinates(lat, lng, radius);

        if (result.found && result.building) {
          // Registered 3D Building Located within radius
          const bld = result.building;
          const rawProps = result.allProperties && result.allProperties.length > 0 ? result.allProperties : allProperties;
          const rawFloors = result.allFloors && result.allFloors.length > 0 ? result.allFloors : allFloors;
          const foundProperties = getFlatsForBuilding(rawProps, bld);
          const foundFloors = getFloorsForBuilding(rawFloors, bld);

          setActiveBuilding(bld);
          setDisplayProperties(foundProperties);
          setDisplayFloors(foundFloors);
          setIsEmptyParcel(false);
          setFilterFloor('ALL');

          if (foundProperties.length > 0) {
            const firstId = foundProperties[0].property.property_id;
            setCurrentSelectedId(firstId);
            onSelectProperty(firstId);
          }

          setSearchStatus({
            type: 'success',
            message: `Official 3D Cadastral Model located for Survey No. ${bld.survey_number}`,
            buildingName: bld.building_name || bld.name || `Building ${bld.building_id || bld.id}`,
            surveyNumber: bld.survey_number,
            distance: result.distanceMeters ?? 0.0,
          });
        } else if (result.nearestAvailableBuilding && result.nearestDistanceMeters && result.nearestDistanceMeters <= 350) {
          // Near-match (within 350m buffer) - auto-load closest registered 3D building
          const bld = result.nearestAvailableBuilding;
          const fullEnriched = await cadastreService.getEnrichedBuildingData(bld.building_id || bld.id);
          const foundProperties = getFlatsForBuilding(fullEnriched.allProperties || allProperties, bld);
          const foundFloors = getFloorsForBuilding(fullEnriched.allFloors || allFloors, bld);

          setActiveBuilding(bld);
          setDisplayProperties(foundProperties);
          setDisplayFloors(foundFloors);
          setIsEmptyParcel(false);
          setFilterFloor('ALL');

          if (fullEnriched.allProperties.length > 0) {
            const firstId = fullEnriched.allProperties[0].property.property_id;
            setCurrentSelectedId(firstId);
            onSelectProperty(firstId);
          }

          setSearchStatus({
            type: 'success',
            message: `Matched nearest registered 3D Cadastral Building (${result.nearestDistanceMeters}m from queried coordinates)`,
            buildingName: bld.building_name || bld.name || `Building ${bld.building_id || bld.id}`,
            surveyNumber: bld.survey_number,
            distance: result.nearestDistanceMeters,
          });
        } else {
          // Unmapped Cadastral Parcel Coordinates - display parcel footprint with quick option to extrude or view nearest
          setActiveBuilding(null);
          setDisplayProperties([]);
          setDisplayFloors([]);
          setIsEmptyParcel(true);
          setFilterFloor('ALL');

          const nearestNote = result.nearestAvailableBuilding
            ? ` Nearest registered building is ${result.nearestAvailableBuilding.building_name || result.nearestAvailableBuilding.building_id} (${result.nearestDistanceMeters}m away).`
            : '';

          setSearchStatus({
            type: 'empty',
            message: `Spatial coordinates pinpointed.${nearestNote} Click "Extrude 3D Model on this Parcel" to generate an immediate volumetric model.`,
            buildingName: result.nearestAvailableBuilding?.building_name || result.nearestAvailableBuilding?.building_id,
            surveyNumber: result.nearestAvailableBuilding?.survey_number,
            distance: result.nearestDistanceMeters,
          });
        }
      } catch (err: any) {
        console.error('Error querying coordinates:', err);
        setSearchError(err?.message || 'Failed to query cadastre database for coordinates.');
      } finally {
        setIsSearching(false);
      }
    },
    [searchRadius, onSelectProperty]
  );

  // Form Submission Handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = coordinateInput.trim();
    if (!trimmed) return;

    const parsed = parseCoordinatesOrUrl(trimmed);
    if (parsed) {
      setSearchError(null);
      executeCoordinateSearch(parsed.lat, parsed.lng, searchRadius);
      return;
    }

    // If it's a shortened or full URL (e.g. maps.app.goo.gl, goo.gl/maps, etc.)
    if (/^(https?:\/\/|maps\.app\.goo\.gl|goo\.gl|www\.google\.|google\.com\/maps)/i.test(trimmed)) {
      setSearchError(null);
      setIsSearching(true);
      try {
        const res = await api.resolveMapsUrl(trimmed);
        if (res.success && typeof res.lat === 'number' && typeof res.lng === 'number') {
          executeCoordinateSearch(res.lat, res.lng, searchRadius);
          return;
        } else {
          setSearchError(res.error || 'Could not extract coordinates from this Google Maps link.');
        }
      } catch (err: any) {
        setSearchError('Network error resolving Google Maps link.');
      } finally {
        setIsSearching(false);
      }
      return;
    }

    setSearchError(
      'Please enter valid numeric coordinates (e.g. 17.4485, 78.3748) or paste a valid Google Maps URL.'
    );
  };

  // Manual Separate Inputs Handler
  const handleApplyManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setSearchError('Invalid Latitude (-90 to 90) or Longitude (-180 to 180) values.');
      return;
    }
    executeCoordinateSearch(lat, lng, searchRadius);
  };

  // Browser Geolocation (GPS) Handler
  const handleDetectDeviceGps = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your current browser environment.');
      return;
    }

    setIsDetectingGps(true);
    setSearchError(null);
    setGpsNotice('Accessing GPS / GNSS hardware location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);
        setGpsNotice(`GPS Signal Acquired (±${acc}m accuracy)`);
        executeCoordinateSearch(lat, lng, searchRadius);
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsNotice(null);
        // Fallback to sample Telangana urban coordinates for smooth demonstration
        const fallbackLat = 17.4485;
        const fallbackLng = 78.3748;
        setSearchError(`GPS unavailable (${err.message}). Using official Hyderabad Cadastral Hub coordinates.`);
        executeCoordinateSearch(fallbackLat, fallbackLng, searchRadius);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Restore Default Demonstration Model
  const handleResetToDefault = () => {
    const lat = enrichedProperty?.location?.latitude ?? 17.443372;
    const lng = enrichedProperty?.location?.longitude ?? 78.541003;
    setCoordinateInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setManualLat(lat.toFixed(5));
    setManualLng(lng.toFixed(5));
    setSearchedCoords({ lat, lng });
    const bld = enrichedProperty?.building || allProperties[0]?.building || null;
    setActiveBuilding(bld);
    const bldProps = getFlatsForBuilding(allProperties, bld);
    const bldFloors = getFloorsForBuilding(allFloors, bld);
    setDisplayProperties(bldProps);
    setDisplayFloors(bldFloors);
    setIsEmptyParcel(false);
    setSearchError(null);
    setGpsNotice(null);
    setSearchStatus({
      type: 'idle',
      message: 'Restored initial demonstration building model.',
    });
    if (bldProps.length > 0) {
      const firstId = bldProps[0].property.property_id;
      setCurrentSelectedId(firstId);
      onSelectProperty(firstId);
    }
  };

  // Citizen Extrusion of Sample 3D Model on Unmapped Parcel
  const handleExtrudeSampleOnParcel = () => {
    const lat = searchedCoords.lat;
    const lng = searchedCoords.lng;
    const sampleBldId = `B-SIM-${Math.floor(100 + Math.random() * 900)}`;
    const sampleSurvey = `SY-${Math.floor(200 + Math.random() * 800)}/EXT`;

    const sampleBuilding: Building = {
      id: `sim-bld-${Date.now()}`,
      building_id: sampleBldId,
      survey_number: sampleSurvey,
      application_number: `APP-2026-TS-SIM-${Math.floor(1000 + Math.random() * 9000)}`,
      address: `Simulated 3D Model Parcel at (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      latitude: lat,
      longitude: lng,
      plot_area: 1200.0,
      total_floors: 4,
      number_of_floors: 4,
      total_height: 12.0,
      total_building_height: 12.0,
      status: 'plan_verified',
      state_code: 'TS',
      district: 'Hyderabad Metropolitan Region',
      mandal_or_taluk: 'Urban Cadastre Division',
      village_or_locality: 'Cadastral Survey Zone',
      submitted_by_name: 'Smt. Kavitha Rao (Citizen Appraiser)',
      compliance_metrics: {
        max_permitted_height: 15.0,
        actual_height: 12.0,
        setback_margin_required: 3.0,
        setback_margin_actual: 3.5,
        fsi_permitted: 2.5,
        fsi_actual: 1.85,
        passed: true,
      },
      created_at: new Date().toISOString(),
    };

    // Generate 4 floors and 8 units
    const simulatedFloors: Floor[] = [];
    const simulatedProps: EnrichedProperty[] = [];

    for (let f = 0; f < 4; f++) {
      const flrId = `${sampleBldId}-F0${f}`;
      const floorObj: Floor = {
        id: `flr-${sampleBldId}-${f}`,
        floor_id: flrId,
        building_id: sampleBldId,
        floor_number: f,
        bottom_height: f * 3.0,
        top_height: (f + 1) * 3.0,
        floor_name: f === 0 ? 'Ground Floor (Stilt & Parking)' : `Floor ${f} (Apartments)`,
        created_at: new Date().toISOString(),
      };
      simulatedFloors.push(floorObj);

      for (let u = 1; u <= 2; u++) {
        const propId = `PROP-${sampleBldId}-${f}0${u}`;
        const flatNo = f === 0 ? `Utility Unit G0${u}` : `Flat ${f}0${u}`;
        const ulpin = `3D-TS-HYD-${sampleSurvey.replace(/[^a-zA-Z0-9]/g, '')}-F0${f}-U0${u}`;

        const enriched: EnrichedProperty = {
          property: {
            id: `unit-${sampleBldId}-${f}-${u}`,
            property_id: propId,
            building_id: sampleBldId,
            floor_id: flrId,
            flat_number: flatNo,
            area: 110.0,
            property_type: f === 0 ? 'Commercial Parking Space' : 'Residential Apartment (3BHK)',
            property_record_ref: `DOC-2026-CITIZEN-${sampleBldId}-${f}0${u}`,
            created_at: new Date().toISOString(),
          },
          building: sampleBuilding,
          floor: floorObj,
          location: {
            id: `loc-${sampleBldId}`,
            location_id: `LOC-${sampleBldId}`,
            building_id: sampleBldId,
            latitude: lat,
            longitude: lng,
            address: sampleBuilding.address,
            created_at: new Date().toISOString(),
          },
          verticalGeometry: {
            id: `geom-${sampleBldId}-${f}-${u}`,
            geometry_id: `GEOM-${sampleBldId}-${f}-${u}`,
            property_id: propId,
            bottom_height: f * 3.0,
            top_height: (f + 1) * 3.0,
            width: 7.2,
            length: 12.0,
            height: 3.0,
            x_offset: u === 1 ? -3.8 : 3.8,
            y_offset: 0,
            created_at: new Date().toISOString(),
          },
          prototype3DId: {
            id: `pid-${sampleBldId}-${f}-${u}`,
            property_id: propId,
            generated_identifier: ulpin,
            format_pattern: '{STATE}-{DISTRICT}-{SURVEY}-{FLOOR}-{UNIT}',
            generated_at: new Date().toISOString(),
            status: 'PROTOTYPE_ACTIVE',
          },
          owners: [
            {
              owner: {
                id: `own-${sampleBldId}-${f}-${u}`,
                owner_id: `OWN-${sampleBldId}-${f}-${u}`,
                owner_name: `Prospective Allottee ${flatNo}`,
                contact_info: '+91 98490 12345',
                id_proof_type: 'Aadhaar / Citizen ID',
                created_at: new Date().toISOString(),
              },
              ownership: {
                id: `ownp-${sampleBldId}-${f}-${u}`,
                ownership_id: `OWNP-${sampleBldId}-${f}-${u}`,
                property_id: propId,
                owner_id: `OWN-${sampleBldId}-${f}-${u}`,
                ownership_share: 100,
                created_at: new Date().toISOString(),
              },
            },
          ],
          propertyRecord: {
            id: `rec-${sampleBldId}-${f}-${u}`,
            record_id: `REC-${sampleBldId}-${f}-${u}`,
            property_id: propId,
            source_reference: 'IGRS / Authorized Property Record',
            survey_number: sampleSurvey,
            document_reference: `DOC-2026-CITIZEN-${sampleBldId}-${f}0${u}`,
            property_type: 'Residential Apartment',
            area: 110.0,
            address: `${flatNo}, Simulated 3D Building ${sampleBldId}`,
            registration_date: new Date().toISOString().split('T')[0],
            sub_registrar_office: 'SRO Digital Verification Portal',
            created_at: new Date().toISOString(),
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
          },
        };

        simulatedProps.push(enriched);
      }
    }

    setActiveBuilding(sampleBuilding);
    setDisplayProperties(simulatedProps);
    setDisplayFloors(simulatedFloors);
    setIsEmptyParcel(false);
    setCurrentSelectedId(simulatedProps[0].property.property_id);
    onSelectProperty(simulatedProps[0].property.property_id);

    setSearchStatus({
      type: 'sample',
      message: `Extruded volumetric 3D model (G+3 Floors, 8 Units) for parcel at (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      buildingName: `Simulated Building ${sampleBldId}`,
      surveyNumber: sampleSurvey,
      distance: 0.0,
    });
  };

  // Quick Presets matching registered cadastral buildings
  const quickPresets = [
    {
      label: '🏢 Malkajgiri Enclave (B001)',
      coords: { lat: 17.443372, lng: 78.541003 },
      desc: 'Malkajgiri Municipal Enclave - Survey 3127 - G+4 Strata Model',
    },
    {
      label: '🏢 Green Meadows (B999)',
      coords: { lat: 17.4485, lng: 78.3748 },
      desc: 'Green Meadows Residency - Survey SY-TEST/99 - 3D GLB Model',
    },
    {
      label: '🏢 Godavari Towers (B411)',
      coords: { lat: 17.424346, lng: 78.650351 },
      desc: 'Godavari Towers - Survey SY-132/2B - 4-Storey Extruded 3D Mesh',
    },
    {
      label: '🏢 Sri Balaji Heights (B466)',
      coords: { lat: 17.422281, lng: 78.647516 },
      desc: 'Sri Balaji Heights - Survey SY-829/2B - 4-Storey Strata Geometry',
    },
    {
      label: '🏢 Cyber Park Complex (B648)',
      coords: { lat: 17.423948, lng: 78.648350 },
      desc: 'Cyber Park Commercial Complex - Survey SY-276/2B - G+4 Strata',
    },
    {
      label: '📍 Unmapped Parcel Centroid',
      coords: { lat: 17.45, lng: 78.38 },
      desc: 'Illuminated 3D Parcel Boundary Target (Instant Extrusion Available)',
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* 1. CITIZEN 3D SPATIAL QUERY & COORDINATE INPUT BAR */}
      <section
        id="citizen-spatial-search-section"
        aria-label="Citizen Location Coordinates & 3D Model Explorer"
        className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5 transition-all"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-[#1e3a8a] border border-blue-200 uppercase font-mono">
                Citizen Portal
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#1e3a8a]" />
                <span>Cadastral Coordinate Query & 3D Building Explorer</span>
              </h1>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Enter geographic GPS coordinates (Latitude & Longitude) or paste a Google Maps link to query the cadastre
              database, locate the parcel centroid, and display the official 3D volumetric building model.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              id="btn-detect-gps-citizen"
              type="button"
              onClick={handleDetectDeviceGps}
              disabled={isDetectingGps || isSearching}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#1e3a8a] text-slate-700 font-medium text-xs border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              title="Use current GPS device location"
            >
              <Crosshair className={`w-3.5 h-3.5 text-[#1e3a8a] ${isDetectingGps ? 'animate-spin' : ''}`} />
              <span>{isDetectingGps ? 'Reading GPS...' : 'Use My GPS'}</span>
            </button>

            <button
              id="btn-reset-demo-citizen"
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Reset to default demonstration building"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Primary Coordinate Search Form */}
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            {/* Coordinates Input Field */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4 text-[#1e3a8a]" />
              </div>
              <input
                id="input-citizen-coordinates"
                type="text"
                value={coordinateInput}
                onChange={(e) => {
                  setCoordinateInput(e.target.value);
                  setSearchError(null);
                }}
                placeholder="Enter coordinates e.g. 17.4485, 78.3748 or paste Google Maps URL"
                className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-mono focus:outline-none focus:border-[#1e3a8a] focus:bg-white focus:ring-1 focus:ring-[#1e3a8a] transition-all shadow-inner"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <span className="text-[10px] bg-blue-50 text-[#1e3a8a] border border-blue-200 px-2 py-0.5 rounded-md font-mono font-bold hidden sm:inline">
                  WGS84
                </span>
              </div>
            </div>

            {/* Spatial Radius Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#1e3a8a]" />
              <span className="text-slate-500 text-[11px]">Radius:</span>
              <select
                id="select-citizen-radius"
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="bg-transparent text-[#1e3a8a] font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value={25}>25m (ST_DWithin)</option>
                <option value={50}>50m Buffer</option>
                <option value={100}>100m Buffer</option>
                <option value={200}>200m Buffer</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              id="btn-search-coordinates-citizen"
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 bg-[#1e3a8a] hover:bg-blue-900 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching PostGIS...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Display 3D Model</span>
                </>
              )}
            </button>
          </div>

          {/* Toggle Separate Lat / Lng inputs for precision input */}
          <div className="flex items-center justify-between text-xs">
            <button
              id="btn-toggle-manual-fields"
              type="button"
              onClick={() => setShowManualFields(!showManualFields)}
              className="text-[#1e3a8a] hover:text-blue-900 font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              {showManualFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showManualFields ? 'Hide Separate Lat / Lng Inputs' : 'Enter Separate Lat & Long Fields'}</span>
            </button>

            <span className="text-[11px] text-slate-500 font-mono">
              Active Coordinates: {searchedCoords.lat.toFixed(5)}° N, {searchedCoords.lng.toFixed(5)}° E
            </span>
          </div>

          {/* Expandable Separate Lat & Long Inputs */}
          {showManualFields && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 font-mono uppercase mb-1">
                  Latitude (° N)
                </label>
                <input
                  id="input-manual-latitude"
                  type="number"
                  step="0.000001"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="e.g. 17.448500"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900 focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 font-mono uppercase mb-1">
                  Longitude (° E)
                </label>
                <input
                  id="input-manual-longitude"
                  type="number"
                  step="0.000001"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="e.g. 78.374800"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900 focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <button
                  id="btn-apply-manual-coordinates"
                  type="button"
                  onClick={handleApplyManualCoordinates}
                  className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Apply & Load 3D Model</span>
                </button>
              </div>
            </div>
          )}
        </form>

        {/* GPS Status Notice */}
        {gpsNotice && (
          <div className="mt-2.5 text-[11px] text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{gpsNotice}</span>
          </div>
        )}

        {/* Error notification if parsing or query fails */}
        {searchError && (
          <div className="mt-2.5 text-[11px] text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-2 font-mono">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Quick Cadastre Presets for Rapid Citizen Testing */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-mono">
          <span className="text-slate-500 flex items-center gap-1 font-bold">
            <Sparkles className="w-3 h-3 text-[#1e3a8a]" />
            <span>Quick Presets:</span>
          </span>
          {quickPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => executeCoordinateSearch(preset.coords.lat, preset.coords.lng, searchRadius)}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-[#1e3a8a] border border-slate-200 hover:border-blue-300 text-slate-700 transition-all cursor-pointer flex items-center gap-1"
              title={preset.desc}
            >
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. MATCH STATUS & 3D MODEL BANNER */}
      {searchStatus.type === 'success' && activeBuilding && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950 text-sm">{searchStatus.buildingName}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-mono text-[10px] font-bold">
                  Survey No. {searchStatus.surveyNumber}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white text-emerald-800 border border-emerald-300 font-mono text-[10px]">
                  Distance: {searchStatus.distance}m
                </span>
              </div>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Official 3D Cadastral Volumetric Model loaded ({displayFloors.length} Floors, {displayProperties.length}{' '}
                Registered Units, Height: {activeBuilding.total_height || 12.0}m).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-900">
            <span className="px-2.5 py-1 rounded bg-white border border-emerald-300 font-bold">
              3D Model Active
            </span>
          </div>
        </div>
      )}

      {searchStatus.type === 'empty' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-amber-950 text-sm">
                Unmapped Parcel Centroid ({searchedCoords.lat.toFixed(5)}° N, {searchedCoords.lng.toFixed(5)}° E)
              </span>
              <p className="text-amber-800 text-[11px] mt-0.5">
                No statutory 3D building is registered within {searchRadius}m. Displaying illuminated 3D parcel footprint
                and coordinate laser beacon.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {searchStatus.buildingName && searchStatus.distance && (
              <button
                type="button"
                onClick={async () => {
                  const allBlds = await cadastreService.getAllBuildings();
                  const bld = allBlds.find(
                    (b) => b.building_name === searchStatus.buildingName || b.building_id === searchStatus.buildingName
                  );
                  if (bld && typeof bld.latitude === 'number' && typeof bld.longitude === 'number') {
                    executeCoordinateSearch(bld.latitude, bld.longitude, 100);
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>View Closest 3D Building ({searchStatus.distance}m)</span>
              </button>
            )}
            <button
              id="btn-extrude-sample-citizen"
              type="button"
              onClick={handleExtrudeSampleOnParcel}
              className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Extrude 3D Model on this Parcel</span>
            </button>
          </div>
        </div>
      )}

      {searchStatus.type === 'sample' && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-300 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-blue-950 text-sm">
                Simulated 3D Building Model Rendered on Parcel
              </span>
              <p className="text-blue-800 text-[11px] mt-0.5">{searchStatus.message}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-100 text-[#1e3a8a] font-medium text-xs border border-blue-300 transition-colors cursor-pointer"
          >
            Restore Official Demo
          </button>
        </div>
      )}

      {/* 3. APARTMENT UNIT QUICK SWITCHER (Synchronized to Loaded 3D Model) */}
      <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5 text-[#1e3a8a]" />
            Apartment Unit Quick Switcher ({displayProperties.length} Flats in {activeBuilding ? (activeBuilding.building_name || `Building ${activeBuilding.building_id || activeBuilding.id}`) : 'Displaying Building'})
          </span>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Showing only displaying building flats
          </span>
        </div>

        {displayProperties.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {displayProperties.map((p) => {
              const isCurrent = p.property.property_id === currentSelectedId;
              const isGround = p.floor.floor_number === 0;
              return (
                <button
                  key={p.property.property_id}
                  onClick={() => {
                    setCurrentSelectedId(p.property.property_id);
                    onSelectProperty(p.property.property_id);
                  }}
                  className={`p-2 rounded border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-50 border-[#1e3a8a] shadow-xs ring-1 ring-[#1e3a8a]'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono uppercase ${
                        isGround
                          ? 'bg-emerald-50 text-[#059669] border border-emerald-300'
                          : 'bg-blue-50 text-[#1e3a8a] border border-blue-200'
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
                  <div className="text-[10px] text-[#1e3a8a] font-mono truncate mt-0.5">
                    {p.prototype3DId.generated_identifier}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center text-slate-500 text-xs">
            No registered apartment units on this unmapped parcel. Click &quot;Extrude Sample 3D Model on this Parcel&quot;
            above to visualize a simulated multi-unit structure.
          </div>
        )}
      </div>

      {/* 4. MAIN SPLIT GRID: LEFT 3D WEBGL CADASTRE + RIGHT PROPERTY PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive 3D WebGL Cadastre Viewer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-700 font-semibold px-1">
            <div className="flex items-center gap-1.5 text-[#1e3a8a] font-mono uppercase tracking-wider">
              <Box className="w-4 h-4" />
              <span>
                3D Volumetric Cadastre Model{' '}
                {activeBuilding ? `(Building ${activeBuilding.building_id || activeBuilding.id})` : '(Parcel Boundary)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px] font-mono">Orbit: Left Click | Pan: Right Click</span>
            </div>
          </div>

          {/* 3D WebGL Canvas Container */}
          <div
            id="three-cadastre-viewport"
            className="h-[460px] w-full rounded-lg overflow-hidden border border-slate-200 shadow-xs relative bg-slate-50"
          >
            <ThreeCanvas
              enrichedProperty={currentActiveProperty}
              activeBuilding={activeBuilding}
              allProperties={displayProperties}
              allFloors={displayFloors}
              isSelected={true}
              onSelectProperty={(id) => {
                setCurrentSelectedId(id);
                onSelectProperty(id);
              }}
              explodedOffset={explodedOffset}
              viewMode={viewMode}
              showRuler={showRuler}
              filterFloor={filterFloor}
              isEmptyParcel={isEmptyParcel}
              unmappedCoordinates={searchedCoords}
              showUnderground={false}
              showTerrainMesh={false}
            />

            {/* Coordinates Overlay HUD */}
            <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded text-[11px] font-mono border border-slate-700 pointer-events-none flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {searchedCoords.lat.toFixed(5)}° N, {searchedCoords.lng.toFixed(5)}° E
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-cyan-300">
                {activeBuilding ? `Survey #${activeBuilding.survey_number}` : 'Unmapped Plot'}
              </span>
            </div>
          </div>

          {/* 3D Visual Customization Bar (Render Mode, Floor Isolation, Explode Slider, Ruler) */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
            {/* View Mode */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Render:</span>
              <div className="flex rounded bg-slate-100 p-0.5 border border-slate-200">
                <button
                  onClick={() => setViewMode('volumetric')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'volumetric' ? 'bg-[#1e3a8a] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Solid
                </button>
                <button
                  onClick={() => setViewMode('xray')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'xray' ? 'bg-[#1e3a8a] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  X-Ray
                </button>
                <button
                  onClick={() => setViewMode('wireframe')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'wireframe' ? 'bg-[#1e3a8a] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Wireframe
                </button>
              </div>
            </div>

            {/* Floor Isolation Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600 font-medium">Floor:</span>
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#1e3a8a] cursor-pointer"
              >
                <option value="ALL">All Floors (Full Structure)</option>
                {displayFloors.map((flr) => (
                  <option key={flr.floor_id} value={flr.floor_number}>
                    {flr.floor_name || `Floor ${flr.floor_number}`} ({flr.bottom_height}m–{flr.top_height}m)
                  </option>
                ))}
              </select>
            </div>

            {/* Exploded Floor Plate Slider */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Floor Explode:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={explodedOffset}
                onChange={(e) => setExplodedOffset(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1e3a8a]"
              />
              <span className="font-mono text-[#1e3a8a] text-[11px] font-bold">
                {(explodedOffset * 100).toFixed(0)}%
              </span>
            </div>

            {/* Toggle Height Ruler */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900">
              <input
                type="checkbox"
                checked={showRuler}
                onChange={(e) => setShowRuler(e.target.checked)}
                className="rounded bg-white border-slate-300 text-[#1e3a8a] focus:ring-0 cursor-pointer"
              />
              <span>Height Ruler</span>
            </label>
          </div>
        </div>

        {/* Right Column: Structured Property Information & ULPIN Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-700 font-semibold px-1">
            <div className="flex items-center gap-1.5 text-[#1e3a8a] font-mono uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>Structured Cadastral & Ownership Record</span>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">
              {currentActiveProperty?.property.property_id || 'Parcel Ground'}
            </span>
          </div>

          <PropertyInfoPanel
            enrichedProperty={currentActiveProperty}
            onUpdateProperty={onUpdateProperty}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      {/* 5. SYNCHRONIZED GEOGRAPHIC LEAFLET MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 font-semibold px-1">
            <div className="flex items-center gap-1.5 text-[#1e3a8a] font-mono uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              <span>Synchronized Geographic Parcel Location & Cadastral Coordinates</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 text-xs font-mono">
              <span>Click anywhere on the map to query coordinates & update 3D model</span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1e3a8a] border border-blue-200">
                Lat: {searchedCoords.lat.toFixed(5)}° N, Lng: {searchedCoords.lng.toFixed(5)}° E
              </span>
            </div>
          </div>

          <div className="h-[380px] w-full rounded-lg overflow-hidden border border-slate-200 shadow-xs relative">
            <LeafletMap
              building={activeBuilding}
              location={{
                id: 'loc-active',
                location_id: 'LOC-ACTIVE',
                building_id: activeBuilding?.building_id || 'B001',
                latitude: searchedCoords.lat,
                longitude: searchedCoords.lng,
                address: activeBuilding?.address || `Cadastral Parcel at (${searchedCoords.lat.toFixed(4)}, ${searchedCoords.lng.toFixed(4)})`,
                created_at: new Date().toISOString(),
              }}
              isSelected={true}
              searchedCoords={searchedCoords}
              searchRadius={searchRadius}
              isEmptyParcel={isEmptyParcel}
              allowEditCoordinates={true}
              onCoordinatesChange={(lat, lng) => {
                // Interactive map click updates coordinates and re-queries 3D building
                executeCoordinateSearch(lat, lng, searchRadius);
              }}
              onBuildingClick={(bldId) => {
                const el = document.getElementById('three-cadastre-viewport');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 6. STATUTORY COMPLIANCE & CADASTRE PIPELINE SUMMARY */}
      <div className="p-4 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 space-y-3 shadow-xs">
        <div className="font-semibold text-slate-900 flex items-center gap-2 font-mono uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[#059669]" />
          <span>Cadastral Data Pipeline Verification (SIH26011 Compliance)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-700">
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-xs">
            <strong className="text-[#1e3a8a] block mb-1">1. Authorized Record:</strong>
            Linked to Document{' '}
            <span className="font-mono text-slate-900">
              {currentActiveProperty?.property.property_record_ref || 'DOC-UNREGISTERED'}
            </span>{' '}
            in SRO records.
          </div>
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-xs">
            <strong className="text-[#1e3a8a] block mb-1">2. Geographic Anchor:</strong>
            Parcel Survey #{activeBuilding?.survey_number || 'Unmapped'} mapped at (
            {searchedCoords.lat.toFixed(4)}, {searchedCoords.lng.toFixed(4)}).
          </div>
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-xs">
            <strong className="text-[#1e3a8a] block mb-1">3. Vertical Stratification:</strong>
            {currentActiveProperty ? (
              <>
                Floor {currentActiveProperty.floor.floor_number} bounded at Z=
                {currentActiveProperty.verticalGeometry.bottom_height}m to{' '}
                {currentActiveProperty.verticalGeometry.top_height}m.
              </>
            ) : (
              'Surface Level Z=0.0m to 12.0m Vertical Envelope.'
            )}
          </div>
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shadow-xs">
            <strong className="text-[#1e3a8a] block mb-1">4. Volumetric Identifier:</strong>
            Unique Prototype 3D Property ID{' '}
            <span className="font-mono text-[#059669] font-bold">
              {currentActiveProperty?.prototype3DId.generated_identifier || '3D-ULPIN-PENDING'}
            </span>{' '}
            generated.
          </div>
        </div>
      </div>
    </div>
  );
};
