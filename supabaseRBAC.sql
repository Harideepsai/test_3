-- ==============================================================================
-- GeoCadastre 3D: End-to-End RBAC Governance, Review Queues & RLS Migration
-- Smart India Hackathon 2026 (SIH26011) - 3D ULPIN & Vertical Property Mapping
-- ==============================================================================

-- 1. Enable pgcrypto and PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Enhance buildings table with Governance Lifecycle Fields
ALTER TABLE IF EXISTS public.buildings 
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'plan_verified', 'registered')),
  ADD COLUMN IF NOT EXISTS rejection_remarks TEXT,
  ADD COLUMN IF NOT EXISTS verified_by UUID,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID,
  ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS deed_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS max_permitted_height NUMERIC(6,2) DEFAULT 15.0,
  ADD COLUMN IF NOT EXISTS setback_margin_required NUMERIC(5,2) DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS fsi_permitted NUMERIC(4,2) DEFAULT 2.50,
  ADD COLUMN IF NOT EXISTS fsi_actual NUMERIC(4,2) DEFAULT 1.85;

-- 3. Create User Profiles table linked to auth.users with RBAC role
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('surveyor', 'town_planner', 'sro_officer', 'citizen', 'emergency_responder')),
  organization VARCHAR(150),
  license_number VARCHAR(80),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Helper function to fetch the current authenticated user's role
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS VARCHAR(30)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_role VARCHAR(30);
BEGIN
  -- Check user_profiles table first
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Fallback to user metadata in JWT token
  v_role := COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'citizen'
  );
  RETURN v_role;
END;
$$;

-- Trigger to automatically mirror new Supabase Auth sign-ups into user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role VARCHAR(30);
  v_name VARCHAR(120);
  v_org VARCHAR(150);
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'citizen');
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
  v_org  := COALESCE(NEW.raw_user_meta_data->>'organization', 'Public Cadastral User');

  INSERT INTO public.user_profiles (id, email, full_name, role, organization)
  VALUES (NEW.id, NEW.email, v_name, v_role, v_org)
  ON CONFLICT (id) DO UPDATE
  SET 
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    organization = EXCLUDED.organization,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ==============================================================================
-- 4. Supabase Row-Level Security (RLS) Configuration
-- ==============================================================================

-- Enable RLS across all cadastral domain tables
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_geometries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prototype_3d_property_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_records ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. BUILDINGS TABLE POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "buildings_select_policy" ON public.buildings;
DROP POLICY IF EXISTS "buildings_insert_surveyor" ON public.buildings;
DROP POLICY IF EXISTS "buildings_update_planner" ON public.buildings;
DROP POLICY IF EXISTS "buildings_update_sro" ON public.buildings;

-- SELECT:
-- - emergency_responder: can view all buildings for volumetric tactical hazard triage
-- - citizen: can view ONLY 'registered' buildings
-- - surveyor: can view their own drafts or registered buildings
-- - town_planner: can view 'draft' and 'plan_verified' (and 'registered')
-- - sro_officer: can view 'plan_verified' and 'registered' (full inspection)
CREATE POLICY "buildings_select_policy" ON public.buildings
  FOR SELECT
  USING (
    public.auth_user_role() = 'emergency_responder'
    OR (public.auth_user_role() = 'citizen' AND status = 'registered')
    OR (public.auth_user_role() = 'surveyor')
    OR (public.auth_user_role() = 'town_planner')
    OR (public.auth_user_role() = 'sro_officer')
  );

-- INSERT: Only licensed surveyors can submit new draft buildings
CREATE POLICY "buildings_insert_surveyor" ON public.buildings
  FOR INSERT
  WITH CHECK (
    public.auth_user_role() = 'surveyor'
    AND status = 'draft'
  );

-- UPDATE:
-- Surveyor can update their draft
-- Town Planner can update 'draft' to 'plan_verified' (or reject with remarks)
-- SRO Officer can transition 'plan_verified' to 'registered'
CREATE POLICY "buildings_update_governance" ON public.buildings
  FOR UPDATE
  USING (
    (public.auth_user_role() = 'surveyor' AND status = 'draft')
    OR (public.auth_user_role() = 'town_planner' AND status IN ('draft', 'plan_verified'))
    OR (public.auth_user_role() = 'sro_officer' AND status IN ('plan_verified', 'registered'))
  )
  WITH CHECK (
    (public.auth_user_role() = 'surveyor' AND status = 'draft')
    OR (public.auth_user_role() = 'town_planner' AND status IN ('draft', 'plan_verified'))
    OR (public.auth_user_role() = 'sro_officer' AND status IN ('plan_verified', 'registered'))
  );

-- ------------------------------------------------------------------------------
-- B. FLOORS & VERTICAL GEOMETRIES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "floors_select_policy" ON public.floors;
CREATE POLICY "floors_select_policy" ON public.floors
  FOR SELECT
  USING (
    public.auth_user_role() IN ('emergency_responder', 'surveyor', 'town_planner', 'sro_officer', 'citizen')
  );

