/**
 * In-Memory Relational Database Engine with Foreign-Key Integrity,
 * Cadastral Validation Rules, and Prototype 3D Property ID Generator.
 */

import {
  Building,
  DatabaseState,
  EnrichedProperty,
  Floor,
  Location,
  Owner,
  Ownership,
  PropertyRecord,
  PropertyUnit,
  Prototype3DPropertyId,
  ValidationReport,
  VerticalGeometry,
} from '../types';
import { generate3DULPIN, parse3DULPIN } from '../services/ulpinEngine';
import { DEFAULT_UNDERGROUND_ASSETS } from '../services/clashDetector';

export const INITIAL_DEMO_DB: DatabaseState = {
  buildings: [
    {
      id: 'bld-001',
      building_id: 'B001',
      survey_number: '3127',
      address: 'Survey No. 3127, Malkajgiri Area, Medchal-Malkajgiri District, Hyderabad, Telangana 500047',
      latitude: 17.443372,
      longitude: 78.541003,
      plot_area: 1250.0,
      total_floors: 5, // 1 Basement + Ground + 3 Upper Floors
      number_of_floors: 5,
      total_height: 12.0,
      total_building_height: 12.0,
      has_subsurface: true,
      basement_depth: 3.0,
      basement_levels: 1,
      gnss_metadata: {
        fix_type: 'RTK_FIXED',
        horizontal_precision_meters: 0.012,
        vertical_precision_meters: 0.018,
        cors_station_id: 'CORS-HYD-04 (SOI Malkajgiri Node)',
        geoid_model: 'EGM2008 (Earth Gravitational Model 2008)',
        antenna_height_meters: 1.800,
        pdop: 1.35,
        survey_timestamp: '2026-01-15T08:30:00Z',
      },
      terrain_elevation: {
        dsm_amsl_meters: 527.2,
        dem_amsl_meters: 512.4,
        ndsm_building_height_meters: 14.8,
        vertical_datum: 'EGM2008',
      },
      state_code: 'TS',
      district: 'Medchal-Malkajgiri',
      mandal_or_taluk: 'Malkajgiri',
      village_or_locality: 'Malkajgiri Area',
      status: 'registered',
      deed_reference: 'DOC-2024-TEL-3127-00',
      submitted_by_name: 'Er. Rajesh Varma',
      verified_by: 'K. S. Narayana, IAS (ULB)',
      compliance_metrics: {
        max_permitted_height: 15.0,
        actual_height: 12.0,
        setback_margin_required: 3.0,
        setback_margin_actual: 3.5,
        fsi_permitted: 2.5,
        fsi_actual: 1.85,
        passed: true,
      },
      model_url: '/api/buildings/B001/3d-file',
      stored_3d_file_name: 'B001_3D_Cadastral_Model.glb',
      stored_3d_file_path: 'database://building3DFiles/3DF-B001-3127',
      stored_3d_file_size: 1940,
      stored_3d_file_id: '3DF-B001-3127',
      has_database_3d_file: true,
      model_type: 'uploaded_glb',
      created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
    },
  ],
  floors: [
    {
      id: 'flr-b01',
      floor_id: 'B001-B01',
      building_id: 'B001',
      floor_number: -1,
      bottom_height: -3.0,
      top_height: 0.0,
      floor_name: 'Basement B1 (Subterranean Parking & Utility Vault)',
      is_subsurface: true,
      bottom_depth: 3.0,
      top_depth: 0.0,
      created_at: new Date('2026-01-15T09:02:00Z').toISOString(),
    },
    {
      id: 'flr-000',
      floor_id: 'B001-F00',
      building_id: 'B001',
      floor_number: 0,
      bottom_height: 0.0,
      top_height: 3.0,
      floor_name: 'Ground Floor (Stilt Parking & Security Post)',
      created_at: new Date('2026-01-15T09:05:00Z').toISOString(),
    },
    {
      id: 'flr-001',
      floor_id: 'B001-F01',
      building_id: 'B001',
      floor_number: 1,
      bottom_height: 3.0,
      top_height: 6.0,
      floor_name: '1st Floor (Level 1)',
      created_at: new Date('2026-01-15T09:05:00Z').toISOString(),
    },
    {
      id: 'flr-002',
      floor_id: 'B001-F02',
      building_id: 'B001',
      floor_number: 2,
      bottom_height: 6.0,
      top_height: 9.0,
      floor_name: '2nd Floor (Level 2)',
      created_at: new Date('2026-01-15T09:05:00Z').toISOString(),
    },
    {
      id: 'flr-003',
      floor_id: 'B001-F03',
      building_id: 'B001',
      floor_number: 3,
      bottom_height: 9.0,
      top_height: 12.0,
      floor_name: '3rd Floor (Level 3)',
      created_at: new Date('2026-01-15T09:05:00Z').toISOString(),
    },
  ],
  owners: [
    {
      id: 'own-001',
      owner_id: 'OWN001',
      owner_name: 'Malkajgiri Residents Welfare Association (AWA)',
      contact_info: 'secretary@malkajgiri-3127.org',
      id_proof_type: 'Society Registration Certificate (Reg. No. TS/MED/2023/3127)',
      created_at: new Date('2026-01-15T09:10:00Z').toISOString(),
    },
    {
      id: 'own-101',
      owner_id: 'OWN101',
      owner_name: 'Bhuvana',
      contact_info: 'bhuvana@malkajgiri.in',
      id_proof_type: 'Aadhaar / Passport (Verified)',
      created_at: new Date('2026-01-15T09:10:00Z').toISOString(),
    },
    {
      id: 'own-102',
      owner_id: 'OWN102',
      owner_name: 'Sanjana',
      contact_info: 'sanjana@malkajgiri.in',
      id_proof_type: 'Aadhaar / PAN Card (Verified)',
      created_at: new Date('2026-01-15T09:10:00Z').toISOString(),
    },
    {
      id: 'own-201',
      owner_id: 'OWN201',
      owner_name: 'Bhuvi',
      contact_info: 'bhuvi@malkajgiri.in',
      id_proof_type: 'Aadhaar / Voter ID (Verified)',
      created_at: new Date('2026-01-15T09:10:00Z').toISOString(),
    },
    {
      id: 'own-202',
      owner_id: 'OWN202',
      owner_name: 'Sanju',
      contact_info: 'sanju@malkajgiri.in',
      id_proof_type: 'Aadhaar / Driving License (Verified)',
      created_at: new Date('2026-01-15T09:10:00Z').toISOString(),
    },
    {
      id: 'own-301',
      owner_id: 'OWN301',
      owner_name: 'Bhuvaneshwari',
      contact_info: 'bhuvaneshwari@malkajgiri.in',
      id_proof_type: 'Passport / Aadhaar (Verified)',
      created_at: new Date('2026-01-15T09:10:00Z').toISOString(),
    },
    {
      id: 'own-302',
      owner_id: 'OWN302',
      owner_name: 'Suresh Reddy',
      contact_info: 'suresh.reddy@malkajgiri.in',
      id_proof_type: 'Aadhaar / PAN Card (Verified)',
      created_at: new Date('2026-01-15T09:10:00Z').toISOString(),
    },
  ],
  propertyUnits: [
    // Sub-surface Basement B1: Underground Parking & Utility
    {
      id: 'prop-b01',
      property_id: 'PROP-B01',
      building_id: 'B001',
      floor_id: 'B001-B01',
      flat_number: 'Subterranean Parking (Slots B1-B12)',
      area: 120.0,
      property_type: 'Sub-surface Common Amenity / Underground Parking & EV Stations',
      property_record_ref: 'DOC-2024-TEL-3127-B0',
      created_at: new Date('2026-01-15T09:12:00Z').toISOString(),
    },
    // Ground Floor: Parking & Watchman
    {
      id: 'prop-g01',
      property_id: 'PROP-G01',
      building_id: 'B001',
      floor_id: 'B001-F00',
      flat_number: 'Stilt Parking (Slots P1-P8)',
      area: 85.0,
      property_type: 'Common Amenity / Covered Stilt Parking',
      property_record_ref: 'DOC-2024-TEL-3127-00',
      created_at: new Date('2026-01-15T09:15:00Z').toISOString(),
    },
    {
      id: 'prop-g02',
      property_id: 'PROP-G02',
      building_id: 'B001',
      floor_id: 'B001-F00',
      flat_number: 'Watchman Cabin & Security Room',
      area: 25.0,
      property_type: 'Utility / Watchman & Security Post',
      property_record_ref: 'DOC-2024-TEL-3127-01',
      created_at: new Date('2026-01-15T09:15:00Z').toISOString(),
    },
    // 1st Floor: Flat 101 & Flat 102
    {
      id: 'prop-101',
      property_id: 'PROP-101',
      building_id: 'B001',
      floor_id: 'B001-F01',
      flat_number: 'Flat 101',
      area: 110.0,
      property_type: 'Residential Apartment (2BHK)',
      property_record_ref: 'DOC-2024-TEL-3127-101',
      created_at: new Date('2026-01-15T09:15:00Z').toISOString(),
    },
    {
      id: 'prop-102',
      property_id: 'PROP-102',
      building_id: 'B001',
      floor_id: 'B001-F01',
      flat_number: 'Flat 102',
      area: 115.0,
      property_type: 'Residential Apartment (2BHK)',
      property_record_ref: 'DOC-2024-TEL-3127-102',
      created_at: new Date('2026-01-15T09:15:00Z').toISOString(),
    },
    // 2nd Floor: Flat 201 & Flat 202
    {
      id: 'prop-201',
      property_id: 'PROP-201',
      building_id: 'B001',
      floor_id: 'B001-F02',
      flat_number: 'Flat 201',
      area: 120.0,
      property_type: 'Residential Apartment (3BHK)',
      property_record_ref: 'DOC-2024-TEL-3127-201',
      created_at: new Date('2026-01-15T09:15:00Z').toISOString(),
    },
    {
      id: 'prop-202',
      property_id: 'PROP-202',
      building_id: 'B001',
      floor_id: 'B001-F02',
      flat_number: 'Flat 202',
      area: 120.0,
      property_type: 'Residential Apartment (3BHK)',
      property_record_ref: 'DOC-2024-TEL-3127-202',
      created_at: new Date('2026-01-15T09:15:00Z').toISOString(),
    },
    // 3rd Floor: Flat 301 & Flat 302
    {
      id: 'prop-301',
      property_id: 'PROP-301',
      building_id: 'B001',
      floor_id: 'B001-F03',
      flat_number: 'Flat 301',
      area: 125.0,
      property_type: 'Residential Apartment (3BHK Penthouse)',
      property_record_ref: 'DOC-2024-TEL-3127-301',
      created_at: new Date('2026-01-15T09:15:00Z').toISOString(),
    },
    {
      id: 'prop-302',
      property_id: 'PROP-302',
      building_id: 'B001',
      floor_id: 'B001-F03',
      flat_number: 'Flat 302',
      area: 125.0,
      property_type: 'Residential Apartment (3BHK Penthouse)',
      property_record_ref: 'DOC-2024-TEL-3127-302',
      created_at: new Date('2026-01-15T09:15:00Z').toISOString(),
    },
  ],
  ownerships: [
    // Sub-surface Basement B1
    {
      id: 'ownp-b01',
      ownership_id: 'OWNP-B01',
      property_id: 'PROP-B01',
      owner_id: 'OWN001',
      ownership_share: 100.0,
      ownership_type: 'Sub-surface Common Amenity & Association Utility',
      created_at: new Date('2026-01-15T09:18:00Z').toISOString(),
    },
    // Ground Floor
    {
      id: 'ownp-g01',
      ownership_id: 'OWNP-G01',
      property_id: 'PROP-G01',
      owner_id: 'OWN001',
      ownership_share: 100.0,
      ownership_type: 'Association Common Property',
      created_at: new Date('2026-01-15T09:20:00Z').toISOString(),
    },
    {
      id: 'ownp-g02',
      ownership_id: 'OWNP-G02',
      property_id: 'PROP-G02',
      owner_id: 'OWN001',
      ownership_share: 100.0,
      ownership_type: 'Association Common Property',
      created_at: new Date('2026-01-15T09:20:00Z').toISOString(),
    },
    // 1st Floor
    {
      id: 'ownp-101',
      ownership_id: 'OWNP-101',
      property_id: 'PROP-101',
      owner_id: 'OWN101',
      ownership_share: 100.0,
      ownership_type: 'Sole Owner',
      created_at: new Date('2026-01-15T09:20:00Z').toISOString(),
    },
    {
      id: 'ownp-102',
      ownership_id: 'OWNP-102',
      property_id: 'PROP-102',
      owner_id: 'OWN102',
      ownership_share: 100.0,
      ownership_type: 'Sole Owner',
      created_at: new Date('2026-01-15T09:20:00Z').toISOString(),
    },
    // 2nd Floor
    {
      id: 'ownp-201',
      ownership_id: 'OWNP-201',
      property_id: 'PROP-201',
      owner_id: 'OWN201',
      ownership_share: 100.0,
      ownership_type: 'Sole Owner',
      created_at: new Date('2026-01-15T09:20:00Z').toISOString(),
    },
    {
      id: 'ownp-202',
      ownership_id: 'OWNP-202',
      property_id: 'PROP-202',
      owner_id: 'OWN202',
      ownership_share: 100.0,
      ownership_type: 'Sole Owner',
      created_at: new Date('2026-01-15T09:20:00Z').toISOString(),
    },
    // 3rd Floor
    {
      id: 'ownp-301',
      ownership_id: 'OWNP-301',
      property_id: 'PROP-301',
      owner_id: 'OWN301',
      ownership_share: 100.0,
      ownership_type: 'Sole Owner',
      created_at: new Date('2026-01-15T09:20:00Z').toISOString(),
    },
    {
      id: 'ownp-302',
      ownership_id: 'OWNP-302',
      property_id: 'PROP-302',
      owner_id: 'OWN302',
      ownership_share: 100.0,
      ownership_type: 'Sole Owner',
      created_at: new Date('2026-01-15T09:20:00Z').toISOString(),
    },
  ],
  propertyRecords: [
    // Ground Floor
    {
      id: 'rec-g01',
      record_id: 'REC-G01',
      property_id: 'PROP-G01',
      source_reference: 'IGRS / Authorized Property Record',
      survey_number: '3127',
      document_reference: 'DOC-2024-TEL-3127-00',
      property_type: 'Common Amenity / Covered Stilt Parking',
      area: 85.0,
      address: 'Stilt Floor Parking P1-P8, Building B001, Survey No. 3127, Malkajgiri Area, Hyderabad',
      registration_date: '2024-01-10',
      sub_registrar_office: 'SRO Malkajgiri, Medchal-Malkajgiri District',
      market_value: 3500000,
      created_at: new Date('2026-01-15T09:25:00Z').toISOString(),
    },
    {
      id: 'rec-g02',
      record_id: 'REC-G02',
      property_id: 'PROP-G02',
      source_reference: 'IGRS / Authorized Property Record',
      survey_number: '3127',
      document_reference: 'DOC-2024-TEL-3127-01',
      property_type: 'Utility / Watchman & Security Post',
      area: 25.0,
      address: 'Ground Floor Security Cabin, Building B001, Survey No. 3127, Malkajgiri Area, Hyderabad',
      registration_date: '2024-01-10',
      sub_registrar_office: 'SRO Malkajgiri, Medchal-Malkajgiri District',
      market_value: 1200000,
      created_at: new Date('2026-01-15T09:25:00Z').toISOString(),
    },
    // 1st Floor
    {
      id: 'rec-101',
      record_id: 'REC-101',
      property_id: 'PROP-101',
      source_reference: 'IGRS / Authorized Property Record',
      survey_number: '3127',
      document_reference: 'DOC-2024-TEL-3127-101',
      property_type: 'Residential Apartment (2BHK)',
      area: 110.0,
      address: 'Flat 101, Floor 1, Building B001, Survey No. 3127, Malkajgiri Area, Hyderabad',
      registration_date: '2024-02-14',
      sub_registrar_office: 'SRO Malkajgiri, Medchal-Malkajgiri District',
      market_value: 7800000,
      created_at: new Date('2026-01-15T09:25:00Z').toISOString(),
    },
    {
      id: 'rec-102',
      record_id: 'REC-102',
      property_id: 'PROP-102',
      source_reference: 'IGRS / Authorized Property Record',
      survey_number: '3127',
      document_reference: 'DOC-2024-TEL-3127-102',
      property_type: 'Residential Apartment (2BHK)',
      area: 115.0,
      address: 'Flat 102, Floor 1, Building B001, Survey No. 3127, Malkajgiri Area, Hyderabad',
      registration_date: '2024-02-18',
      sub_registrar_office: 'SRO Malkajgiri, Medchal-Malkajgiri District',
      market_value: 8100000,
      created_at: new Date('2026-01-15T09:25:00Z').toISOString(),
    },
    // 2nd Floor
    {
      id: 'rec-201',
      record_id: 'REC-201',
      property_id: 'PROP-201',
      source_reference: 'IGRS / Authorized Property Record',
      survey_number: '3127',
      document_reference: 'DOC-2024-TEL-3127-201',
      property_type: 'Residential Apartment (3BHK)',
      area: 120.0,
      address: 'Flat 201, Floor 2, Building B001, Survey No. 3127, Malkajgiri Area, Hyderabad',
      registration_date: '2024-03-22',
      sub_registrar_office: 'SRO Malkajgiri, Medchal-Malkajgiri District',
      market_value: 8600000,
      created_at: new Date('2026-01-15T09:25:00Z').toISOString(),
    },
    {
      id: 'rec-202',
      record_id: 'REC-202',
      property_id: 'PROP-202',
      source_reference: 'IGRS / Authorized Property Record',
      survey_number: '3127',
      document_reference: 'DOC-2024-TEL-3127-202',
      property_type: 'Residential Apartment (3BHK)',
      area: 120.0,
      address: 'Flat 202, Floor 2, Building B001, Survey No. 3127, Malkajgiri Area, Hyderabad',
      registration_date: '2024-03-25',
      sub_registrar_office: 'SRO Malkajgiri, Medchal-Malkajgiri District',
      market_value: 8600000,
      created_at: new Date('2026-01-15T09:25:00Z').toISOString(),
    },
    // 3rd Floor
    {
      id: 'rec-301',
      record_id: 'REC-301',
      property_id: 'PROP-301',
      source_reference: 'IGRS / Authorized Property Record',
      survey_number: '3127',
      document_reference: 'DOC-2024-TEL-3127-301',
      property_type: 'Residential Apartment (3BHK Penthouse)',
      area: 125.0,
      address: 'Flat 301, Floor 3, Building B001, Survey No. 3127, Malkajgiri Area, Hyderabad',
      registration_date: '2024-04-10',
      sub_registrar_office: 'SRO Malkajgiri, Medchal-Malkajgiri District',
      market_value: 9200000,
      created_at: new Date('2026-01-15T09:25:00Z').toISOString(),
    },
    {
      id: 'rec-302',
      record_id: 'REC-302',
      property_id: 'PROP-302',
      source_reference: 'IGRS / Authorized Property Record',
      survey_number: '3127',
      document_reference: 'DOC-2024-TEL-3127-302',
      property_type: 'Residential Apartment (3BHK Penthouse)',
      area: 125.0,
      address: 'Flat 302, Floor 3, Building B001, Survey No. 3127, Malkajgiri Area, Hyderabad',
      registration_date: '2024-04-15',
      sub_registrar_office: 'SRO Malkajgiri, Medchal-Malkajgiri District',
      market_value: 9300000,
      created_at: new Date('2026-01-15T09:25:00Z').toISOString(),
    },
  ],
  locations: [
    {
      id: 'loc-001',
      location_id: 'LOC001',
      building_id: 'B001',
      latitude: 17.443372,
      longitude: 78.541003,
      address: 'Survey No. 3127, Malkajgiri Area, Medchal-Malkajgiri District, Hyderabad, Telangana 500047',
      city: 'Malkajgiri / Hyderabad',
      state: 'Telangana',
      pincode: '500047',
      geocoding_source: 'Survey of India / Cadastral Geo-Reference',
      created_at: new Date('2026-01-15T09:30:00Z').toISOString(),
    },
  ],
  verticalGeometries: [
    // Sub-surface Basement B1
    {
      id: 'geom-b01',
      geometry_id: 'GEOM-B01',
      property_id: 'PROP-B01',
      bottom_height: -3.0,
      top_height: 0.0,
      width: 14.4,
      length: 12.0,
      height: 3.0,
      x_offset: 0.0,
      y_offset: 0.0,
      created_at: new Date('2026-01-15T09:33:00Z').toISOString(),
    },
    // Ground Floor
    {
      id: 'geom-g01',
      geometry_id: 'GEOM-G01',
      property_id: 'PROP-G01',
      bottom_height: 0.0,
      top_height: 3.0,
      width: 7.2,
      length: 12.0,
      height: 3.0,
      x_offset: -3.5,
      y_offset: 0.0,
      created_at: new Date('2026-01-15T09:35:00Z').toISOString(),
    },
    {
      id: 'geom-g02',
      geometry_id: 'GEOM-G02',
      property_id: 'PROP-G02',
      bottom_height: 0.0,
      top_height: 3.0,
      width: 4.8,
      length: 5.5,
      height: 3.0,
      x_offset: 4.0,
      y_offset: -3.0,
      created_at: new Date('2026-01-15T09:35:00Z').toISOString(),
    },
    // 1st Floor
    {
      id: 'geom-101',
      geometry_id: 'GEOM-101',
      property_id: 'PROP-101',
      bottom_height: 3.0,
      top_height: 6.0,
      width: 6.8,
      length: 12.0,
      height: 3.0,
      x_offset: -3.6,
      y_offset: 0.0,
      created_at: new Date('2026-01-15T09:35:00Z').toISOString(),
    },
    {
      id: 'geom-102',
      geometry_id: 'GEOM-102',
      property_id: 'PROP-102',
      bottom_height: 3.0,
      top_height: 6.0,
      width: 6.8,
      length: 12.0,
      height: 3.0,
      x_offset: 3.6,
      y_offset: 0.0,
      created_at: new Date('2026-01-15T09:35:00Z').toISOString(),
    },
    // 2nd Floor
    {
      id: 'geom-201',
      geometry_id: 'GEOM-201',
      property_id: 'PROP-201',
      bottom_height: 6.0,
      top_height: 9.0,
      width: 6.8,
      length: 12.0,
      height: 3.0,
      x_offset: -3.6,
      y_offset: 0.0,
      created_at: new Date('2026-01-15T09:35:00Z').toISOString(),
    },
    {
      id: 'geom-202',
      geometry_id: 'GEOM-202',
      property_id: 'PROP-202',
      bottom_height: 6.0,
      top_height: 9.0,
      width: 6.8,
      length: 12.0,
      height: 3.0,
      x_offset: 3.6,
      y_offset: 0.0,
      created_at: new Date('2026-01-15T09:35:00Z').toISOString(),
    },
    // 3rd Floor
    {
      id: 'geom-301',
      geometry_id: 'GEOM-301',
      property_id: 'PROP-301',
      bottom_height: 9.0,
      top_height: 12.0,
      width: 6.8,
      length: 12.0,
      height: 3.0,
      x_offset: -3.6,
      y_offset: 0.0,
      created_at: new Date('2026-01-15T09:35:00Z').toISOString(),
    },
    {
      id: 'geom-302',
      geometry_id: 'GEOM-302',
      property_id: 'PROP-302',
      bottom_height: 9.0,
      top_height: 12.0,
      width: 6.8,
      length: 12.0,
      height: 3.0,
      x_offset: 3.6,
      y_offset: 0.0,
      created_at: new Date('2026-01-15T09:35:00Z').toISOString(),
    },
  ],
  prototype3DPropertyIds: [
    // Sub-surface Basement B1
    {
      id: 'pid-b01',
      internal_id: 'INT-3D-PROP-B01',
      property_id: 'PROP-B01',
      generated_identifier: '78541003174433-SUB-B1-UPARK-Z-03.0M_EGM08',
      format_pattern: '[14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code]-[Unit ID]-[Z-Datum]',
      standard_3d_ulpin: '78541003174433-SUB-B1-UPARK-Z-03.0M_EGM08',
      vertical_strata: 'SUB',
      level_code: 'B1',
      unit_code: 'UPARK',
      z_datum: 'Z-03.0M_EGM08',
      generated_at: new Date('2026-01-15T09:40:00Z').toISOString(),
      status: 'PROTOTYPE_ACTIVE',
    },
    // Ground Floor
    {
      id: 'pid-g01',
      internal_id: 'INT-3D-PROP-G01',
      property_id: 'PROP-G01',
      generated_identifier: '78541003174433-SURF-G-UPARK-Z+00.0M_EGM08',
      format_pattern: '[14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code]-[Unit ID]-[Z-Datum]',
      standard_3d_ulpin: '78541003174433-SURF-G-UPARK-Z+00.0M_EGM08',
      vertical_strata: 'SURF',
      level_code: 'G',
      unit_code: 'UPARK',
      z_datum: 'Z+00.0M_EGM08',
      generated_at: new Date('2026-01-15T09:40:00Z').toISOString(),
      status: 'PROTOTYPE_ACTIVE',
    },
    {
      id: 'pid-g02',
      internal_id: 'INT-3D-PROP-G02',
      property_id: 'PROP-G02',
      generated_identifier: '78541003174433-SURF-G-UWATCH-Z+00.0M_EGM08',
      format_pattern: '[14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code]-[Unit ID]-[Z-Datum]',
      standard_3d_ulpin: '78541003174433-SURF-G-UWATCH-Z+00.0M_EGM08',
      vertical_strata: 'SURF',
      level_code: 'G',
      unit_code: 'UWATCH',
      z_datum: 'Z+00.0M_EGM08',
      generated_at: new Date('2026-01-15T09:40:00Z').toISOString(),
      status: 'PROTOTYPE_ACTIVE',
    },
    // 1st Floor
    {
      id: 'pid-101',
      internal_id: 'INT-3D-PROP-101',
      property_id: 'PROP-101',
      generated_identifier: '78541003174433-AIR-F01-U101-Z+03.0M_EGM08',
      format_pattern: '[14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code]-[Unit ID]-[Z-Datum]',
      standard_3d_ulpin: '78541003174433-AIR-F01-U101-Z+03.0M_EGM08',
      vertical_strata: 'AIR',
      level_code: 'F01',
      unit_code: 'U101',
      z_datum: 'Z+03.0M_EGM08',
      generated_at: new Date('2026-01-15T09:40:00Z').toISOString(),
      status: 'PROTOTYPE_ACTIVE',
    },
    {
      id: 'pid-102',
      internal_id: 'INT-3D-PROP-102',
      property_id: 'PROP-102',
      generated_identifier: '78541003174433-AIR-F01-U102-Z+03.0M_EGM08',
      format_pattern: '[14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code]-[Unit ID]-[Z-Datum]',
      standard_3d_ulpin: '78541003174433-AIR-F01-U102-Z+03.0M_EGM08',
      vertical_strata: 'AIR',
      level_code: 'F01',
      unit_code: 'U102',
      z_datum: 'Z+03.0M_EGM08',
      generated_at: new Date('2026-01-15T09:40:00Z').toISOString(),
      status: 'PROTOTYPE_ACTIVE',
    },
    // 2nd Floor
    {
      id: 'pid-201',
      internal_id: 'INT-3D-PROP-201',
      property_id: 'PROP-201',
      generated_identifier: '78541003174433-AIR-F02-U201-Z+06.0M_EGM08',
      format_pattern: '[14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code]-[Unit ID]-[Z-Datum]',
      standard_3d_ulpin: '78541003174433-AIR-F02-U201-Z+06.0M_EGM08',
      vertical_strata: 'AIR',
      level_code: 'F02',
      unit_code: 'U201',
      z_datum: 'Z+06.0M_EGM08',
      generated_at: new Date('2026-01-15T09:40:00Z').toISOString(),
      status: 'PROTOTYPE_ACTIVE',
    },
    {
      id: 'pid-202',
      internal_id: 'INT-3D-PROP-202',
      property_id: 'PROP-202',
      generated_identifier: '78541003174433-AIR-F02-U202-Z+06.0M_EGM08',
      format_pattern: '[14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code]-[Unit ID]-[Z-Datum]',
      standard_3d_ulpin: '78541003174433-AIR-F02-U202-Z+06.0M_EGM08',
      vertical_strata: 'AIR',
      level_code: 'F02',
      unit_code: 'U202',
      z_datum: 'Z+06.0M_EGM08',
      generated_at: new Date('2026-01-15T09:40:00Z').toISOString(),
      status: 'PROTOTYPE_ACTIVE',
    },
    // 3rd Floor
    {
      id: 'pid-301',
      internal_id: 'INT-3D-PROP-301',
      property_id: 'PROP-301',
      generated_identifier: '78541003174433-AIR-F03-U301-Z+09.0M_EGM08',
      format_pattern: '[14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code]-[Unit ID]-[Z-Datum]',
      standard_3d_ulpin: '78541003174433-AIR-F03-U301-Z+09.0M_EGM08',
      vertical_strata: 'AIR',
      level_code: 'F03',
      unit_code: 'U301',
      z_datum: 'Z+09.0M_EGM08',
      generated_at: new Date('2026-01-15T09:40:00Z').toISOString(),
      status: 'PROTOTYPE_ACTIVE',
    },
    {
      id: 'pid-302',
      internal_id: 'INT-3D-PROP-302',
      property_id: 'PROP-302',
      generated_identifier: '78541003174433-AIR-F03-U302-Z+09.0M_EGM08',
      format_pattern: '[14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code]-[Unit ID]-[Z-Datum]',
      standard_3d_ulpin: '78541003174433-AIR-F03-U302-Z+09.0M_EGM08',
      vertical_strata: 'AIR',
      level_code: 'F03',
      unit_code: 'U302',
      z_datum: 'Z+09.0M_EGM08',
      generated_at: new Date('2026-01-15T09:40:00Z').toISOString(),
      status: 'PROTOTYPE_ACTIVE',
    },
  ],
  undergroundAssets: DEFAULT_UNDERGROUND_ASSETS,
  building3DFiles: [
    {
      id: '3DF-B001-3127',
      building_id: 'B001',
      survey_number: '3127',
      application_number: 'APP-2026-TS-SY3127-01',
      file_name: 'B001_3D_Cadastral_Model.glb',
      mime_type: 'model/gltf-binary',
      file_size_bytes: 1940,
      data_base64: 'Z2xURgIAAACUBwAA8AQAAEpTT057ImFzc2V0Ijp7InZlcnNpb24iOiIyLjAiLCJnZW5lcmF0b3IiOiJTSUgyNjAxMS1OYXRpb25hbC0zRC1DYWRhc3RyZS1FbmdpbmUiLCJjb3B5cmlnaHQiOiJTdXJ2ZXkgb2YgSW5kaWEgLyBUZWxhbmdhbmEgQ2FkYXN0cmFsIERpcmVjdG9yYXRlIn0sInNjZW5lIjowLCJzY2VuZXMiOlt7Im5vZGVzIjpbMF19XSwibm9kZXMiOlt7Im5hbWUiOiJCdWlsZGluZ19CMDAxX1N1cnZleV8zMTI3IiwibWVzaCI6MCwiZXh0cmFzIjp7InN1cnZleV9udW1iZXIiOiIzMTI3IiwiYnVpbGRpbmdfaWQiOiJCMDAxIiwidG90YWxfZmxvb3JzIjo0LCJ0b3RhbF9oZWlnaHRfbWV0ZXJzIjoxMiwiY2FkYXN0cmFsX3R5cGUiOiJWb2x1bWV0cmljIENhZGFzdHJlIDNEIEVudmVsb3BlIChMT0QyKSJ9fV0sIm1lc2hlcyI6W3sibmFtZSI6IkIwMDFfM0RfQ2FkYXN0cmFsX0VudmVsb3BlIiwicHJpbWl0aXZlcyI6W3siYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6MCwiTk9STUFMIjoxfSwiaW5kaWNlcyI6MiwibWF0ZXJpYWwiOjB9XX1dLCJtYXRlcmlhbHMiOlt7Im5hbWUiOiJHb3Zlcm5tZW50Q2FkYXN0cmVCbHVlIiwicGJyTWV0YWxsaWNSb3VnaG5lc3MiOnsiYmFzZUNvbG9yRmFjdG9yIjpbMC4xMTgsMC4yMjcsMC41NDEsMC45NV0sIm1ldGFsbGljRmFjdG9yIjowLjE1LCJyb3VnaG5lc3NGYWN0b3IiOjAuNDV9LCJkb3VibGVTaWRlZCI6dHJ1ZX1dLCJhY2Nlc3NvcnMiOlt7ImJ1ZmZlclZpZXciOjAsImJ5dGVPZmZzZXQiOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNCwidHlwZSI6IlZFQzMiLCJtYXgiOls4LDEyLDddLCJtaW4iOlstOCwwLC03XX0seyJidWZmZXJWaWV3IjoxLCJieXRlT2Zmc2V0IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MjQsInR5cGUiOiJWRUMzIiwibWF4IjpbMSwxLDFdLCJtaW4iOlstMSwtMSwtMV19LHsiYnVmZmVyVmlldyI6MiwiYnl0ZU9mZnNldCI6MCwiY29tcG9uZW50VHlwZSI6NTEyMywiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIiwibWF4IjpbMjNdLCJtaW4iOlswXX1dLCJidWZmZXJWaWV3cyI6W3siYnVmZmVyIjowLCJieXRlT2Zmc2V0IjowLCJieXRlTGVuZ3RoIjoyODgsInRhcmdldCI6MzQ5NjJ9LHsiYnVmZmVyIjowLCJieXRlT2Zmc2V0IjoyODgsImJ5dGVMZW5ndGgiOjI4OCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVPZmZzZXQiOjU3NiwiYnl0ZUxlbmd0aCI6NzIsInRhcmdldCI6MzQ5NjN9XSwiYnVmZmVycyI6W3siYnl0ZUxlbmd0aCI6NjQ4fV19ICAgiAIAAEJJTgAAAADBAAAAAAAA4EAAAABBAAAAAAAA4EAAAABBAABAQQAA4EAAAADBAABAQQAA4EAAAADBAAAAAAAA4MAAAADBAABAQQAA4MAAAABBAABAQQAA4MAAAABBAAAAAAAA4MAAAADBAABAQQAA4MAAAADBAABAQQAA4EAAAABBAABAQQAA4EAAAABBAABAQQAA4MAAAADBAAAAAAAA4MAAAABBAAAAAAAA4MAAAABBAAAAAAAA4EAAAADBAAAAAAAA4EAAAABBAAAAAAAA4MAAAABBAABAQQAA4MAAAABBAABAQQAA4EAAAABBAAAAAAAA4EAAAADBAAAAAAAA4MAAAADBAAAAAAAA4EAAAADBAABAQQAA4EAAAADBAABAQQAA4MAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAAEAAgAAAAIAAwAEAAUABgAEAAYABwAIAAkACgAIAAoACwAMAA0ADgAMAA4ADwAQABEAEgAQABIAEwAUABUAFgAUABYAFwA=',
      checksum_sha256: 'af343040adf06732637c4e6d8dc68a21f44ec86b67ff1c910caa4909414e6971',
      model_format: 'glb',
      lod_level: 'LOD2',
      created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
      updated_at: new Date('2026-01-15T09:00:00Z').toISOString(),
      stored_by: 'Cadastral Surveyor (SOI Malkajgiri Node)',
      description: 'Official 3D Cadastral Volumetric Model for Building B001, Survey No. 3127',
      metadata: {
        total_floors: 5,
        total_height_meters: 12.0,
        plot_area_sqm: 1250.0,
        datum: 'EGM2008',
      },
    },
  ],
};

