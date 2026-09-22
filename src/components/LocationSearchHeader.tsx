import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Compass,
  Database,
  ExternalLink,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  PlusCircle,
} from 'lucide-react';
import { isSupabaseConfigured, SUPABASE_URL } from '../supabaseClient';

export interface ParsedCoordinate {
  lat: number;
  lng: number;
  source: string;
}

export function parseCoordinatesOrUrl(input: string): ParsedCoordinate | null {
  if (!input || !input.trim()) return null;
  const str = input.trim();

  // 1. Google Maps @lat,lng format e.g. https://www.google.com/maps/@17.4485,78.3748,17z
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]), source: 'Google Maps @lat,lng URL' };
  }

  // 2. Google Maps ?q=lat,lng or &q=lat,lng e.g. https://maps.google.com/?q=17.4485,78.3748
  const qMatch = str.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]), source: 'Google Maps ?q= query parameter' };
  }

  // 3. Google Maps place !3dlat!4dlng in internal path tokens
  const d3d4Match = str.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (d3d4Match) {
    return { lat: parseFloat(d3d4Match[1]), lng: parseFloat(d3d4Match[2]), source: 'Google Maps 3D/4D coordinate token' };
  }

  // 4. Google Maps /place/lat,lng or /place/lat+lng
  const placeMatch = str.match(/place\/(-?\d+\.\d+)[,+](-?\d+\.\d+)/);
  if (placeMatch) {
    return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]), source: 'Google Maps /place/ link' };
  }

  // 5. Raw decimal Lat, Lng pair: "17.4435, 78.5410", "17.4435; 78.5410", "17.4435° N, 78.5410° E"
  const cleanStr = str.replace(/[°º]/g, '').trim();
  const cardinalMatch = cleanStr.match(/^\s*(-?\d+(?:\.\d+)?)\s*(?:[NnSs])?\s*[,; \t/]\s*(-?\d+(?:\.\d+)?)\s*(?:[EeWw])?\s*$/);
  if (cardinalMatch) {
    let lat = parseFloat(cardinalMatch[1]);
    let lng = parseFloat(cardinalMatch[2]);
    if (/[Ss]\s*$/.test(cleanStr.split(/[,; \t/]+/)[0])) lat = -Math.abs(lat);
    if (/[Ww]\s*$/.test(cleanStr.split(/[,; \t/]+/)[1] || '')) lng = -Math.abs(lng);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, source: 'Decimal GPS Coordinates' };
    }
  }

  return null;
}

interface LocationSearchHeaderProps {
  onSearch: (coords: { lat: number; lng: number }, radiusMeters: number) => void;
  isSearching: boolean;
  currentCoords?: { lat: number; lng: number } | null;
  searchRadius: number;
  onSearchRadiusChange: (radius: number) => void;
  onOpenIngestionModal?: () => void;
  hasActiveBuilding?: boolean;
}

