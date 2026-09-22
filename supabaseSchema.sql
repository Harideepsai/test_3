-- ========================================================================
-- GeoCadastre 3D: Supabase PostgreSQL + PostGIS Schema & Spatial Storage
-- Smart India Hackathon 2026 (SIH26011) Prototype Architecture
-- ========================================================================

-- Enable PostGIS extension for volumetric & cadastral geospatial processing
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUILDINGS TABLE
-- Holds parcel-level cadastral registration, centroid geography, building envelope, and 3D asset references
CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY DEFAULT ('BLD-' || substring(uuid_generate_v4()::text, 1, 8)),
    building_id TEXT UNIQUE, -- Optional legacy/human identifier e.g. "B001"
    survey_number TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    plot_area DOUBLE PRECISION NOT NULL DEFAULT 600.0,
    total_floors INTEGER NOT NULL DEFAULT 4,
    total_height DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    model_url TEXT, -- e.g. Supabase Storage public URL or relative path: buildings/{building_id}/{timestamp}.glb
    model_type TEXT NOT NULL CHECK (model_type IN ('parametric_extruded', 'uploaded_glb', 'hybrid')) DEFAULT 'parametric_extruded',
    sub_mesh_strategy TEXT CHECK (sub_mesh_strategy IN ('named_sub_meshes', 'envelope_sliced', 'none')) DEFAULT 'envelope_sliced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial GIST Index on Building geography points for rapid bounding radius lookups
CREATE INDEX IF NOT EXISTS idx_buildings_geom ON buildings USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_buildings_survey_number ON buildings (survey_number);

-- 2. LOCATIONS TABLE
-- Cadastral geo-referencing, administrative hierarchy, and formatted addresses
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY DEFAULT ('LOC-' || substring(uuid_generate_v4()::text, 1, 8)),
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    formatted_address TEXT NOT NULL,
    state TEXT DEFAULT 'Telangana',
    district TEXT DEFAULT 'Hyderabad',
    pincode TEXT DEFAULT '500081',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_building_id ON locations (building_id);

-- 3. FLOORS TABLE
-- Vertical stratification boundaries (bottom_height to top_height in metres relative to ground level)
CREATE TABLE IF NOT EXISTS floors (
    id TEXT PRIMARY KEY DEFAULT ('FLR-' || substring(uuid_generate_v4()::text, 1, 8)),
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    bottom_height DOUBLE PRECISION NOT NULL,
    top_height DOUBLE PRECISION NOT NULL,
    floor_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_building_floor UNIQUE (building_id, floor_number)
);

CREATE INDEX IF NOT EXISTS idx_floors_building_id ON floors (building_id);

-- 4. PROPERTY UNITS TABLE
-- Individual vertical units (apartments, parking slots, utility spaces)
CREATE TABLE IF NOT EXISTS property_units (
    id TEXT PRIMARY KEY DEFAULT ('PROP-' || substring(uuid_generate_v4()::text, 1, 8)),
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    flat_number TEXT NOT NULL,
    area DOUBLE PRECISION NOT NULL, -- in square metres
    property_type TEXT NOT NULL DEFAULT 'Residential Apartment',
    record_reference TEXT NOT NULL, -- IGRS deed or document token
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_floor_flat UNIQUE (floor_id, flat_number)
);

CREATE INDEX IF NOT EXISTS idx_property_units_building ON property_units (building_id);
CREATE INDEX IF NOT EXISTS idx_property_units_floor ON property_units (floor_id);

