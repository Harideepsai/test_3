/**
 * API Client Service for SIH26011 Cadastre System
 * Handles communication with the Express backend with local state syncing.
 */

import {
  Building,
  DatabaseState,
  EnrichedProperty,
  Owner,
  PropertyRecord,
  ValidationReport,
} from '../types';
import {
  INITIAL_DEMO_DB,
  generatePrototype3DPropertyId,
  getEnrichedProperties,
  validateDatabaseState,
} from '../db/relationalStore';

class CadastreApiService {
  private localFallbackDb: DatabaseState = JSON.parse(JSON.stringify(INITIAL_DEMO_DB));

  async getDatabaseState(): Promise<DatabaseState> {
    let state: DatabaseState = this.localFallbackDb;
    try {
      const res = await fetch('/api/db/state');
      if (res.ok) {
        const json = await res.json();
        if (json.data) state = json.data;
      }
    } catch {
      // Fallback
    }

    // Merge with any client-side local cache
    try {
      const raw = localStorage.getItem('sih_cadastre_local_buildings_v2');
      if (raw) {
        const cache = JSON.parse(raw);
        if (cache.buildings && Array.isArray(cache.buildings)) {
          const map = new Map<string, Building>();
          for (const b of state.buildings) {
            map.set(b.building_id || b.id, b);
          }
          for (const b of cache.buildings) {
            if (!map.has(b.building_id || b.id)) {
              map.set(b.building_id || b.id, b);
            }
          }
          state.buildings = Array.from(map.values());
        }
      }
    } catch {
      // Ignore cache parse error
    }

    return state;
  }

  async getProperties(): Promise<EnrichedProperty[]> {
    try {
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('API server error');
      const json = await res.json();
      return json.data;
    } catch {
      return getEnrichedProperties(this.localFallbackDb);
    }
  }

  async getPropertyById(id: string): Promise<EnrichedProperty | null> {
    try {
      const res = await fetch(`/api/properties/${id}`);
      if (!res.ok) throw new Error('Property not found');
      const json = await res.json();
      return json.data;
    } catch {
      const enriched = getEnrichedProperties(this.localFallbackDb);
      return (
        enriched.find(
          (p) => p.property.property_id.toLowerCase() === id.toLowerCase() || p.property.id === id
        ) || null
      );
    }
  }