DROP POLICY IF EXISTS "floors_mutation_policy" ON public.floors;
CREATE POLICY "floors_mutation_policy" ON public.floors
  FOR ALL
  USING (public.auth_user_role() IN ('surveyor', 'town_planner', 'sro_officer'));

DROP POLICY IF EXISTS "geometries_select_policy" ON public.vertical_geometries;
CREATE POLICY "geometries_select_policy" ON public.vertical_geometries
  FOR SELECT
  USING (
    -- Tactical emergency responders strictly have 3D geometry access for structural heights
    public.auth_user_role() IN ('emergency_responder', 'surveyor', 'town_planner', 'sro_officer', 'citizen')
  );

DROP POLICY IF EXISTS "geometries_mutation_policy" ON public.vertical_geometries;
CREATE POLICY "geometries_mutation_policy" ON public.vertical_geometries
  FOR ALL
  USING (public.auth_user_role() IN ('surveyor', 'sro_officer'));

-- ------------------------------------------------------------------------------
-- C. PRIVACY ENFORCEMENT ON OWNERS, OWNERSHIPS & PROPERTY RECORDS
-- CRITICAL ZERO-TRUST REQUIREMENT:
-- emergency_responder is strictly blocked from reading owners, ownerships, and property_records!
-- citizen can only read registered unit records.
-- sro_officer has full read/write.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "owners_privacy_policy" ON public.owners;
CREATE POLICY "owners_privacy_policy" ON public.owners
  FOR SELECT
  USING (
    -- Zero-trust: Emergency responders CANNOT select owners
    public.auth_user_role() != 'emergency_responder'
    AND (
      public.auth_user_role() IN ('sro_officer', 'town_planner', 'surveyor')
      OR public.auth_user_role() = 'citizen'
    )
  );

DROP POLICY IF EXISTS "owners_sro_mutate" ON public.owners;
CREATE POLICY "owners_sro_mutate" ON public.owners
  FOR ALL
  USING (public.auth_user_role() = 'sro_officer');

DROP POLICY IF EXISTS "ownerships_privacy_policy" ON public.ownerships;
CREATE POLICY "ownerships_privacy_policy" ON public.ownerships
  FOR SELECT
  USING (
    -- Zero-trust: Emergency responders CANNOT select ownerships
    public.auth_user_role() != 'emergency_responder'
    AND (
      public.auth_user_role() IN ('sro_officer', 'town_planner', 'surveyor')
      OR public.auth_user_role() = 'citizen'
    )
  );

DROP POLICY IF EXISTS "ownerships_sro_mutate" ON public.ownerships;
CREATE POLICY "ownerships_sro_mutate" ON public.ownerships
  FOR ALL
  USING (public.auth_user_role() = 'sro_officer');

DROP POLICY IF EXISTS "property_records_privacy_policy" ON public.property_records;
CREATE POLICY "property_records_privacy_policy" ON public.property_records
  FOR SELECT
  USING (
    -- Zero-trust: Emergency responders CANNOT select financial/legal records
    public.auth_user_role() != 'emergency_responder'
    AND (
      public.auth_user_role() IN ('sro_officer', 'town_planner', 'surveyor')
      OR public.auth_user_role() = 'citizen'
    )
  );

DROP POLICY IF EXISTS "property_records_sro_mutate" ON public.property_records;
CREATE POLICY "property_records_sro_mutate" ON public.property_records
  FOR ALL
  USING (public.auth_user_role() = 'sro_officer');

-- ------------------------------------------------------------------------------
-- D. 3D PROPERTY IDS (3D ULPIN) POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "ulpins_select_policy" ON public.prototype_3d_property_ids;
CREATE POLICY "ulpins_select_policy" ON public.prototype_3d_property_ids
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "ulpins_sro_mutate" ON public.prototype_3d_property_ids;
CREATE POLICY "ulpins_sro_mutate" ON public.prototype_3d_property_ids
  FOR ALL
  USING (public.auth_user_role() = 'sro_officer');

-- ==============================================================================
-- 5. PostGIS Proximity Function for Emergency Responders (300-meter radius)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_proximate_tactical_buildings(
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION DEFAULT 300.0
)
RETURNS TABLE (
  id UUID,
  building_id VARCHAR(50),
  survey_number VARCHAR(100),
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  total_floors INT,
  total_height NUMERIC,
  status VARCHAR(30),
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    b.id,
    b.building_id,
    b.survey_number,
    b.address,
    b.latitude,
    b.longitude,
    b.total_floors,
    b.total_height,
    b.status,
    ST_Distance(
      b.geom::geography, 
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters
  FROM public.buildings b
  WHERE 
    b.geom IS NOT NULL
    AND ST_DWithin(
      b.geom::geography, 
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, 
      p_radius_meters
    )
  ORDER BY distance_meters ASC;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_proximate_tactical_buildings TO authenticated, anon;
