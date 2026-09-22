import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Search,
  Crosshair,
  Layers,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Compass,
  RotateCcw,
} from 'lucide-react';

interface ParcelMapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (coords: { lat: number; lng: number }) => void;
  onAddressSuggest?: (addr: string) => void;
}

// Comprehensive Google Maps & Coordinates Parser
export function parseCoordinatesFromInput(input: string): { lat: number; lng: number; source: string } | null {
  if (!input || !input.trim()) return null;
  const str = input.trim();

  // Pattern 1: Google Maps data parameter !3d<lat>!4d<lng>
  const dataMatch = str.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Google Maps Place URL (!3d/!4d)' };
    }
  }

  // Pattern 2: Standard Google Maps /@lat,lng,zoom
  const atMatch = str.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Google Maps Viewport URL (@lat,lng)' };
    }
  }

  // Pattern 3: Query parameters: ?q=lat,lng or &q=lat,lng or ?ll=lat,lng
  const qMatch = str.match(/[?&](?:q|ll|sll|daddr)=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/i);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Google Maps Query Parameter (?q=)' };
    }
  }

  // Pattern 4: Place coordinates in path /place/.../lat,lng
  const placeMatch = str.match(/\/place\/[^/]*?(-?\d+\.\d+)[,+](-?\d+\.\d+)/);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Google Maps Place Coordinate Path' };
    }
  }

  // Pattern 5: Direct numerical string "17.3850, 78.4867" or "17.3850 78.4867"
  const directMatch = str.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Manual Coordinates' };
    }
  }

  return null;
}