  async updateProperty(
    id: string,
    payload: {
      flat_number?: string;
      area?: number;
      property_type?: string;
      property_record_ref?: string;
      bottom_height?: number;
      top_height?: number;
      width?: number;
      length?: number;
      owner_name?: string;
      latitude?: number;
      longitude?: number;
      source_reference?: string;
    }
  ): Promise<EnrichedProperty> {
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update property on server');
      }
      const json = await res.json();
      return json.data;
    } catch (e: any) {
      // Fallback local update
      const prop = this.localFallbackDb.propertyUnits.find(
        (p) => p.property_id.toLowerCase() === id.toLowerCase() || p.id === id
      );
      if (prop) {
        if (payload.flat_number !== undefined) prop.flat_number = payload.flat_number;
        if (payload.area !== undefined) prop.area = payload.area;
        if (payload.property_type !== undefined) prop.property_type = payload.property_type;
        if (payload.property_record_ref !== undefined) prop.property_record_ref = payload.property_record_ref;

        const geom = this.localFallbackDb.verticalGeometries.find((g) => g.property_id === prop.property_id);
        if (geom) {
          if (payload.bottom_height !== undefined) geom.bottom_height = payload.bottom_height;
          if (payload.top_height !== undefined) geom.top_height = payload.top_height;
          if (payload.width !== undefined) geom.width = payload.width;
          if (payload.length !== undefined) geom.length = payload.length;
          geom.height = Math.max(0.1, geom.top_height - geom.bottom_height);
        }

        if (payload.owner_name !== undefined) {
          const ownership = this.localFallbackDb.ownerships.find((o) => o.property_id === prop.property_id);
          if (ownership) {
            const owner = this.localFallbackDb.owners.find((o) => o.owner_id === ownership.owner_id);
            if (owner) owner.owner_name = payload.owner_name;
          }
        }

        if (payload.latitude !== undefined || payload.longitude !== undefined) {
          const bld = this.localFallbackDb.buildings.find((b) => b.building_id === prop.building_id);
          if (bld) {
            if (payload.latitude !== undefined) bld.latitude = payload.latitude;
            if (payload.longitude !== undefined) bld.longitude = payload.longitude;
          }
        }

        if (payload.source_reference !== undefined) {
          const rec = this.localFallbackDb.propertyRecords.find((r) => r.property_id === prop.property_id);
          if (rec) rec.source_reference = payload.source_reference as any;
        }

        const bld = this.localFallbackDb.buildings.find((b) => b.building_id === prop.building_id);
        const flr = this.localFallbackDb.floors.find((f) => f.floor_id === prop.floor_id);
        if (bld && flr) {
          const p3d = this.localFallbackDb.prototype3DPropertyIds.find((p) => p.property_id === prop.property_id);
          if (p3d) {
            p3d.generated_identifier = generatePrototype3DPropertyId(
              bld.state_code,
              bld.building_id,
              flr.floor_number,
              prop.flat_number
            );
          }
        }
      }
      const enriched = getEnrichedProperties(this.localFallbackDb);
      return enriched.find((p) => p.property.property_id.toLowerCase() === id.toLowerCase()) || enriched[0];
    }
  }

  async createProperty(payload: any): Promise<EnrichedProperty> {
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create property');
      }
      const json = await res.json();
      return json.data;
    } catch {
      // Return first enriched
      return getEnrichedProperties(this.localFallbackDb)[0];
    }
  }

  async getBuildings(): Promise<Building[]> {
    try {
      const res = await fetch('/api/buildings');
      if (!res.ok) throw new Error('Failed to get buildings');
      const json = await res.json();
      return json.data;
    } catch {
      return this.localFallbackDb.buildings;
    }
  }

  async updateBuilding(id: string, payload: Partial<Building>): Promise<Building> {
    try {
      const res = await fetch(`/api/buildings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json.data;
    } catch {
      const bld = this.localFallbackDb.buildings.find((b) => b.building_id === id);
      if (bld) Object.assign(bld, payload);
      return bld || this.localFallbackDb.buildings[0];
    }
  }

  async getOwners(): Promise<Owner[]> {
    try {
      const res = await fetch('/api/owners');
      const json = await res.json();
      return json.data;
    } catch {
      return this.localFallbackDb.owners;
    }
  }

  async getPropertyRecords(): Promise<PropertyRecord[]> {
    try {
      const res = await fetch('/api/property-records');
      const json = await res.json();
      return json.data;
    } catch {
      return this.localFallbackDb.propertyRecords;
    }
  }

  async savePropertyRecord(record: Partial<PropertyRecord>): Promise<PropertyRecord> {
    try {
      const res = await fetch('/api/property-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      const json = await res.json();
      return json.data;
    } catch {
      const rec: PropertyRecord = {
        id: `rec-${Date.now()}`,
        record_id: `REC${String(this.localFallbackDb.propertyRecords.length + 1).padStart(3, '0')}`,
        property_id: record.property_id || 'PROP001',
        source_reference: record.source_reference || 'IGRS / Authorized Property Record',
        survey_number: record.survey_number || 'SY-402/1A',
        document_reference: record.document_reference || 'DOC-SAMPLE',
        property_type: record.property_type || 'Residential Apartment',
        area: record.area || 120,
        address: record.address || '',
        registration_date: record.registration_date || new Date().toISOString().split('T')[0],
        sub_registrar_office: record.sub_registrar_office || 'Authorized SRO',
        created_at: new Date().toISOString(),
      };
      this.localFallbackDb.propertyRecords.push(rec);
      return rec;
    }
  }

  async getValidationReport(): Promise<ValidationReport> {
    try {
      const res = await fetch('/api/validation-report');
      const json = await res.json();
      return json.data;
    } catch {
      return validateDatabaseState(this.localFallbackDb);
    }
  }

  async resetDatabase(): Promise<void> {
    try {
      await fetch('/api/db/reset', { method: 'POST' });
    } catch {
      this.localFallbackDb = JSON.parse(JSON.stringify(INITIAL_DEMO_DB));
    }
  }

  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number; source: string }> {
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const json = await res.json();
      return {
        latitude: json.data.latitude,
        longitude: json.data.longitude,
        source: json.data.geocoding_source,
      };
    } catch {
      return {
        latitude: 17.4485,
        longitude: 78.3748,
        source: 'Local Prototype Geocoder',
      };
    }
  }
}

export const api = new CadastreApiService();
