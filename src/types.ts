/**
 * Data Model and Schema Definitions for SIH26011
 * 3D ULPIN Generation & Vertical Property Mapping Prototype
 */

export type DataSourceType = 'Demo Data' | 'IGRS / Authorized Property Record';

export type BuildingLifecycleStatus = 'draft' | 'plan_verified' | 'registered';

export type UserRole =
  | 'surveyor'
  | 'town_planner'
  | 'sro_officer'
  | 'citizen'
  | 'emergency_responder';

export interface DemoPersona {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  organization: string;
  badgeColor: string;
  description: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  organization?: string;
  created_at?: string;
}

export interface BuildingComplianceMetrics {
  max_permitted_height: number; // e.g. 15.0m
  actual_height: number; // e.g. 12.0m
  setback_margin_required: number; // e.g. 3.0m
  setback_margin_actual: number; // e.g. 3.5m
  fsi_permitted: number; // e.g. 2.5
  fsi_actual: number; // e.g. 1.85
  passed: boolean;
}

export interface Owner {
  id: string; // Internal UUID / PK
  owner_id: string; // e.g. "OWN001"
  owner_name: string; // e.g. "Demo Owner"
  contact_info?: string;
  id_proof_type?: string;
  created_at: string;
}

export interface Building {
  id: string; // Internal UUID / PK
  building_id?: string; // e.g. "B001"
  name?: string; // e.g. "Sri Krishna Residency"
  building_name?: string; // e.g. "Sri Krishna Residency"
  ulpin?: string; // 3D ULPIN for building parcel
  application_number?: string; // Statutory Cadastral Application Number, e.g. "APP-2026-TS-SY3127-01"
  survey_number: string; // e.g. "SY-402/1A" or "3127"
  address: string;
  latitude: number; // e.g. 17.4485
  longitude: number; // e.g. 78.3748
  geom?: string | any; // PostGIS geography(Point, 4326)
  plot_area: number; // in sq. metres
  total_floors?: number; // e.g. 4
  number_of_floors?: number; // legacy alias
  total_height?: number; // in metres (e.g. 12.0)
  total_building_height?: number; // legacy alias
  model_url?: string | null; // 3D model asset URL
  stored_3d_file_name?: string; // Stored 3D file name, e.g. "3127_model.glb"
  stored_3d_file_path?: string; // Stored path organized by survey number
  stored_3d_file_size?: number; // Size in bytes
  stored_3d_file_id?: string; // Foreign key referencing Building3DFileRecord.id in database
  has_database_3d_file?: boolean; // Whether 3D model is persisted in relational database
  model_type?: 'parametric_extruded' | 'uploaded_glb' | 'hybrid' | 'lidar_point_cloud';
  sub_mesh_strategy?: 'named_sub_meshes' | 'envelope_sliced' | 'none';
  state_code?: string; // e.g. "TS" (Telangana)
  district?: string;
  mandal_or_taluk?: string;
  village_or_locality?: string;
  status?: BuildingLifecycleStatus; // 'draft' | 'plan_verified' | 'registered'
  rejection_remarks?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  submitted_by?: string | null;
  submitted_by_name?: string | null;
  deed_reference?: string | null;
  compliance_metrics?: BuildingComplianceMetrics;
  // Sub-surface & Basement extensions
  has_subsurface?: boolean;
  basement_depth?: number; // in metres below ground, e.g. 3.5m or 6.0m
  basement_levels?: number; // e.g. 1 or 2
  // CORS / GNSS geodetic accuracy metadata
  gnss_metadata?: GnssMetadata;
  // Terrain DEM / DSM elevation
  terrain_elevation?: TerrainElevationModel;
  created_at?: string;
  updated_at?: string;
}

