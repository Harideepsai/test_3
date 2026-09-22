/**
 * Device Geolocation & GPS Tracking Hook for Tactical Field Responders
 * Smart India Hackathon 2026 (SIH26011) - GeoCadastre 3D
 *
 * Implements:
 * 1. navigator.geolocation.getCurrentPosition & watchPosition
 * 2. High-precision GPS tracking with fallback presets (Malkajgiri Disaster Site & Cyber Towers)
 * 3. Proximity scan synchronization (300-meter radius)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface LocationPreset {
  id: string;
  name: string;
  coords: GeoCoordinates;
  description: string;
}

export const DEMO_LOCATION_PRESETS: LocationPreset[] = [
  {
    id: 'malkajgiri',
    name: 'Malkajgiri Disaster Site (Building B001 Area)',
    coords: { lat: 17.443372, lng: 78.541003 },
    description: 'Ground Zero near Survey No. 3127, High-density multi-storey residential zone',
  },
  {
    id: 'cyber-towers',
    name: 'Cyber Towers Tech Corridor',
    coords: { lat: 17.4485, lng: 78.3748 },
    description: 'Commercial high-rise hub, Madhapur, 300m proximate zone',
  },
  {
    id: 'green-heights',
    name: 'Green Heights Sector 4',
    coords: { lat: 17.4435, lng: 78.5418 },
    description: 'Adjacent 4-storey residential block undergoing structural triage',
  },
];

export interface UseDeviceLocationReturn {
  coordinates: GeoCoordinates | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  loading: boolean;
  error: string | null;
  permissionState: 'granted' | 'denied' | 'prompt' | 'unsupported';
  isSimulated: boolean;
  activePresetId: string | null;
  refreshLocation: () => void;
  setSimulatedLocation: (coords: GeoCoordinates, presetId?: string) => void;
  resetToDeviceGPS: () => void;
  locationPresets: LocationPreset[];
}

export function useDeviceLocation(enableWatch: boolean = false): UseDeviceLocationReturn {
  // Default to Malkajgiri disaster site as resilient baseline
  const [coordinates, setCoordinates] = useState<GeoCoordinates | null>({
    lat: 17.443372,
    lng: 78.541003,
  });
  const [accuracy, setAccuracy] = useState<number | null>(12); // meters
  const [altitude, setAltitude] = useState<number | null>(542); // elevation above sea level
  const [heading, setHeading] = useState<number | null>(45);
  const [speed, setSpeed] = useState<number | null>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<
    'granted' | 'denied' | 'prompt' | 'unsupported'
  >('prompt');
  const [isSimulated, setIsSimulated] = useState<boolean>(true);
  const [activePresetId, setActivePresetId] = useState<string | null>('malkajgiri');

  const watchIdRef = useRef<number | null>(null);

  const requestDevicePosition = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setPermissionState('unsupported');
      setError('Geolocation API is not supported on this browser/container');
      return;
    }

    setLoading(true);
    setError(null);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setAccuracy(position.coords.accuracy);
        setAltitude(position.coords.altitude);
        setHeading(position.coords.heading);
        setSpeed(position.coords.speed);
        setLoading(false);
        setIsSimulated(false);
        setActivePresetId(null);
        setPermissionState('granted');
      },
      (err) => {
        console.warn('Device Geolocation notice (falling back to preset):', err.message);
        setError(`Device GPS prompt: ${err.message}. Using Tactical Disaster Site preset.`);
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState('denied');
        }
        // Retain current simulation coordinates
      },
      geoOptions
    );
  }, []);

  useEffect(() => {
    // Check permission status if API is available
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setPermissionState(status.state as any);
          status.onchange = () => {
            setPermissionState(status.state as any);
          };
        })
        .catch(() => {
          // ignore
        });
    }

    // Attempt first device position request
    requestDevicePosition();

    if (enableWatch && typeof navigator !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setCoordinates({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setAccuracy(pos.coords.accuracy);
          setIsSimulated(false);
        },
        (err) => {
          console.warn('WatchPosition error:', err.message);
        },
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enableWatch, requestDevicePosition]);

  const setSimulatedLocation = useCallback((coords: GeoCoordinates, presetId?: string) => {
    setCoordinates(coords);
    setIsSimulated(true);
    setActivePresetId(presetId || null);
    setError(null);
    setAccuracy(5.0); // Simulated high accuracy
  }, []);

  const resetToDeviceGPS = useCallback(() => {
    requestDevicePosition();
  }, [requestDevicePosition]);

  return {
    coordinates,
    accuracy,
    altitude,
    heading,
    speed,
    loading,
    error,
    permissionState,
    isSimulated,
    activePresetId,
    refreshLocation: requestDevicePosition,
    setSimulatedLocation,
    resetToDeviceGPS,
    locationPresets: DEMO_LOCATION_PRESETS,
  };
}
