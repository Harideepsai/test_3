/**
 * Authentication and Role-Based Access Control (RBAC) Service
 * Smart India Hackathon 2026 (SIH26011) - GeoCadastre 3D
 *
 * Pre-configured with 5 Evaluation Personas:
 * 1. Licensed Surveyor / Architect ('surveyor')
 * 2. Municipal Town Planner - ULB ('town_planner')
 * 3. Revenue / Sub-Registrar Officer - SRO / IGRS ('sro_officer')
 * 4. General Citizen / Bank Appraiser ('citizen')
 * 5. Emergency Field Responder - Disaster Management ('emergency_responder')
 *
 * Common Demo Password: "guest123"
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../supabaseClient';
import { DemoPersona, UserProfile, UserRole } from '../types';

export const DEMO_PERSONAS: Record<UserRole, DemoPersona> = {
  surveyor: {
    id: 'usr-surveyor-01',
    name: 'Er. Rajesh Varma',
    email: 'surveyor@demo.com',
    role: 'surveyor',
    roleTitle: 'Licensed Cadastral Surveyor',
    organization: 'Telangana Licensed Surveyors Guild (Reg #TS/LS/2021/88)',
    badgeColor: 'amber',
    description: 'Authorized to capture coordinates, upload 3D models/blueprints, and submit draft cadastral records.',
  },
  town_planner: {
    id: 'usr-planner-01',
    name: 'K. S. Narayana, IAS (ULB)',
    email: 'planner@demo.com',
    role: 'town_planner',
    roleTitle: 'Municipal Town Planning Officer',
    organization: 'Urban Local Body (ULB) & Directorate of Town Planning',
    badgeColor: 'indigo',
    description: 'Authorized to audit 3D building envelopes, FSI compliance, setbacks, and approve geometry for SRO.',
  },
  sro_officer: {
    id: 'usr-sro-01',
    name: 'M. S. Reddy, IGRS',
    email: 'sro@demo.com',
    role: 'sro_officer',
    roleTitle: 'Sub-Registrar Officer (SRO / IGRS)',
    organization: 'Registration & Stamps Department, Telangana',
    badgeColor: 'cyan',
    description: 'Exclusive authority to append title deed numbers, seal ownerships, issue 3D ULPINs, and lock cadastre.',
  },
  citizen: {
    id: 'usr-citizen-01',
    name: 'Smt. Kavitha Rao',
    email: 'citizen@demo.com',
    role: 'citizen',
    roleTitle: 'Citizen / Bank Title Appraiser',
    organization: 'Public Cadastral Title Verification Portal',
    badgeColor: 'slate',
    description: 'Public read-only inspection of registered 3D property records, encumbrances, and verified meshes.',
  },
  emergency_responder: {
    id: 'usr-responder-01',
    name: 'Capt. Vikram Singh, NDRF',
    email: 'responder@demo.com',
    role: 'emergency_responder',
    roleTitle: 'Emergency Field Commander',
    organization: 'National Disaster Response Force (NDRF) / Fire Tactical Unit',
    badgeColor: 'rose',
    description: 'Tactical HUD mode with 300m GPS proximity scans, vertical level slices, and strict zero-trust citizen privacy.',
  },
};

const COMMON_DEMO_PASSWORD = 'guest123';
const AUTH_STORAGE_KEY = 'geocadastre_active_user_role';

interface AuthContextType {
  currentUser: UserProfile;
  activePersona: DemoPersona;
  currentRole: UserRole;
  isSupabaseAuthActive: boolean;
  isLoading: boolean;
  error: string | null;
  switchPersona: (role: UserRole) => Promise<void>;
  signInWithCredentials: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  canUploadCadastre: boolean;
  canApprovePlanning: boolean;
  canFinalizeSRO: boolean;
  isTacticalEmergencyMode: boolean;
  isPublicCitizenMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('surveyor');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupabaseAuthActive, setIsSupabaseAuthActive] = useState<boolean>(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY) as UserRole | null;
      if (stored && DEMO_PERSONAS[stored]) {
        setCurrentRole(stored);
      }
    } catch (e) {
      console.warn('Could not read auth from localStorage:', e);
    }
  }, []);

  const activePersona = DEMO_PERSONAS[currentRole] || DEMO_PERSONAS.surveyor;

  const currentUser: UserProfile = {
    id: activePersona.id,
    email: activePersona.email,
    role: activePersona.role,
    full_name: activePersona.name,
    organization: activePersona.organization,
    created_at: new Date().toISOString(),
  };

  // Switch persona seamlessly (with Supabase signIn attempt if client is live)
  const switchPersona = useCallback(async (newRole: UserRole) => {
    setIsLoading(true);
    setError(null);

    const targetPersona = DEMO_PERSONAS[newRole];
    if (!targetPersona) {
      setIsLoading(false);
      return;
    }

    try {
      setCurrentRole(newRole);
      localStorage.setItem(AUTH_STORAGE_KEY, newRole);

      // Attempt live Supabase Auth session if configured
      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: targetPersona.email,
            password: COMMON_DEMO_PASSWORD,
          });

          if (signInErr) {
            // Attempt automatic account sign up if account does not exist yet
            await supabase.auth.signUp({
              email: targetPersona.email,
              password: COMMON_DEMO_PASSWORD,
              options: {
                data: {
                  role: targetPersona.role,
                  full_name: targetPersona.name,
                  organization: targetPersona.organization,
                },
              },
            });
          }
          setIsSupabaseAuthActive(true);
        }
      }
    } catch (err: any) {
      console.warn('Supabase Auth sync note (local fallback active):', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithCredentials = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // Find matching demo persona by email
      const matched = Object.values(DEMO_PERSONAS).find(
        (p) => p.email.toLowerCase() === email.toLowerCase()
      );
      if (matched && pass === COMMON_DEMO_PASSWORD) {
        await switchPersona(matched.role);
        return true;
      }

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error: err } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
          });
          if (!err && data.user) {
            const role = (data.user.user_metadata?.role as UserRole) || 'citizen';
            await switchPersona(role);
            return true;
          }
        }
      }
      setError('Invalid credentials. Use any demo persona with password "guest123"');
      return false;
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.auth.signOut();
        }
      }
      // Revert to public Citizen role
      await switchPersona('citizen');
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper flags
  const canUploadCadastre = currentRole === 'surveyor';
  const canApprovePlanning = currentRole === 'town_planner';
  const canFinalizeSRO = currentRole === 'sro_officer';
  const isTacticalEmergencyMode = currentRole === 'emergency_responder';
  const isPublicCitizenMode = currentRole === 'citizen';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activePersona,
        currentRole,
        isSupabaseAuthActive,
        isLoading,
        error,
        switchPersona,
        signInWithCredentials,
        signOut,
        canUploadCadastre,
        canApprovePlanning,
        canFinalizeSRO,
        isTacticalEmergencyMode,
        isPublicCitizenMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