export interface GnssMetadata {
  fix_type: 'RTK_FIXED' | 'DGPS' | 'FLOAT' | 'STANDALONE';
  horizontal_precision_meters: number; // e.g. 0.012 (+/- 12mm)
  vertical_precision_meters: number; // e.g. 0.018 (+/- 18mm)
  cors_station_id: string; // e.g. "CORS-HYD-04 (SOI Malkajgiri Node)"
  geoid_model: string; // e.g. "EGM2008 (Earth Gravitational Model 2008)"
  antenna_height_meters: number; // e.g. 1.800m
  pdop?: number; // Positional Dilution of Precision e.g. 1.4
  survey_timestamp?: string;
}

export interface TerrainElevationModel {
  dsm_amsl_meters: number; // Digital Surface Model AMSL e.g. 527.2m
  dem_amsl_meters: number; // Digital Elevation Model (bare ground) e.g. 512.4m
  ndsm_building_height_meters: number; // nDSM = DSM - DEM e.g. 14.8m
  vertical_datum: 'EGM2008' | 'MSL_MUMBAI' | 'WGS84_ELLIPSOIDAL';
  slope_percentage?: number;
}

export interface Floor {
  id: string; // Internal UUID / PK
  floor_id: string; // e.g. "FLR002" or "B001-F02" or "B001-B01"
  building_id: string; // FK -> Building.building_id
  floor_number: number; // e.g. 2, 0 (ground), or -1 (basement 1), -2 (basement 2)
  bottom_height: number; // in metres (e.g. 3.0 or -3.0 for basement)
  top_height: number; // in metres (e.g. 6.0 or 0.0 for basement)
  floor_name?: string; // e.g. "Second Floor", "Basement B1 (Subterranean Parking)"
  is_subsurface?: boolean;
  bottom_depth?: number; // positive depth below surface Y=0
  top_depth?: number;
  created_at: string;
}

export interface PropertyUnit {
  id: string; // Internal UUID / PK
  property_id: string; // e.g. "PROP001"
  building_id: string; // FK -> Building.building_id
  floor_id: string; // FK -> Floor.floor_id
  flat_number: string; // e.g. "Flat 203" or "203"
  area: number; // in sq. metres (e.g. 120.0)
  property_type: string; // e.g. "Residential Apartment (3BHK)"
  property_record_ref: string; // e.g. "DOC-2024-TEL-08912"
  created_at: string;
}

export interface Ownership {
  id: string; // Internal UUID / PK
  ownership_id: string; // e.g. "OWNP001"
  property_id: string; // FK -> PropertyUnit.property_id
  owner_id: string; // FK -> Owner.owner_id
  ownership_share: number; // in percentage (e.g. 100)
  ownership_type?: string; // e.g. "Sole Owner" | "Joint Owner"
  created_at: string;
}

export interface PropertyRecord {
  id: string; // Internal UUID / PK
  record_id: string; // e.g. "REC001"
  property_id: string; // FK -> PropertyUnit.property_id
  source_reference: DataSourceType; // "Demo Data" or "IGRS / Authorized Property Record"
  survey_number: string; // e.g. "SY-402/1A"
  document_reference: string; // e.g. "DOC-2024-TEL-08912"
  property_type: string; // e.g. "Residential Apartment"
  area: number; // in sq. metres
  address: string;
  registration_date?: string;
  sub_registrar_office?: string;
  market_value?: number;
  created_at: string;
}

export interface Location {
  id: string; // Internal UUID / PK
  location_id: string; // e.g. "LOC001"
  building_id: string; // FK -> Building.building_id
  latitude: number; // e.g. 17.4485
  longitude: number; // e.g. 78.3748
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  geocoding_source?: string;
  created_at: string;
}

export interface VerticalGeometry {
  id: string; // Internal UUID / PK
  geometry_id: string; // e.g. "GEOM001"
  property_id: string; // FK -> PropertyUnit.property_id
  bottom_height: number; // in metres (e.g. 3.0)
  top_height: number; // in metres (e.g. 6.0)
  width: number; // in metres (e.g. 10.0)
  length: number; // in metres (e.g. 12.0)
  height: number; // in metres (e.g. 3.0 = top_height - bottom_height)
  x_offset?: number; // relative placement in parcel
  y_offset?: number;
  created_at: string;
}

