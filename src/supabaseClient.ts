/**
 * Supabase Client Initialization for GeoCadastre 3D
 * Smart India Hackathon 2026 (SIH26011) Prototype
 *
 * Configures Supabase client for PostgreSQL with PostGIS queries
 * and Supabase Storage bucket 'building-models' for 3D binary GLB assets.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite environment or local configuration
const defaultUrl = (((import.meta as any).env?.VITE_SUPABASE_URL) as string) || '';
const defaultAnonKey = (((import.meta as any).env?.VITE_SUPABASE_ANON_KEY) as string) || '';

// Fallback or user-overridden configuration from localStorage (for easy testing without restarting containers)
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('geocadastre_supabase_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('geocadastre_supabase_key') : null;

export const SUPABASE_URL = storedUrl || defaultUrl;
export const SUPABASE_ANON_KEY = storedKey || defaultAnonKey;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('your-project') &&
  !SUPABASE_ANON_KEY.includes('your-anon-key')
);

// Lazy singleton initialization of Supabase client
let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
}

export const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const BUCKET_NAME = 'building-models';

/**
 * Configure or update Supabase credentials at runtime
 */
export function setRuntimeSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('geocadastre_supabase_url', url.trim());
    localStorage.setItem('geocadastre_supabase_key', key.trim());
    window.location.reload();
  }
}

/**
 * Clear stored Supabase credentials
 */
export function clearRuntimeSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('geocadastre_supabase_url');
    localStorage.removeItem('geocadastre_supabase_key');
    window.location.reload();
  }
}