export const LocationSearchHeader: React.FC<LocationSearchHeaderProps> = ({
  onSearch,
  isSearching,
  currentCoords,
  searchRadius,
  onSearchRadiusChange,
  onOpenIngestionModal,
  hasActiveBuilding = false,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedInfo, setParsedInfo] = useState<ParsedCoordinate | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (!val.trim()) {
      setParseError(null);
      setParsedInfo(null);
      return;
    }
    const parsed = parseCoordinatesOrUrl(val);
    if (parsed) {
      setParsedInfo(parsed);
      setParseError(null);
    } else {
      setParsedInfo(null);
      if (val.length > 5 && !val.includes(',') && !val.includes('@') && !val.includes('maps')) {
        setParseError('Please provide latitude and longitude separated by comma (e.g., 17.4435, 78.5410) or paste a Google Maps URL.');
      } else {
        setParseError(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCoordinatesOrUrl(searchInput);
    if (!parsed) {
      setParseError('Invalid format. Please enter GPS Coordinates (e.g., 17.4435, 78.5410) or a Google Maps URL.');
      return;
    }
    setParseError(null);
    onSearch({ lat: parsed.lat, lng: parsed.lng }, searchRadius);
  };

  const handleQuickSelect = (lat: number, lng: number, label: string) => {
    const text = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    setSearchInput(text);
    setParseError(null);
    setParsedInfo({ lat, lng, source: label });
    onSearch({ lat, lng }, searchRadius);
  };

  return (
    <header className="w-full bg-white/95 border-b border-slate-200 backdrop-blur-md sticky top-0 z-40 px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        {/* Top bar with Branding & Supabase Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-100 border border-cyan-300 flex items-center justify-center text-cyan-700 font-bold">
              3D
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm tracking-tight">GeoCadastre 3D</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono font-bold">
                  SIH26011
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Coordinate-Driven PostGIS Cadastre & Supabase 3D Volumetric Mapping
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Supabase Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                isSupabaseConfigured
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-800'
              }`}
              title={
                isSupabaseConfigured
                  ? `Connected to Supabase: ${SUPABASE_URL}`
                  : 'Operating in Local PostGIS Simulation Mode with persistent cache'
              }
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isSupabaseConfigured ? 'Supabase PostGIS Live' : 'Supabase PostGIS Engine'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* Ingest Button shortcut */}
            {onOpenIngestionModal && (
              <button
                id="btn-open-ingestion-header"
                onClick={onOpenIngestionModal}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all border border-cyan-600"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Ingest 3D Building</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Search Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 items-stretch">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4 text-cyan-600" />
            </div>
            <input
              id="global-coordinate-search-input"
              type="text"
              value={searchInput}
              onChange={handleInputChange}
              placeholder="Enter GPS Coordinates (e.g., 17.4435, 78.5410) or Google Maps URL"
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-mono focus:outline-none focus:border-cyan-500 focus:bg-white focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
            />
            {parsedInfo && (
              <div className="absolute inset-y-0 right-2 flex items-center">
                <span className="text-[10px] bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {parsedInfo.lat.toFixed(4)}, {parsedInfo.lng.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {/* Spatial Radius Dropdown Selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
            <span className="text-[11px] text-slate-500">Radius:</span>
            <select
              id="spatial-radius-select"
              value={searchRadius}
              onChange={(e) => onSearchRadiusChange(Number(e.target.value))}
              className="bg-transparent text-cyan-800 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value={25} className="bg-white text-slate-800">25m (ST_DWithin default)</option>
              <option value={50} className="bg-white text-slate-800">50m</option>
              <option value={100} className="bg-white text-slate-800">100m</option>
            </select>
          </div>

          {/* Search Trigger Button */}
          <button
            id="btn-search-coordinates"
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Querying PostGIS...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Locate Parcel</span>
              </>
            )}
          </button>
        </form>

        {/* Error notification if parsing fails */}
        {parseError && (
          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-2 font-mono">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Quick Demo Pre-sets & Presets Bar */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-mono">
          <span className="text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-600" />
            <span>Quick Test:</span>
          </span>
          <button
            type="button"
            onClick={() => handleQuickSelect(17.4485, 78.3748, 'Cyber Towers Registered Cadastre')}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 hover:text-cyan-800 border border-slate-200 hover:border-cyan-300 text-slate-700 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>🏢 Registered Building:</span>
            <span className="text-cyan-700 font-bold">17.4485, 78.3748</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(17.4435, 78.5410, 'Unmapped Parcel Ingestion Target')}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-300 text-slate-700 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>📍 Unmapped Site:</span>
            <span className="text-amber-700 font-bold">17.4435, 78.5410</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const url = 'https://www.google.com/maps/@17.4485,78.3748,17z';
              setSearchInput(url);
              const p = parseCoordinatesOrUrl(url);
              if (p) {
                setParsedInfo(p);
                onSearch({ lat: p.lat, lng: p.lng }, searchRadius);
              }
            }}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3 text-cyan-600" />
            <span>Sample Google Maps URL</span>
          </button>
        </div>
      </div>
    </header>
  );
};