export interface Prototype3DPropertyId {
  id: string; // Internal UUID / PK
  internal_id?: string;
  property_id: string; // FK -> PropertyUnit.property_id
  generated_identifier: string; // e.g. "78541003174433-AIR-F02-U203-Z06.0M_EGM08"
  format_pattern: string; // e.g. "[14-digit Geohash Parcel ID]-[Vertical Strata]-[Level Code]-[Unit ID]-[Z-Datum]"
  standard_3d_ulpin?: string;
  vertical_strata?: 'SUB' | 'SURF' | 'AIR';
  level_code?: string;
  unit_code?: string;
  z_datum?: string;
  generated_at: string;
  status: 'PROTOTYPE_ACTIVE' | 'ARCHIVED';
}

export interface Standard3DULPIN {
  parcelId: string; // 14-digit Geohash / Bhu-Aadhaar parcel code
  verticalStrata: 'SUB' | 'SURF' | 'AIR';
  levelCode: string; // B2, B1, G, F01..F99
  unitId: string; // U203, UPARK, etc.
  zDatum: string; // e.g. Z06.0-09.0_EGM08
  fullUlpin: string;
  isValid: boolean;
}

export type UndergroundAssetType =
  | 'water_main'
  | 'sewage_pipeline'
  | 'gas_conduit'
  | 'metro_tunnel'
  | 'telecom_duct'
  | 'basement'
  | 'subterranean_parking';

export interface UndergroundAsset {
  id: string;
  asset_id: string; // e.g. "UG-HMWSSB-WAT-01"
  asset_type: UndergroundAssetType;
  name: string;
  utility_provider: string; // e.g. "HMWSSB", "GAIL Gas", "HMRL"
  depth_start: number; // metres below surface, e.g. 2.2m
  depth_end: number;
  diameter_or_width: number; // metres
  color_code: string; // hex color for 3D render
  buffer_zone_meters: number; // statutory clearance buffer, e.g. 3.0m
  route_points: Array<{ x: number; y: number; z: number }>; // 3D coordinates relative to parcel
  latitude?: number;
  longitude?: number;
  status: 'active' | 'under_construction' | 'planned' | 'restricted_corridor';
  description?: string;
  created_at: string;
}

export interface ClashItem {
  id: string;
  severity: 'CRITICAL_CLASH' | 'BUFFER_VIOLATION' | 'CLEARANCE_OK';
  assetId: string;
  assetName: string;
  assetType: UndergroundAssetType;
  utilityProvider: string;
  buildingElement: string; // e.g. "Foundation Footing / Basement B1"
  minDistanceMeters: number;
  requiredClearanceMeters: number;
  clearanceDeficitMeters: number;
  intersectionPoint: { x: number; y: number; z: number };
  recommendation: string;
}

export interface UndergroundClashReport {
  buildingId: string;
  timestamp: string;
  totalChecks: number;
  criticalClashes: number;
  bufferViolations: number;
  passedChecks: number;
  hasCollision: boolean;
  clashes: ClashItem[];
}

/**
 * Joined / Enriched view of a Property with all relational entities attached
 */