export const ParcelMapPicker: React.FC<ParcelMapPickerProps> = ({
  latitude,
  longitude,
  onChange,
  onAddressSuggest,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [gmapsInput, setGmapsInput] = useState('');
  const [parseStatus, setParseStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [latInput, setLatInput] = useState<string>(latitude.toFixed(6));
  const [lngInput, setLngInput] = useState<string>(longitude.toFixed(6));
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite' | 'topo'>('streets');

  // Synchronize internal input strings when prop changes from outside (e.g., initial or pin drag)
  useEffect(() => {
    setLatInput(latitude.toFixed(6));
    setLngInput(longitude.toFixed(6));
  }, [latitude, longitude]);

  // Tile URL mapping
  const getTileUrl = (type: 'streets' | 'satellite' | 'topo') => {
    switch (type) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'topo':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      case 'streets':
      default:
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = L.tileLayer(getTileUrl(mapLayer), {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Custom Interactive Cadastral Pin Icon
    const customPinIcon = L.divIcon({
      className: 'interactive-cadastral-pin',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full cursor-grab active:cursor-grabbing">
          <div class="w-8 h-8 rounded-full bg-[#1e3a8a] border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-[10px] ring-4 ring-blue-500/40">
            PIN
          </div>
          <div class="absolute -bottom-1 w-2.5 h-2.5 bg-[#1e3a8a] rotate-45 border-r border-b border-white"></div>
        </div>
      `,
      iconSize: [32, 38],
      iconAnchor: [16, 38],
    });

    const marker = L.marker([latitude, longitude], {
      icon: customPinIcon,
      draggable: true,
      title: 'Drag to reposition parcel GPS anchor',
    }).addTo(map);
    markerRef.current = marker;

    // Draggable Pin Event: real-time coordinate updates
    marker.on('drag', () => {
      const pos = marker.getLatLng();
      setLatInput(pos.lat.toFixed(6));
      setLngInput(pos.lng.toFixed(6));
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const newLat = parseFloat(pos.lat.toFixed(6));
      const newLng = parseFloat(pos.lng.toFixed(6));
      setLatInput(newLat.toFixed(6));
      setLngInput(newLng.toFixed(6));
      onChange({ lat: newLat, lng: newLng });
      if (onAddressSuggest) {
        onAddressSuggest(`Parcel at ${newLat.toFixed(5)}, ${newLng.toFixed(5)}, Hyderabad`);
      }
      setParseStatus({
        success: true,
        message: `Pin repositioned to ${newLat.toFixed(5)}, ${newLng.toFixed(5)}`,
      });
    });

    // Map Click Event: click anywhere on map to move pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const newLat = parseFloat(lat.toFixed(6));
      const newLng = parseFloat(lng.toFixed(6));
      marker.setLatLng([newLat, newLng]);
      setLatInput(newLat.toFixed(6));
      setLngInput(newLng.toFixed(6));
      onChange({ lat: newLat, lng: newLng });
      if (onAddressSuggest) {
        onAddressSuggest(`Parcel at ${newLat.toFixed(5)}, ${newLng.toFixed(5)}, Hyderabad`);
      }
      setParseStatus({
        success: true,
        message: `Pin repositioned to ${newLat.toFixed(5)}, ${newLng.toFixed(5)} via map click`,
      });
    });

    // Invalidate size after layout rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map tile layer when mapLayer changes
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      tileLayerRef.current.setUrl(getTileUrl(mapLayer));
    }
  }, [mapLayer]);

  // Dynamic Re-centering helper: pans map and moves marker
  const recenterMap = useCallback((newLat: number, newLng: number, zoomLevel = 17) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], zoomLevel, { animate: true });
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    }
  }, []);

  // Handle Google Maps Link Ingestion
  const handleGmapsIngest = (url: string) => {
    setGmapsInput(url);
    if (!url.trim()) {
      setParseStatus(null);
      return;
    }

    const parsed = parseCoordinatesFromInput(url);
    if (parsed) {
      const newLat = parseFloat(parsed.lat.toFixed(6));
      const newLng = parseFloat(parsed.lng.toFixed(6));
      setLatInput(newLat.toFixed(6));
      setLngInput(newLng.toFixed(6));
      onChange({ lat: newLat, lng: newLng });
      recenterMap(newLat, newLng, 18);
      if (onAddressSuggest) {
        onAddressSuggest(`Plot at ${newLat.toFixed(5)}, ${newLng.toFixed(5)}, Hyderabad`);
      }
      setParseStatus({
        success: true,
        message: `Parsed via ${parsed.source}: ${newLat.toFixed(5)}° N, ${newLng.toFixed(5)}° E`,
      });
    } else {
      setParseStatus({
        success: false,
        message: 'Could not extract valid coordinates. Ensure URL contains lat,lng (e.g. ?q=17.3850,78.4867 or @17.3850,78.4867)',
      });
    }
  };

  // Handle Manual Lat/Lng inputs
  const handleManualCoordChange = (type: 'lat' | 'lng', val: string) => {
    if (type === 'lat') {
      setLatInput(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= -90 && parsed <= 90) {
        const newCoords = { lat: parsed, lng: longitude };
        onChange(newCoords);
        recenterMap(parsed, longitude);
        setParseStatus({
          success: true,
          message: `Latitude updated to ${parsed.toFixed(6)}`,
        });
      }
    } else {
      setLngInput(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= -180 && parsed <= 180) {
        const newCoords = { lat: latitude, lng: parsed };
        onChange(newCoords);
        recenterMap(latitude, parsed);
        setParseStatus({
          success: true,
          message: `Longitude updated to ${parsed.toFixed(6)}`,
        });
      }
    }
  };

  // Quick Preset Handlers
  const applyPreset = (lat: number, lng: number, label: string) => {
    setLatInput(lat.toFixed(6));
    setLngInput(lng.toFixed(6));
    setGmapsInput('');
    onChange({ lat, lng });
    recenterMap(lat, lng, 18);
    if (onAddressSuggest) {
      onAddressSuggest(`Parcel at ${label}, Hyderabad`);
    }
    setParseStatus({
      success: true,
      message: `Centered at ${label} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[#1e3a8a] text-white flex items-center justify-center text-xs">
            <MapPin className="w-3.5 h-3.5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span>Geospatial Parcel Location & GPS Capture</span>
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 font-mono">
                Interactive Pin
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Drag pin on map, enter manual coordinates, or paste any Google Maps URL.
            </p>
          </div>
        </div>

        {/* Layer toggle */}
        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setMapLayer('streets')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              mapLayer === 'streets' ? 'bg-[#1e3a8a] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={() => setMapLayer('satellite')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              mapLayer === 'satellite' ? 'bg-[#1e3a8a] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapLayer('topo')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              mapLayer === 'topo' ? 'bg-[#1e3a8a] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Topo
          </button>
        </div>
      </div>

      {/* 1. Google Maps Link Ingestion Box */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 font-mono">
          <LinkIcon className="w-3.5 h-3.5 text-blue-700" />
          <span>Google Maps Link Ingestion:</span>
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={gmapsInput}
            onChange={(e) => handleGmapsIngest(e.target.value)}
            placeholder="Paste Google Maps link (e.g. https://maps.google.com/?q=17.3850,78.4867 or maps.app.goo.gl)"
            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-20 py-1.5 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] focus:outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
          {gmapsInput && (
            <button
              type="button"
              onClick={() => {
                setGmapsInput('');
                setParseStatus(null);
              }}
              className="absolute right-2 text-[10px] text-slate-400 hover:text-slate-600 font-mono px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Parse Feedback Banner */}
      {parseStatus && (
        <div
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono flex items-center gap-2 border transition-all ${
            parseStatus.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {parseStatus.success ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          <span className="truncate">{parseStatus.message}</span>
        </div>
      )}

      {/* 2. Manual Coordinate Entry (Latitude & Longitude) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1 font-mono">
            Latitude (° N):
          </label>
          <input
            type="number"
            step="any"
            value={latInput}
            onChange={(e) => handleManualCoordChange('lat', e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 font-bold focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] focus:outline-none"
            placeholder="17.385044"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1 font-mono">
            Longitude (° E):
          </label>
          <input
            type="number"
            step="any"
            value={lngInput}
            onChange={(e) => handleManualCoordChange('lng', e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 font-bold focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] focus:outline-none"
            placeholder="78.486671"
          />
        </div>
      </div>

      {/* 3. Embedded Interactive Map Window */}
      <div className="relative rounded-lg overflow-hidden border border-slate-300 shadow-inner">
        <div ref={mapContainerRef} className="h-48 w-full z-0 bg-slate-200" />

        {/* Overlay Badges */}
        <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-md border border-slate-200 shadow-xs flex items-center gap-1.5 text-[10px] font-mono text-slate-700">
          <Crosshair className="w-3 h-3 text-[#1e3a8a]" />
          <span>Click map or drag pin to adjust coordinates</span>
        </div>

        <button
          type="button"
          onClick={() => recenterMap(latitude, longitude, 18)}
          title="Re-center on pin"
          className="absolute top-2 right-2 z-10 w-7 h-7 bg-white hover:bg-slate-100 rounded-md border border-slate-300 shadow-xs flex items-center justify-center text-slate-700 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Presets and Quick Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px]">
        <span className="text-slate-500 font-mono">Quick Cadastral Locations:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => applyPreset(17.385044, 78.486671, 'Hyderabad Old City')}
            className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[10px] cursor-pointer"
          >
            Hyderabad Central
          </button>
          <button
            type="button"
            onClick={() => applyPreset(17.448500, 78.374800, 'HITEC City Tech Zone')}
            className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[10px] cursor-pointer"
          >
            HITEC City
          </button>
          <button
            type="button"
            onClick={() => applyPreset(17.443372, 78.541003, 'Uppal Industrial Sector')}
            className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[10px] cursor-pointer"
          >
            Uppal Sector
          </button>
        </div>
      </div>
    </div>
  );
};