-- 5. OWNERS TABLE
-- Legal titleholders and registry individuals
CREATE TABLE IF NOT EXISTS owners (
    id TEXT PRIMARY KEY DEFAULT ('OWN-' || substring(uuid_generate_v4()::text, 1, 8)),
    owner_name TEXT NOT NULL,
    contact_info TEXT,
    id_proof_type TEXT DEFAULT 'Aadhaar / PAN Verified',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. OWNERSHIPS TABLE
-- Many-to-many relationship establishing title share percentages per property unit
CREATE TABLE IF NOT EXISTS ownerships (
    id TEXT PRIMARY KEY DEFAULT ('OWNP-' || substring(uuid_generate_v4()::text, 1, 8)),
    property_id TEXT NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    ownership_share DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    ownership_type TEXT DEFAULT 'Sole Owner',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ownerships_property ON ownerships (property_id);
CREATE INDEX IF NOT EXISTS idx_ownerships_owner ON ownerships (owner_id);

-- 7. PROPERTY RECORDS TABLE
-- Official IGRS registration records, sub-registrar citations, and legal deeds
CREATE TABLE IF NOT EXISTS property_records (
    id TEXT PRIMARY KEY DEFAULT ('REC-' || substring(uuid_generate_v4()::text, 1, 8)),
    property_id TEXT NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('Demo Data', 'IGRS / Authorized Property Record')) DEFAULT 'Demo Data',
    survey_number TEXT NOT NULL,
    document_reference TEXT NOT NULL,
    area DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    registration_date DATE DEFAULT CURRENT_DATE,
    sub_registrar_office TEXT DEFAULT 'Sub-Registrar Office, Madhapur, Rangareddy',
    market_value DOUBLE PRECISION DEFAULT 8500000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_records_property ON property_records (property_id);
CREATE INDEX IF NOT EXISTS idx_property_records_doc ON property_records (document_reference);

-- 8. VERTICAL GEOMETRIES TABLE
-- Volumetric 3D spatial extents (bounding box x/y/z dimensions and offsets in 3D coordinate space)
CREATE TABLE IF NOT EXISTS vertical_geometries (
    id TEXT PRIMARY KEY DEFAULT ('GEOM-' || substring(uuid_generate_v4()::text, 1, 8)),
    property_id TEXT NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    bottom_height DOUBLE PRECISION NOT NULL,
    top_height DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    length DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL, -- Computed as top_height - bottom_height
    x_offset DOUBLE PRECISION DEFAULT 0.0,
    y_offset DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vertical_geometries_property ON vertical_geometries (property_id);

-- 9. PROTOTYPE 3D PROPERTY IDS TABLE
-- Standardized vertical cadastre identifiers (strictly labeled as Prototype 3D Property ID)
CREATE TABLE IF NOT EXISTS prototype_3d_property_ids (
    id TEXT PRIMARY KEY DEFAULT ('P3D-' || substring(uuid_generate_v4()::text, 1, 8)),
    property_id TEXT NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    generated_id TEXT NOT NULL UNIQUE, -- e.g. "TS-B001-F02-U203"
    format_pattern TEXT DEFAULT '{STATE}-{BUILDING}-{FLOOR}-{UNIT}',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'PROTOTYPE_ACTIVE'
);

CREATE INDEX IF NOT EXISTS idx_prototype_3d_generated_id ON prototype_3d_property_ids (generated_id);

-- ========================================================================
-- SPATIAL QUERY RPC: Bounding Radius Lookup (ST_DWithin)
-- Finds buildings within `search_radius_m` metres of coordinate (lat, lng)
-- ========================================================================
CREATE OR REPLACE FUNCTION find_building_by_coordinates(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    search_radius_m DOUBLE PRECISION DEFAULT 25.0
)
RETURNS TABLE (
    id TEXT,
    building_id TEXT,
    survey_number TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    plot_area DOUBLE PRECISION,
    total_floors INTEGER,
    total_height DOUBLE PRECISION,
    model_url TEXT,
    model_type TEXT,
    sub_mesh_strategy TEXT,
    distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        b.id,
        b.building_id,
        b.survey_number,
        b.address,
        b.latitude,
        b.longitude,
        b.plot_area,
        b.total_floors,
        b.total_height,
        b.model_url,
        b.model_type,
        b.sub_mesh_strategy,
        ST_Distance(b.geom, ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography) AS distance_meters
    FROM buildings b
    WHERE ST_DWithin(b.geom, ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography, search_radius_m)
    ORDER BY distance_meters ASC
    LIMIT 1;
$$;

-- ========================================================================
-- SUPABASE STORAGE BUCKET CONFIGURATION
-- Public/Authenticated Bucket: 'building-models'
-- Object path structure: 'buildings/{building_id}/{timestamp}.glb'
-- ========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('building-models', 'building-models', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policy (Allow authenticated and public reading & uploads for cadastre ingestion)
CREATE POLICY "Public Read Access for Building Models"
ON storage.objects FOR SELECT
USING (bucket_id = 'building-models');

CREATE POLICY "Public Ingestion Upload Access for Building Models"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'building-models');

-- ========================================================================
-- SEED INITIAL DEMO RECORD (Cyber Towers / Hitec City Cadastral Parcel)
-- ========================================================================
INSERT INTO buildings (id, building_id, survey_number, address, latitude, longitude, plot_area, total_floors, total_height, model_type)
VALUES (
    'BLD-001',
    'B001',
    'SY-402/1A',
    'Plot 42, Hitech City Main Rd, Madhapur, Hyderabad',
    17.4485,
    78.3748,
    640.0,
    4,
    12.0,
    'parametric_extruded'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (id, building_id, latitude, longitude, formatted_address)
VALUES (
    'LOC-001',
    'BLD-001',
    17.4485,
    78.3748,
    'Plot 42, Hitech City Main Rd, Madhapur, Hyderabad, Telangana 500081'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Floors (Floor 0 to Floor 3)
INSERT INTO floors (id, building_id, floor_number, bottom_height, top_height, floor_name)
VALUES 
    ('FLR-000', 'BLD-001', 0, 0.0, 3.0, 'Ground Floor (Stilt / Amenities)'),
    ('FLR-001', 'BLD-001', 1, 3.0, 6.0, 'First Floor'),
    ('FLR-002', 'BLD-001', 2, 6.0, 9.0, 'Second Floor'),
    ('FLR-003', 'BLD-001', 3, 9.0, 12.0, 'Third Floor (Penthouse Level)')
ON CONFLICT (id) DO NOTHING;

-- Seed Units
INSERT INTO property_units (id, building_id, floor_id, flat_number, area, property_type, record_reference)
VALUES
    ('PROP-G01', 'BLD-001', 'FLR-000', 'Stilt Parking Area P1-P4', 85.0, 'Dedicated Parking & Utility Slot', 'DOC-2024-TEL-08910'),
    ('PROP-G02', 'BLD-001', 'FLR-000', 'Security & Facility Cabin', 25.0, 'Society Common Facility', 'DOC-2024-TEL-08911'),
    ('PROP-101', 'BLD-001', 'FLR-001', 'Flat 101', 115.0, 'Residential Apartment (3BHK)', 'DOC-2024-TEL-08912'),
    ('PROP-102', 'BLD-001', 'FLR-001', 'Flat 102', 118.0, 'Residential Apartment (3BHK)', 'DOC-2024-TEL-08913'),
    ('PROP-201', 'BLD-001', 'FLR-002', 'Flat 201', 120.0, 'Residential Apartment (3BHK)', 'DOC-2024-TEL-08914'),
    ('PROP-202', 'BLD-001', 'FLR-002', 'Flat 202', 122.0, 'Residential Apartment (3BHK)', 'DOC-2024-TEL-08915'),
    ('PROP-301', 'BLD-001', 'FLR-003', 'Flat 301', 124.0, 'Residential Penthouse (3BHK Deluxe)', 'DOC-2024-TEL-08916'),
    ('PROP-302', 'BLD-001', 'FLR-003', 'Flat 302', 126.0, 'Residential Penthouse (3BHK Deluxe)', 'DOC-2024-TEL-08917')
ON CONFLICT (id) DO NOTHING;

-- Seed Geometries
INSERT INTO vertical_geometries (id, property_id, bottom_height, top_height, width, length, height, x_offset, y_offset)
VALUES
    ('GEOM-G01', 'PROP-G01', 0.0, 3.0, 6.8, 12.0, 3.0, -3.6, 0.0),
    ('GEOM-G02', 'PROP-G02', 0.0, 3.0, 6.8, 12.0, 3.0, 3.6, 0.0),
    ('GEOM-101', 'PROP-101', 3.0, 6.0, 6.8, 12.0, 3.0, -3.6, 0.0),
    ('GEOM-102', 'PROP-102', 3.0, 6.0, 6.8, 12.0, 3.0, 3.6, 0.0),
    ('GEOM-201', 'PROP-201', 6.0, 9.0, 6.8, 12.0, 3.0, -3.6, 0.0),
    ('GEOM-202', 'PROP-202', 6.0, 9.0, 6.8, 12.0, 3.0, 3.6, 0.0),
    ('GEOM-301', 'PROP-301', 9.0, 12.0, 6.8, 12.0, 3.0, -3.6, 0.0),
    ('GEOM-302', 'PROP-302', 9.0, 12.0, 6.8, 12.0, 3.0, 3.6, 0.0)
ON CONFLICT (id) DO NOTHING;

-- Seed Prototype 3D Property IDs
INSERT INTO prototype_3d_property_ids (id, property_id, generated_id)
VALUES
    ('P3D-G01', 'PROP-G01', 'TS-B001-F00-UG01'),
    ('P3D-G02', 'PROP-G02', 'TS-B001-F00-UG02'),
    ('P3D-101', 'PROP-101', 'TS-B001-F01-U101'),
    ('P3D-102', 'PROP-102', 'TS-B001-F01-U102'),
    ('P3D-201', 'PROP-201', 'TS-B001-F02-U201'),
    ('P3D-202', 'PROP-202', 'TS-B001-F02-U202'),
    ('P3D-301', 'PROP-301', 'TS-B001-F03-U301'),
    ('P3D-302', 'PROP-302', 'TS-B001-F03-U302')
ON CONFLICT (id) DO NOTHING;

-- Seed Owners & Records for Flat 201 (Sample)
INSERT INTO owners (id, owner_name, contact_info)
VALUES ('OWN-201', 'Sri K. Venkat Rao & Smt. K. Lalitha', '+91 98490 12345')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ownerships (id, property_id, owner_id, ownership_share, ownership_type)
VALUES ('OWNP-201', 'PROP-201', 'OWN-201', 100.0, 'Joint Owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO property_records (id, property_id, source_type, survey_number, document_reference, area, address)
VALUES (
    'REC-201',
    'PROP-201',
    'IGRS / Authorized Property Record',
    'SY-402/1A',
    'DOC-2024-TEL-08914',
    120.0,
    'Flat 201, 2nd Floor, Cyber Heights, Plot 42, Hitech City Main Rd, Madhapur, Hyderabad'
)
ON CONFLICT (id) DO NOTHING;
