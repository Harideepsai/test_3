import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Building, Location } from '../types';
import { MapPin, Navigation, Search, Layers, Compass, CheckCircle2 } from 'lucide-react';

interface LeafletMapProps {
  building: Building | null;
  location?: Location | null;
  isSelected?: boolean;
  onCoordinatesChange?: (lat: number, lng: number) => void;
  allowEditCoordinates?: boolean;
  onBuildingClick?: (buildingId: string) => void;
  isInitialBlank?: boolean;
  isEmptyParcel?: boolean;
  searchedCoords?: { lat: number; lng: number } | null;
  searchRadius?: number;
  onOpenIngestionModal?: () => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  building,
  location,
  isSelected = true,
  onCoordinatesChange,
  allowEditCoordinates = false,
  onBuildingClick,
  isInitialBlank = false,
  isEmptyParcel = false,
  searchedCoords = null,
  searchRadius = 25,
  onOpenIngestionModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);

  const [mapType, setMapType] = useState<'carto' | 'osm' | 'satellite'>('carto');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<string | null>(null);

  const activeCoords = searchedCoords || {
    lat: location?.latitude ?? building?.latitude ?? 17.4485,
    lng: location?.longitude ?? building?.longitude ?? 78.3748,
  };
  const lat = activeCoords.lat;
  const lng = activeCoords.lng;
  const address = location?.address ?? building?.address ?? 'Cadastral Parcel at Hyderabad, Telangana';
  const surveyNo = building?.survey_number || 'Unregistered Parcel';
  const bldId = building?.building_id || 'Parcel';

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 17,
      zoomControl: false,
    });
    mapInstanceRef.current = map;

    // Custom Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Default tile layer (CartoDB Dark Matter / Cadastral GIS style)
    const tileUrl =
      mapType === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : mapType === 'osm'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO &copy; Survey of India Cadastral Grid',
    }).addTo(map);

    // Custom Cadastral Icon
    const customIcon = L.divIcon({
      className: 'custom-cadastral-pin',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-cyan-500/90 border-2 border-white shadow-xl flex items-center justify-center text-slate-950 font-bold text-xs ${
            isSelected ? 'ring-4 ring-cyan-400/50 animate-bounce' : ''
          }">
            3D
          </div>
          <div class="absolute -bottom-1 w-2 h-2 bg-cyan-600 rotate-45"></div>
        </div>
      `,
      iconSize: [32, 36],
      iconAnchor: [16, 36],
    });

    const marker = L.marker([lat, lng], { icon: customIcon, draggable: allowEditCoordinates }).addTo(map);
    markerRef.current = marker;

    const popupHtml = document.createElement('div');
    popupHtml.className = 'p-2 text-slate-900 text-xs font-sans min-w-[200px]';
    popupHtml.innerHTML = `
      <div class="font-bold text-sm text-cyan-800 flex items-center justify-between">
        <span>Building ${bldId}</span>
        <span class="text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-mono font-bold">G+3 Floors</span>
      </div>
      <div class="mt-1 text-slate-600"><strong>Survey No:</strong> ${surveyNo}</div>
      <div class="text-slate-600"><strong>Total Units:</strong> 8 Units (Parking, Security & 6 Flats)</div>
      <div class="text-slate-600"><strong>Coords:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
      <div class="mt-1 text-[11px] text-slate-500">${address}</div>
      <button id="btn-transform-3d" class="mt-2.5 w-full py-1.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-md shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer">
        <span>🏢 Open in 3D Building Model</span>
      </button>
    `;

    marker.bindPopup(popupHtml);

    marker.on('popupopen', () => {
      const btn = document.getElementById('btn-transform-3d');
      if (btn && onBuildingClick) {
        btn.onclick = () => {
          onBuildingClick(bldId);
        };
      }
    });

    marker.on('click', () => {
      if (onBuildingClick) {
        onBuildingClick(bldId);
      }
    });

    // Draw Plot Parcel Boundary Polygon
    const deltaLat = 0.00035;
    const deltaLng = 0.00045;
    const parcelCoords: [number, number][] = [
      [lat - deltaLat, lng - deltaLng],
      [lat - deltaLat, lng + deltaLng],
      [lat + deltaLat, lng + deltaLng],
      [lat + deltaLat, lng - deltaLng],
    ];

    const parcel = L.polygon(parcelCoords, {
      color: '#0284c7',
      weight: 2,
      fillColor: '#38bdf8',
      fillOpacity: isSelected ? 0.35 : 0.15,
      dashArray: '4, 4',
      className: 'cursor-pointer hover:fill-opacity-50 transition-all',
    }).addTo(map);
    polygonRef.current = parcel;

    parcel.bindTooltip(`🏢 <strong>Building ${bldId}</strong><br/><span style="font-size: 10px; color: #0284c7;">Click to transform into 3D Model</span>`, {
      sticky: true,
      direction: 'top',
    });

    parcel.on('click', () => {
      if (onBuildingClick) {
        onBuildingClick(bldId);
      }
    });

    // Handle map click for manual coordinates picking
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (allowEditCoordinates && onCoordinatesChange) {
        onCoordinatesChange(e.latlng.lat, e.latlng.lng);
      }
    });

    if (allowEditCoordinates) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        if (onCoordinatesChange) {
          onCoordinatesChange(pos.lat, pos.lng);
        }
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update marker position, parcel polygon, and search radius circle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove or create radius circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
      radiusCircleRef.current = null;
    }

    if (!isInitialBlank) {
      radiusCircleRef.current = L.circle([lat, lng], {
        radius: searchRadius,
        color: isEmptyParcel ? '#f59e0b' : '#06b6d4',
        weight: 1.5,
        dashArray: '3, 3',
        fillColor: isEmptyParcel ? '#fbbf24' : '#0284c7',
        fillOpacity: 0.08,
      }).addTo(map);

      radiusCircleRef.current.bindTooltip(
        `PostGIS ST_DWithin search radius: ${searchRadius}m`,
        { direction: 'bottom' }
      );
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);

      const customIcon = L.divIcon({
        className: 'custom-cadastral-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full ${
              isEmptyParcel ? 'bg-amber-500' : 'bg-cyan-500'
            } border-2 border-white shadow-xl flex items-center justify-center text-slate-950 font-bold text-xs ${
          isSelected ? 'ring-4 ring-cyan-400/50' : ''
        }">
              ${isEmptyParcel ? '📍' : '3D'}
            </div>
            <div class="absolute -bottom-1 w-2 h-2 ${isEmptyParcel ? 'bg-amber-600' : 'bg-cyan-600'} rotate-45"></div>
          </div>
        `,
        iconSize: [32, 36],
        iconAnchor: [16, 36],
      });
      markerRef.current.setIcon(customIcon);

      if (isEmptyParcel) {
        markerRef.current.bindPopup(`
          <div class="p-2 text-slate-900 text-xs font-sans">
            <div class="font-bold text-amber-700">Unmapped Parcel Location</div>
            <div class="text-slate-600 mt-1 font-mono">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
            <div class="text-slate-500 mt-1">No 3D building found within ${searchRadius}m.</div>
            <button id="btn-unmapped-ingest" class="mt-2 w-full py-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded transition-all cursor-pointer">
              + Register 3D Building
            </button>
          </div>
        `);
        markerRef.current.on('popupopen', () => {
          const btn = document.getElementById('btn-unmapped-ingest');
          if (btn && onOpenIngestionModal) {
            btn.onclick = () => onOpenIngestionModal();
          }
        });
      }
    }

    // 20m x 20m or parcel boundary footprint
    const deltaLat = 0.00018; // approx 20 meters
    const deltaLng = 0.00018;
    const parcelCoords: [number, number][] = [
      [lat - deltaLat, lng - deltaLng],
      [lat - deltaLat, lng + deltaLng],
      [lat + deltaLat, lng + deltaLng],
      [lat + deltaLat, lng - deltaLng],
    ];

    if (polygonRef.current) {
      polygonRef.current.setLatLngs(parcelCoords);
      polygonRef.current.setStyle({
        fillOpacity: isEmptyParcel ? 0.25 : isSelected ? 0.35 : 0.15,
        color: isEmptyParcel ? '#f59e0b' : isSelected ? '#06b6d4' : '#0284c7',
        fillColor: isEmptyParcel ? '#fbbf24' : '#38bdf8',
      });
    }

    map.panTo([lat, lng], { animate: true });
  }, [lat, lng, isSelected, isEmptyParcel, searchRadius, isInitialBlank]);

  // Recenter helper
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1 });
    }
  };

  // Modular geocoding simulation test handler (architecture for future approved APIs)
  const handleGeocodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsGeocoding(true);
    setGeocodeMsg(null);

    try {
      // Calls our backend modular geocoding adapter
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchQuery }),
      });
      const data = await res.json();
      if (data.success && onCoordinatesChange) {
        onCoordinatesChange(data.data.latitude, data.data.longitude);
        setGeocodeMsg(`Geocoded to ${data.data.latitude.toFixed(4)}, ${data.data.longitude.toFixed(4)}`);
      }
    } catch {
      setGeocodeMsg('Geocoding adapter error');
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl flex flex-col">
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Top Floating Bar: Address & Coordinate Search */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-auto">
        <form onSubmit={handleGeocodeSearch} className="flex-1 max-w-md flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Test Address Geocoding (e.g. Madhapur, Hyderabad)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900/90 text-white border border-slate-700 placeholder-slate-400 focus:outline-none focus:border-cyan-500 backdrop-blur-md shadow-lg"
            />
          </div>
          <button
            type="submit"
            disabled={isGeocoding}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-colors disabled:opacity-50"
          >
            {isGeocoding ? 'Locating...' : 'Locate'}
          </button>
        </form>

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-md shadow-lg flex items-center gap-1.5 transition-colors"
          title="Recenter Map on Building B001"
        >
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>Center B001</span>
        </button>
      </div>

      {/* Geocode feedback message */}
      {geocodeMsg && (
        <div className="absolute top-14 left-3 z-10 px-3 py-1 text-xs rounded-md bg-emerald-950/90 border border-emerald-700 text-emerald-300 backdrop-blur-md flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {geocodeMsg}
        </div>
      )}

      {/* Bottom Floating Bar: Coordinates and Cadastral Info */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 z-10 pointer-events-auto">
        <div className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-slate-200 backdrop-blur-md shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lat: {lat.toFixed(5)}° N</span>
            <span className="text-slate-600">|</span>
            <span>Lng: {lng.toFixed(5)}° E</span>
          </div>
          <div className="hidden sm:block text-slate-400">
            Survey: <strong className="text-white">{surveyNo}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
