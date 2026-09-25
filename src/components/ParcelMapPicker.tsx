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
  RotateCcw,
  Loader2,
  Navigation,
  Globe,
  Move,
  Maximize2,
  Minimize2,
  Sparkles,
  Check,
  Building,
  Map as MapIcon,
  Compass,
} from 'lucide-react';
import { api } from '../services/api';

interface ParcelMapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (coords: { lat: number; lng: number }) => void;
  onAddressSuggest?: (addr: string) => void;
}

// Comprehensive Google Maps & Coordinates Parser (Synchronous Regex)
export function parseCoordinatesFromInput(input: string): { lat: number; lng: number; source: string } | null {
  if (!input || !input.trim()) return null;
  let str = input.trim();
  try {
    str = decodeURIComponent(str);
  } catch {
    // Keep raw string if URI decode fails
  }

  // Pattern 1: Google Maps data parameter !3d<lat>!4d<lng>
  const dataMatch = str.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Google Maps Place Pin (!3d/!4d)' };
    }
  }

  // Pattern 2: Standard Google Maps /@lat,lng,zoom
  const atMatch = str.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Google Maps Viewport (@lat,lng)' };
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

  // Pattern 4: DMS notation: e.g. 17°25'20.2"N 78°38'40.7"E
  const dmsMatch = str.match(/(\d+)°(\d+)['\u2019]([\d.]+)["\u201D]([NS])\s*[+, ]\s*(\d+)°(\d+)['\u2019]([\d.]+)["\u201D]([EW])/i);
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]), latMin = parseFloat(dmsMatch[2]), latSec = parseFloat(dmsMatch[3]), latDir = dmsMatch[4].toUpperCase();
    const lngDeg = parseFloat(dmsMatch[5]), lngMin = parseFloat(dmsMatch[6]), lngSec = parseFloat(dmsMatch[7]), lngDir = dmsMatch[8].toUpperCase();
    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latDir === 'S') lat = -lat;
    let lng = lngDeg + lngMin / 60 + lngSec / 3600;
    if (lngDir === 'W') lng = -lng;
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'DMS GPS Coordinates' };
    }
  }

  // Pattern 5: Place coordinates in path /place/.../lat,lng
  const placeMatch = str.match(/\/place\/[^/]*?(-?\d+\.\d+)[,+](-?\d+\.\d+)/);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Google Maps Place Coordinate Path' };
    }
  }

  // Pattern 6: Direct numerical string "17.3850, 78.4867" or "17.3850 78.4867"
  const directMatch = str.match(/^(-?\d+\.?\d*)[,\s;]+(-?\d+\.?\d*)$/);
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Decimal GPS Coordinates' };
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

  const [searchInput, setSearchInput] = useState('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [isDraggingPin, setIsDraggingPin] = useState<boolean>(false);
  const [isExpandedMap, setIsExpandedMap] = useState<boolean>(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    `Plot at ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E, Hyderabad`
  );
  const [parseStatus, setParseStatus] = useState<{
    success: boolean;
    loading?: boolean;
    message: string;
  } | null>(null);

  const [latInput, setLatInput] = useState<string>(latitude.toFixed(6));
  const [lngInput, setLngInput] = useState<string>(longitude.toFixed(6));
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite' | 'topo'>('streets');

  // Synchronize internal input strings when prop changes from outside
  useEffect(() => {
    setLatInput(latitude.toFixed(6));
    setLngInput(longitude.toFixed(6));
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
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

  // Dynamic Re-centering helper: pans map and moves marker
  const recenterMap = useCallback((newLat: number, newLng: number, zoomLevel = 17) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView([newLat, newLng], zoomLevel, { animate: true });
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    }
  }, []);

  // Reverse Geocode helper to fetch address from coordinates
  const triggerReverseGeocode = useCallback(async (latVal: number, lngVal: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latVal}&lon=${lngVal}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const cleanAddr = data.display_name;
          setResolvedAddress(cleanAddr);
          if (onAddressSuggest) {
            onAddressSuggest(cleanAddr);
          }
          return;
        }
      }
    } catch {
      // Fallback if offline or rate limited
    }
    const fallback = `Plot at ${latVal.toFixed(5)}° N, ${lngVal.toFixed(5)}° E, Hyderabad`;
    setResolvedAddress(fallback);
    if (onAddressSuggest) {
      onAddressSuggest(fallback);
    }
  }, [onAddressSuggest]);

  // Apply parsed coordinates to state and map
  const applyCoordinates = useCallback(
    (newLat: number, newLng: number, sourceName: string, customAddress?: string) => {
      const latFormatted = parseFloat(newLat.toFixed(6));
      const lngFormatted = parseFloat(newLng.toFixed(6));
      setLatInput(latFormatted.toFixed(6));
      setLngInput(lngFormatted.toFixed(6));
      onChange({ lat: latFormatted, lng: lngFormatted });
      recenterMap(latFormatted, lngFormatted, 18);

      if (customAddress) {
        setResolvedAddress(customAddress);
        if (onAddressSuggest) onAddressSuggest(customAddress);
      } else {
        triggerReverseGeocode(latFormatted, lngFormatted);
      }

      setParseStatus({
        success: true,
        message: `Position updated via ${sourceName}: ${latFormatted.toFixed(6)}° N, ${lngFormatted.toFixed(6)}° E`,
      });
    },
    [onChange, recenterMap, triggerReverseGeocode, onAddressSuggest]
  );

  // Initialize Leaflet Map with Google Maps Draggable Pin
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

    // Authentic Google Maps Draggable Pin with needle tip and base ground pulse
    const customPinIcon = L.divIcon({
      className: 'google-maps-draggable-pin',
      html: `
        <div class="relative flex flex-col items-center select-none" style="width: 38px; height: 54px;">
          <!-- Pin Tooltip badge floating above -->
          <div id="draggable-pin-tooltip" class="absolute -top-7 px-2 py-0.5 bg-slate-900/95 text-white rounded text-[9px] font-mono font-bold tracking-tight whitespace-nowrap shadow-md border border-slate-700 pointer-events-none flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>DRAG PIN</span>
          </div>

          <!-- Pulsing ground ripple at exact anchor point -->
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-2 rounded-full bg-red-600/35 blur-[0.5px] animate-ping pointer-events-none"></div>
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-black/40 blur-[0.5px] pointer-events-none"></div>

          <!-- Google Maps Marker Pin SVG -->
          <div class="cursor-grab active:cursor-grabbing transition-transform duration-100 hover:scale-105 active:-translate-y-1 active:scale-110">
            <svg width="38" height="50" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
              <!-- Pin Base / Outer Drop -->
              <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30c0-9.94-8.06-18-18-18z" fill="#EA4335"/>
              <!-- Pin Outer Border Stroke -->
              <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30c0-9.94-8.06-18-18-18z" stroke="#B31412" stroke-width="1.2"/>
              <!-- Top Highlight -->
              <path d="M18 2C9.16 2 2 9.16 2 18c0 4.6 2.5 10.7 7.1 18.2C12.5 41.6 16 45.4 18 46.9c2-1.5 5.5-5.3 8.9-10.7 4.6-7.5 7.1-13.6 7.1-18.2 0-8.84-7.16-16-16-16z" fill="url(#pinGlow)" opacity="0.25"/>
              <!-- Inner White Ring -->
              <circle cx="18" cy="18" r="7" fill="#FFFFFF"/>
              <!-- Center Core Dot -->
              <circle cx="18" cy="18" r="4.5" fill="#B31412"/>
              <defs>
                <linearGradient id="pinGlow" x1="18" y1="2" x2="18" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FFFFFF"/>
                  <stop offset="0.7" stop-color="#FFFFFF" stop-opacity="0"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      `,
      iconSize: [38, 54],
      iconAnchor: [19, 52], // Needle tip anchor
    });

    const marker = L.marker([latitude, longitude], {
      icon: customPinIcon,
      draggable: true,
      autoPan: true,
      title: 'Drag this pin across the map to adjust cadastral coordinates',
    }).addTo(map);
    markerRef.current = marker;

    // Draggable Pin Event: real-time coordinate updates WHILE dragging
    marker.on('dragstart', () => {
      setIsDraggingPin(true);
    });

    marker.on('drag', () => {
      const pos = marker.getLatLng();
      const newLat = parseFloat(pos.lat.toFixed(6));
      const newLng = parseFloat(pos.lng.toFixed(6));
      setLatInput(newLat.toFixed(6));
      setLngInput(newLng.toFixed(6));
      onChange({ lat: newLat, lng: newLng });

      // Update floating tooltip badge with live coordinates
      const tooltip = document.getElementById('draggable-pin-tooltip');
      if (tooltip) {
        tooltip.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span><span>${newLat.toFixed(5)}°, ${newLng.toFixed(5)}°</span>`;
      }
    });

    marker.on('dragend', () => {
      setIsDraggingPin(false);
      const pos = marker.getLatLng();
      const newLat = parseFloat(pos.lat.toFixed(6));
      const newLng = parseFloat(pos.lng.toFixed(6));
      setLatInput(newLat.toFixed(6));
      setLngInput(newLng.toFixed(6));
      onChange({ lat: newLat, lng: newLng });

      const tooltip = document.getElementById('draggable-pin-tooltip');
      if (tooltip) {
        tooltip.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>PIN LOCKED</span>`;
      }

      triggerReverseGeocode(newLat, newLng);

      setParseStatus({
        success: true,
        message: `Coordinates adjusted to ${newLat.toFixed(6)}° N, ${newLng.toFixed(6)}° E via draggable pin`,
      });
    });

    // Map Click Event: click anywhere on map to instantly move pin and update coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      const newLat = parseFloat(clickLat.toFixed(6));
      const newLng = parseFloat(clickLng.toFixed(6));
      marker.setLatLng([newLat, newLng]);
      setLatInput(newLat.toFixed(6));
      setLngInput(newLng.toFixed(6));
      onChange({ lat: newLat, lng: newLng });

      const tooltip = document.getElementById('draggable-pin-tooltip');
      if (tooltip) {
        tooltip.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>PIN MOVED</span>`;
      }

      triggerReverseGeocode(newLat, newLng);

      setParseStatus({
        success: true,
        message: `Pin moved to clicked map location: ${newLat.toFixed(6)}° N, ${newLng.toFixed(6)}° E`,
      });
    });

    // Staggered size invalidations for modal animations & dynamic layouts
    const t0 = setTimeout(() => map.invalidateSize(), 50);
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    const t3 = setTimeout(() => map.invalidateSize(), 700);

    // ResizeObserver ensures map tile rendering is never distorted
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) resizeObserver.disconnect();
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

  // Invalidate map size when expanded state toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isExpandedMap, latitude, longitude]);

  // Fine-tuning nudge buttons (0.0001 deg ~ 11m, 0.00002 deg ~ 2m)
  const handleNudge = (deltaLat: number, deltaLng: number) => {
    const curLat = parseFloat(latInput) || latitude;
    const curLng = parseFloat(lngInput) || longitude;
    const newLat = parseFloat((curLat + deltaLat).toFixed(6));
    const newLng = parseFloat((curLng + deltaLng).toFixed(6));
    applyCoordinates(newLat, newLng, 'Pin Fine-Tuning');
  };

  // Comprehensive Search Ingestion: URL, Coordinates, or Geocoded Place Name
  const handleSearchSubmit = async (queryText: string) => {
    const query = queryText.trim();
    if (!query) {
      setParseStatus(null);
      return;
    }

    // 1. Try local synchronous regex extraction first (Google Maps URL or decimal / DMS coordinates)
    const directParsed = parseCoordinatesFromInput(query);
    if (directParsed) {
      applyCoordinates(directParsed.lat, directParsed.lng, directParsed.source);
      return;
    }

    // 2. If it's a URL (especially shortlinks like maps.app.goo.gl, goo.gl/maps, or full web links)
    const isUrlLike = /^(https?:\/\/|maps\.app\.goo\.gl|goo\.gl|www\.google\.|google\.com\/maps)/i.test(query);
    if (isUrlLike) {
      setIsResolving(true);
      setParseStatus({
        success: true,
        loading: true,
        message: 'Resolving Google Maps URL & extracting location pin...',
      });

      try {
        const res = await api.resolveMapsUrl(query);
        if (res.success && typeof res.lat === 'number' && typeof res.lng === 'number') {
          applyCoordinates(res.lat, res.lng, res.source || 'Google Maps Resolved Link');
        } else {
          setParseStatus({
            success: false,
            message: res.error || 'Could not resolve coordinates from link. Please ensure link is public or enter coordinates below.',
          });
        }
      } catch (err: any) {
        setParseStatus({
          success: false,
          message: 'Network error resolving Google Maps link. Please enter coordinates manually.',
        });
      } finally {
        setIsResolving(false);
      }
      return;
    }

    // 3. Address Geocoding: Look up landmark, locality, or address
    setIsResolving(true);
    setParseStatus({
      success: true,
      loading: true,
      message: `Geocoding location "${query}"...`,
    });

    try {
      // First try local backend cadastral geocoder
      const localRes = await api.geocodeAddress(query);
      if (localRes && localRes.latitude && localRes.longitude && localRes.source !== 'Local Prototype Geocoder') {
        applyCoordinates(localRes.latitude, localRes.longitude, `Cadastral DB: ${query}`);
        return;
      }

      // Query OpenStreetMap Nominatim for real-world address resolution
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          const foundLat = parseFloat(nomData[0].lat);
          const foundLng = parseFloat(nomData[0].lon);
          const foundName = nomData[0].display_name;
          applyCoordinates(foundLat, foundLng, `Geocoded: ${nomData[0].display_name.split(',')[0]}`, foundName);
          return;
        }
      }

      // If online lookup returned nothing, use local fallback
      if (localRes && localRes.latitude && localRes.longitude) {
        applyCoordinates(localRes.latitude, localRes.longitude, 'Cadastral Geocoding Fallback');
        return;
      }

      setParseStatus({
        success: false,
        message: `Could not locate "${query}". Please paste a Google Maps link or enter latitude and longitude manually.`,
      });
    } catch {
      setParseStatus({
        success: false,
        message: 'Could not connect to geocoding service. Please enter coordinates manually.',
      });
    } finally {
      setIsResolving(false);
    }
  };

  // Handle Manual Lat/Lng inputs with live map synchronization
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
          message: `Latitude adjusted to ${parsed.toFixed(6)}° N`,
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
          message: `Longitude adjusted to ${parsed.toFixed(6)}° E`,
        });
      }
    }
  };

  // Use Surveyor Device GPS
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setParseStatus({
        success: false,
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setIsLocatingGps(true);
    setParseStatus({
      success: true,
      loading: true,
      message: 'Acquiring high-accuracy GNSS hardware fix from surveyor device...',
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        applyCoordinates(lat, lng, 'Surveyor GNSS Hardware Fix');
      },
      (err) => {
        setIsLocatingGps(false);
        setParseStatus({
          success: false,
          message: `GPS error: ${err.message || 'Unable to retrieve location'}. Please enter coordinates manually.`,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Quick Preset Hotspot Handlers
  const applyPreset = (lat: number, lng: number, label: string) => {
    setSearchInput('');
    applyCoordinates(lat, lng, `Cadastral Hotspot: ${label}`);
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-xs transition-all ${
        isExpandedMap
          ? 'fixed inset-3 sm:inset-6 z-50 flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl ring-1 ring-slate-900/10'
          : 'p-4 sm:p-5 space-y-4'
      }`}
    >
      {/* 1. Header Bar: Title, Draggable Pin Indicator, & Layer Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <MapPin className="w-5 h-5 fill-white text-red-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm font-sans flex items-center gap-1.5">
                Map Window & Draggable Pin Location
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-mono font-bold flex items-center gap-1">
                <Move className="w-2.5 h-2.5" />
                Move Pin to Adjust Coords
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Drag the red pin on the map or click any point to adjust coordinates in real time.
            </p>
          </div>
        </div>

        {/* Right side controls: Layer buttons + Fullscreen expand toggle */}
        <div className="flex items-center gap-2">
          {/* Map Layer Switcher */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-[11px] font-mono shadow-2xs">
            <button
              type="button"
              onClick={() => setMapLayer('streets')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                mapLayer === 'streets'
                  ? 'bg-[#1e3a8a] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Streets
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('satellite')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                mapLayer === 'satellite'
                  ? 'bg-[#1e3a8a] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('topo')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                mapLayer === 'topo'
                  ? 'bg-[#1e3a8a] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Topo
            </button>
          </div>

          {/* Expand / Collapse Map Window Button */}
          <button
            type="button"
            onClick={() => setIsExpandedMap(!isExpandedMap)}
            title={isExpandedMap ? 'Exit full map window' : 'Expand full map window'}
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer transition-colors"
          >
            {isExpandedMap ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Google Maps Link / Location Search Input */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold text-slate-700 flex items-center justify-between font-mono">
          <span className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-700" />
            <span>Search Location, Address or Paste Google Maps Link:</span>
          </span>
          <span className="text-[10px] text-slate-500 font-sans font-normal hidden sm:inline">
            Paste Google Maps link, coordinates, or type city/area name
          </span>
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchSubmit(searchInput);
              }
            }}
            placeholder="Paste Google Maps URL (maps.app.goo.gl) or search 'HITEC City Hyderabad', 'Malkajgiri'..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-32 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:bg-white focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] focus:outline-none transition-all shadow-2xs"
          />
          <LinkIcon className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />

          {/* Action buttons inside search bar */}
          <div className="absolute right-1.5 flex items-center gap-1">
            {isResolving && <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-1" />}
            <button
              type="button"
              onClick={() => handleSearchSubmit(searchInput)}
              disabled={isResolving || !searchInput.trim()}
              className="px-2.5 py-1 text-[11px] bg-[#1e3a8a] hover:bg-blue-900 text-white font-medium rounded-lg font-mono transition-colors cursor-pointer shadow-xs disabled:opacity-40"
            >
              Locate
            </button>
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setParseStatus(null);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-700 font-mono px-1.5 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Parse Feedback Banner */}
      {parseStatus && (
        <div
          className={`px-3 py-2 rounded-xl text-[11px] font-mono flex items-center gap-2 border transition-all ${
            parseStatus.loading
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : parseStatus.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {parseStatus.loading ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-spin" />
          ) : parseStatus.success ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          <span className="truncate">{parseStatus.message}</span>
        </div>
      )}

      {/* 3. Embedded Interactive Map Window Canvas */}
      <div
        className={`relative rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100 ${
          isExpandedMap ? 'flex-1 min-h-[400px]' : 'h-72 sm:h-80'
        }`}
      >
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="h-full w-full z-0 bg-slate-200" />

        {/* Top-Left Instruction Overlay */}
        <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200/90 shadow-md flex items-center gap-2 text-[11px] font-mono text-slate-800 pointer-events-none">
          <Crosshair className="w-3.5 h-3.5 text-red-600 shrink-0 animate-pulse" />
          <span className="font-semibold">
            {isDraggingPin
              ? 'Dragging pin... releasing locks coordinates'
              : 'Drag red pin or click map to set coordinates'}
          </span>
        </div>

        {/* Top-Right GPS & Re-center Buttons */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUseCurrentGps}
            disabled={isLocatingGps}
            title="Lock surveyor GNSS hardware GPS"
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-300 shadow-md flex items-center gap-1.5 text-[11px] font-mono cursor-pointer transition-colors font-medium"
          >
            {isLocatingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1e3a8a]" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>GPS Fix</span>
          </button>
          <button
            type="button"
            onClick={() => recenterMap(latitude, longitude, 18)}
            title="Re-center map on active pin"
            className="w-8 h-8 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 shadow-md flex items-center justify-center text-slate-700 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-[#1e3a8a]" />
          </button>
        </div>

        {/* Bottom-Left Live Coordinate HUD */}
        <div className="absolute bottom-2.5 left-2.5 z-10 bg-slate-900/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-[11px] font-mono flex items-center gap-2 shadow-lg border border-slate-800">
          <MapPin className="w-3.5 h-3.5 text-red-400 fill-red-400" />
          <span>
            Lat: <strong>{latitude.toFixed(6)}° N</strong> &bull; Lng: <strong>{longitude.toFixed(6)}° E</strong>
          </span>
          <span className="hidden sm:inline text-[9px] bg-red-600/80 px-1.5 py-0.2 rounded font-sans font-bold uppercase tracking-wider">
            Live Pin
          </span>
        </div>
      </div>

      {/* 4. Live Synchronized Coordinates Inputs & Fine-Tuning Controls */}
      <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 font-mono">
            <Crosshair className="w-3.5 h-3.5 text-[#1e3a8a]" />
            <span>Real-Time Cadastral Coordinates:</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            WGS84 EPSG:4326 Datum (Moving pin auto-updates inputs)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Latitude Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700 font-mono">
                Latitude (° N):
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleNudge(-0.0001, 0)}
                  title="Nudge South (-0.0001°)"
                  className="px-1.5 py-0.5 text-[10px] bg-white hover:bg-slate-100 border border-slate-200 rounded font-mono text-slate-600 cursor-pointer shadow-2xs"
                >
                  -0.0001° S
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0.0001, 0)}
                  title="Nudge North (+0.0001°)"
                  className="px-1.5 py-0.5 text-[10px] bg-white hover:bg-slate-100 border border-slate-200 rounded font-mono text-slate-600 cursor-pointer shadow-2xs"
                >
                  +0.0001° N
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={latInput}
                onChange={(e) => handleManualCoordChange('lat', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-slate-900 font-bold focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] focus:outline-none shadow-2xs"
                placeholder="17.443372"
              />
              <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400">°N</span>
            </div>
          </div>

          {/* Longitude Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700 font-mono">
                Longitude (° E):
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleNudge(0, -0.0001)}
                  title="Nudge West (-0.0001°)"
                  className="px-1.5 py-0.5 text-[10px] bg-white hover:bg-slate-100 border border-slate-200 rounded font-mono text-slate-600 cursor-pointer shadow-2xs"
                >
                  -0.0001° W
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0, 0.0001)}
                  title="Nudge East (+0.0001°)"
                  className="px-1.5 py-0.5 text-[10px] bg-white hover:bg-slate-100 border border-slate-200 rounded font-mono text-slate-600 cursor-pointer shadow-2xs"
                >
                  +0.0001° E
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={lngInput}
                onChange={(e) => handleManualCoordChange('lng', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-slate-900 font-bold focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] focus:outline-none shadow-2xs"
                placeholder="78.541003"
              />
              <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400">°E</span>
            </div>
          </div>
        </div>

        {/* Reverse Geocoded Address Preview & Apply Button */}
        {resolvedAddress && (
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-md">
              <Building className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="font-mono text-[10px] text-slate-400">Detected Address:</span>
              <span className="font-medium text-slate-800 truncate">{resolvedAddress}</span>
            </div>
            {onAddressSuggest && (
              <button
                type="button"
                onClick={() => onAddressSuggest(resolvedAddress)}
                className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1e3a8a] font-mono text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Apply as Building Address
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Quick Cadastral Hotspots Presets */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px]">
        <span className="text-slate-500 font-mono flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-[#1e3a8a]" />
          <span>Cadastral Hotspots:</span>
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => applyPreset(17.443372, 78.541003, 'Malkajgiri Municipal Sector (B001)')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-mono text-[10px] cursor-pointer transition-colors font-medium"
          >
            Malkajgiri
          </button>
          <button
            type="button"
            onClick={() => applyPreset(17.448500, 78.374800, 'HITEC City Tech Park (B999)')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-mono text-[10px] cursor-pointer transition-colors font-medium"
          >
            HITEC City
          </button>
          <button
            type="button"
            onClick={() => applyPreset(17.424346, 78.650351, 'Godavari Towers (B411)')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-mono text-[10px] cursor-pointer transition-colors font-medium"
          >
            Godavari Towers
          </button>
          <button
            type="button"
            onClick={() => applyPreset(17.422281, 78.644636, 'Sri Balaji Heights (B466)')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-mono text-[10px] cursor-pointer transition-colors font-medium"
          >
            Sri Balaji Heights
          </button>
        </div>
      </div>

      {isExpandedMap && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setIsExpandedMap(false)}
            className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs cursor-pointer shadow-md"
          >
            Done Adjusting Coordinates
          </button>
        </div>
      )}
    </div>
  );
};