export interface EnrichedProperty {
  property: PropertyUnit;
  building: Building;
  floor: Floor;
  verticalGeometry: VerticalGeometry;
  prototype3DId: Prototype3DPropertyId;
  owners: Array<{
    ownership: Ownership;
    owner: Owner;
  }>;
  propertyRecord?: PropertyRecord;
  location: Location;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface Building3DFileRecord {
  id: string; // e.g. "3DF-B001-3127"
  building_id: string; // Foreign key referencing Building.building_id or Building.id
  survey_number: string; // Cadastral Survey Number, e.g. "3127"
  application_number?: string; // Statutory Cadastral Application Number
  file_name: string; // e.g. "3127_model.glb"
  mime_type: string; // e.g. "model/gltf-binary"
  file_size_bytes: number;
  data_base64: string; // Stored binary BLOB as base64 string directly in database table
  checksum_sha256?: string; // Cryptographic SHA-256 integrity hash
  model_format: 'glb' | 'gltf' | 'obj' | 'ifc';
  lod_level?: 'LOD1' | 'LOD2' | 'LOD3';
  created_at: string;
  updated_at?: string;
  stored_by?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface DatabaseState {
  owners: Owner[];
  buildings: Building[];
  floors: Floor[];
  propertyUnits: PropertyUnit[];
  ownerships: Ownership[];
  propertyRecords: PropertyRecord[];
  locations: Location[];
  verticalGeometries: VerticalGeometry[];
  prototype3DPropertyIds: Prototype3DPropertyId[];
  undergroundAssets?: UndergroundAsset[];
  building3DFiles?: Building3DFileRecord[];
}

export interface ValidationReport {
  isValid: boolean;
  timestamp: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  details: Array<{
    category: 'Vertical Extent' | 'Floor Consistency' | 'Geographic Location' | 'Relational Foreign Keys' | 'Identifier Format';
    entityId: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    message: string;
  }>;
}

export interface SpatialLookupResult {
  found: boolean;
  searchCoordinates: { lat: number; lng: number };
  searchRadiusMeters: number;
  building?: Building | null;
  distanceMeters?: number;
  nearestAvailableBuilding?: Building | null;
  nearestDistanceMeters?: number;
  enrichedProperty?: EnrichedProperty | null;
  allProperties?: EnrichedProperty[];
  properties?: EnrichedProperty[];
  allFloors?: Floor[];
  floors?: Floor[];
  undergroundAssets?: UndergroundAsset[];
}

export type IngestionMethod = 'blueprint_2d' | 'direct_3d_glb' | 'parametric_builder' | 'point_cloud_lidar';

export interface IngestionPayload {
  method: IngestionMethod;
  coordinates: { lat: number; lng: number };
  surveyNumber: string;
  buildingName?: string;
  building_name?: string;
  address: string;
  plotArea: number;
  // Common geometry options
  totalFloors: number;
  floorHeight: number; // e.g. 3.0 m
  buildingWidth: number; // e.g. 16.0 m
  buildingLength: number; // e.g. 14.0 m
  unitsPerFloor?: number; // e.g. 2
  // Subsurface / Basement options
  hasSubsurface?: boolean;
  basementLevels?: number;
  basementDepth?: number;
  // Method 1: 2D Blueprint specific
  blueprintImageFile?: File | null;
  blueprintImageUrl?: string;
  // Method 2: Direct 3D Asset specific
  modelFile?: File | null;
  modelFileName?: string;
  subMeshStrategy?: 'named_sub_meshes' | 'envelope_sliced';
  apartmentNumberingPrefix?: string; // e.g. "Flat"
  // Method 4: LiDAR Point Cloud specific
  pointCloudFile?: File | null;
  pointCloudFileName?: string;
  pointCloudPoints?: number;
  pointCloudData?: Array<{ x: number; y: number; z: number; classification: number; intensity: number }>;
  // CORS GNSS & Terrain Elevation metadata
  gnssMetadata?: GnssMetadata;
  terrainElevation?: TerrainElevationModel;
  // Generated or uploaded GLB blob / URL
  generatedGlbBlob?: Blob | null;
  uploadedModelUrl?: string | null;
}

export interface UpdateFlatDetailsPayload {
  propertyId: string;
  buildingId?: string;
  flatNumber: string;
  propertyType: string;
  area: number;
  ownerName?: string;
  ownershipShare?: number;
  ownershipType?: string;
  ulpin?: string;
  bottomHeight?: number;
  topHeight?: number;
  propertyRecordRef?: string;
}