/**
 * Generates an official ISO 19152 LADM / Bhu-Aadhaar 3D ULPIN
 * Structure: [14-digit Geohash Parcel ID]-[Vertical Strata: SUB|SURF|AIR]-[Level Code: B2..G..F99]-[Unit ID]-[Z-Datum]
 */
export function generatePrototype3DPropertyId(
  stateCode: string = 'TS',
  buildingId: string,
  floorNumber: number,
  flatNumber: string,
  latitude: number = 17.443372,
  longitude: number = 78.541003
): string {
  const bottomHeight = floorNumber * 3.0;
  const topHeight = bottomHeight + 3.0;

  return generate3DULPIN({
    latitude,
    longitude,
    floorNumber,
    bottomHeight,
    topHeight,
    flatNumber,
  });
}

/**
 * Validates the database state according to Cadastral and Geometrical rules
 */
export function validateDatabaseState(db: DatabaseState): ValidationReport {
  const details: ValidationReport['details'] = [];
  let passed = 0;
  let failed = 0;

  // 1. Validate Buildings
  for (const bld of db.buildings) {
    if (!bld.building_id) {
      details.push({
        category: 'Relational Foreign Keys',
        entityId: bld.id,
        status: 'FAIL',
        message: 'Building has missing Building ID.',
      });
      failed++;
    } else {
      passed++;
    }

    const isLatValid = typeof bld.latitude === 'number' && !isNaN(bld.latitude) && bld.latitude >= -90 && bld.latitude <= 90;
    const isLngValid = typeof bld.longitude === 'number' && !isNaN(bld.longitude) && bld.longitude >= -180 && bld.longitude <= 180;

    if (!isLatValid || !isLngValid) {
      details.push({
        category: 'Geographic Location',
        entityId: bld.building_id,
        status: 'FAIL',
        message: `Building ${bld.building_id} has invalid or missing geographic coordinates (${bld.latitude}, ${bld.longitude}).`,
      });
      failed++;
    } else {
      passed++;
      const latNum = Number(bld.latitude ?? 17.4485);
      const lngNum = Number(bld.longitude ?? 78.3748);
      details.push({
        category: 'Geographic Location',
        entityId: bld.building_id,
        status: 'PASS',
        message: `Building ${bld.building_id} coordinates (${latNum.toFixed(4)}, ${lngNum.toFixed(4)}) are geographically valid.`,
      });
    }

    // Check building floors
    const bldFloors = db.floors
      .filter((f) => f.building_id === bld.building_id)
      .sort((a, b) => a.floor_number - b.floor_number);

    if (bldFloors.length === 0) {
      details.push({
        category: 'Floor Consistency',
        entityId: bld.building_id,
        status: 'WARNING',
        message: `Building ${bld.building_id} currently has no registered floor records.`,
      });
    } else {
      let maxFloorTop = 0;
      for (let i = 0; i < bldFloors.length; i++) {
        const floor = bldFloors[i];
        if (floor.top_height <= floor.bottom_height) {
          details.push({
            category: 'Vertical Extent',
            entityId: floor.floor_id,
            status: 'FAIL',
            message: `Floor ${floor.floor_id} has invalid range: top height (${floor.top_height}m) must be strictly greater than bottom height (${floor.bottom_height}m).`,
          });
          failed++;
        } else {
          passed++;
        }

        if (floor.bottom_height < 0 || floor.top_height < 0) {
          if (floor.is_subsurface || floor.floor_number < 0) {
            details.push({
              category: 'Vertical Extent',
              entityId: floor.floor_id,
              status: 'PASS',
              message: `Sub-surface Floor ${floor.floor_id} [${floor.bottom_height}m to ${floor.top_height}m] has valid negative vertical elevation (ISO 19152 LADM Strata: SUB).`,
            });
            passed++;
          } else {
            details.push({
              category: 'Vertical Extent',
              entityId: floor.floor_id,
              status: 'FAIL',
              message: `Floor ${floor.floor_id} has negative height values without sub-surface flag. Above-ground vertical elevation must be non-negative.`,
            });
            failed++;
          }
        } else {
          passed++;
        }

        // Check overlap with next floor
        if (i < bldFloors.length - 1) {
          const nextFloor = bldFloors[i + 1];
          if (floor.top_height > nextFloor.bottom_height + 0.001) {
            details.push({
              category: 'Floor Consistency',
              entityId: `${floor.floor_id} / ${nextFloor.floor_id}`,
              status: 'FAIL',
              message: `Vertical overlap detected between Floor ${floor.floor_number} (top: ${floor.top_height}m) and Floor ${nextFloor.floor_number} (bottom: ${nextFloor.bottom_height}m).`,
            });
            failed++;
          } else {
            passed++;
          }
        }

        if (floor.top_height > maxFloorTop) {
          maxFloorTop = floor.top_height;
        }
      }

      if (bld.total_building_height < maxFloorTop) {
        details.push({
          category: 'Floor Consistency',
          entityId: bld.building_id,
          status: 'WARNING',
          message: `Building total height (${bld.total_building_height}m) is less than registered floor ceiling (${maxFloorTop}m).`,
        });
      } else {
        passed++;
        details.push({
          category: 'Floor Consistency',
          entityId: bld.building_id,
          status: 'PASS',
          message: `Building ${bld.building_id} total height (${bld.total_building_height}m) covers all floor extents (${maxFloorTop}m).`,
        });
      }
    }
  }

  // 2. Validate Properties & Vertical Geometry
  for (const prop of db.propertyUnits) {
    const bld = db.buildings.find((b) => b.building_id === prop.building_id);
    const floor = db.floors.find((f) => f.floor_id === prop.floor_id);
    const geom = db.verticalGeometries.find((g) => g.property_id === prop.property_id);
    const p3d = db.prototype3DPropertyIds.find((p) => p.property_id === prop.property_id);
    const ownerships = db.ownerships.filter((o) => o.property_id === prop.property_id);

    if (!bld) {
      details.push({
        category: 'Relational Foreign Keys',
        entityId: prop.property_id,
        status: 'FAIL',
        message: `Property ${prop.property_id} references non-existent building ID "${prop.building_id}".`,
      });
      failed++;
    } else {
      passed++;
    }

    if (!floor) {
      details.push({
        category: 'Relational Foreign Keys',
        entityId: prop.property_id,
        status: 'FAIL',
        message: `Property ${prop.property_id} references non-existent floor ID "${prop.floor_id}".`,
      });
      failed++;
    } else {
      passed++;
    }

    if (ownerships.length === 0) {
      details.push({
        category: 'Relational Foreign Keys',
        entityId: prop.property_id,
        status: 'WARNING',
        message: `Property ${prop.property_id} has no registered owner linked in the Ownership table.`,
      });
    } else {
      passed++;
      const totalShare = ownerships.reduce((acc, curr) => acc + (curr.ownership_share || 0), 0);
      if (Math.abs(totalShare - 100) > 0.1) {
        details.push({
          category: 'Relational Foreign Keys',
          entityId: prop.property_id,
          status: 'WARNING',
          message: `Total ownership shares for Property ${prop.property_id} sum to ${totalShare}% (expected 100%).`,
        });
      }
    }

    if (!geom) {
      details.push({
        category: 'Vertical Extent',
        entityId: prop.property_id,
        status: 'FAIL',
        message: `Property ${prop.property_id} is missing vertical geometry record. 3D representation cannot be generated.`,
      });
      failed++;
    } else {
      if (geom.top_height <= geom.bottom_height) {
        details.push({
          category: 'Vertical Extent',
          entityId: prop.property_id,
          status: 'FAIL',
          message: `Property ${prop.property_id} vertical geometry top height (${geom.top_height}m) <= bottom height (${geom.bottom_height}m).`,
        });
        failed++;
      } else {
        passed++;
      }

      if (geom.width <= 0 || geom.length <= 0) {
        details.push({
          category: 'Vertical Extent',
          entityId: prop.property_id,
          status: 'FAIL',
          message: `Property ${prop.property_id} horizontal dimensions (width: ${geom.width}m, length: ${geom.length}m) must be strictly positive.`,
        });
        failed++;
      } else {
        passed++;
      }

      if (floor) {
        const bottomH = typeof geom.bottom_height === 'number' && !isNaN(geom.bottom_height) ? geom.bottom_height : 0;
        const topH = typeof geom.top_height === 'number' && !isNaN(geom.top_height) ? geom.top_height : 3;
        const floorBottom = typeof floor.bottom_height === 'number' && !isNaN(floor.bottom_height) ? floor.bottom_height : 0;
        const floorTop = typeof floor.top_height === 'number' && !isNaN(floor.top_height) ? floor.top_height : 3;

        if (bottomH < floorBottom || topH > floorTop) {
          details.push({
            category: 'Vertical Extent',
            entityId: prop.property_id,
            status: 'WARNING',
            message: `Property ${prop.property_id} vertical extent [${bottomH}m, ${topH}m] exceeds assigned floor [${floorBottom}m, ${floorTop}m].`,
          });
        } else {
          passed++;
          const deltaH = Math.max(0, topH - bottomH);
          details.push({
            category: 'Vertical Extent',
            entityId: prop.property_id,
            status: 'PASS',
            message: `Property ${prop.property_id} vertical extent [${bottomH}m - ${topH}m, Δh=${deltaH.toFixed(1)}m] is fully bounded within Floor ${floor.floor_number}.`,
          });
        }
      }
    }

    if (!p3d) {
      details.push({
        category: 'Identifier Format',
        entityId: prop.property_id,
        status: 'FAIL',
        message: `Property ${prop.property_id} has no generated Prototype 3D Property ID in the database.`,
      });
      failed++;
    } else {
      passed++;
      details.push({
        category: 'Identifier Format',
        entityId: prop.property_id,
        status: 'PASS',
        message: `Prototype 3D Property ID "${p3d.generated_identifier}" is stored and associated with Unit ${prop.flat_number}.`,
      });
    }
  }

  return {
    isValid: failed === 0,
    timestamp: new Date().toISOString(),
    totalChecks: passed + failed,
    passedChecks: passed,
    failedChecks: failed,
    details,
  };
}

/**
 * Join all relational tables into unified EnrichedProperty objects
 */
export function getEnrichedProperties(db: DatabaseState): EnrichedProperty[] {
  const result: EnrichedProperty[] = [];

  for (const prop of db.propertyUnits) {
    const building = db.buildings.find((b) => b.building_id === prop.building_id) || {
      id: 'unknown-bld',
      building_id: prop.building_id || 'UNKNOWN',
      survey_number: 'N/A',
      address: 'Address not registered in location module',
      latitude: 17.4485,
      longitude: 78.3748,
      plot_area: 0,
      number_of_floors: 1,
      total_building_height: 3.0,
      state_code: 'TS',
      created_at: new Date().toISOString(),
    };

    const floor = db.floors.find((f) => f.floor_id === prop.floor_id) || {
      id: 'unknown-flr',
      floor_id: prop.floor_id || 'UNKNOWN-FLR',
      building_id: prop.building_id,
      floor_number: 1,
      bottom_height: 0.0,
      top_height: 3.0,
      floor_name: 'Level 1',
      created_at: new Date().toISOString(),
    };

    const verticalGeometry = db.verticalGeometries.find((g) => g.property_id === prop.property_id) || {
      id: 'unknown-geom',
      geometry_id: `GEOM-${prop.property_id}`,
      property_id: prop.property_id,
      bottom_height: floor.bottom_height,
      top_height: floor.top_height,
      width: 10.0,
      length: 12.0,
      height: Math.max(1, floor.top_height - floor.bottom_height),
      created_at: new Date().toISOString(),
    };

    // Calculate height properly if missing
    verticalGeometry.height = Math.max(0, verticalGeometry.top_height - verticalGeometry.bottom_height);

    let prototype3DId = db.prototype3DPropertyIds.find((p) => p.property_id === prop.property_id);
    if (!prototype3DId) {
      prototype3DId = {
        id: `pid-${prop.property_id.toLowerCase()}`,
        internal_id: `INT-${prop.property_id}`,
        property_id: prop.property_id,
        generated_identifier: generatePrototype3DPropertyId(
          building.state_code,
          building.building_id,
          floor.floor_number,
          prop.flat_number
        ),
        format_pattern: '{STATE}-{BUILDING}-{FLOOR}-{UNIT}',
        generated_at: new Date().toISOString(),
        status: 'PROTOTYPE_ACTIVE',
      };
    }

    const ownershipRows = db.ownerships.filter((o) => o.property_id === prop.property_id);
    const owners = ownershipRows.map((ownership) => {
      const owner = db.owners.find((o) => o.owner_id === ownership.owner_id) || {
        id: 'unknown-owner',
        owner_id: ownership.owner_id,
        owner_name: 'Unassigned Owner',
        created_at: new Date().toISOString(),
      };
      return { ownership, owner };
    });

    const propertyRecord = db.propertyRecords.find((r) => r.property_id === prop.property_id);

    const location = db.locations.find((l) => l.building_id === building.building_id) || {
      id: 'loc-default',
      location_id: `LOC-${building.building_id}`,
      building_id: building.building_id,
      latitude: building.latitude,
      longitude: building.longitude,
      address: building.address,
      created_at: new Date().toISOString(),
    };

    // Validation checks for this single property
    const errors: string[] = [];
    const warnings: string[] = [];

    if (verticalGeometry.top_height <= verticalGeometry.bottom_height) {
      errors.push(`Top height (${verticalGeometry.top_height}m) must be > bottom height (${verticalGeometry.bottom_height}m)`);
    }
    if (verticalGeometry.width <= 0 || verticalGeometry.length <= 0) {
      errors.push('Width and length must be greater than zero');
    }
    if (owners.length === 0) {
      warnings.push('No owner attached in ownership table');
    }

    result.push({
      property: prop,
      building,
      floor,
      verticalGeometry,
      prototype3DId,
      owners,
      propertyRecord,
      location,
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
    });
  }

  return result;
}
