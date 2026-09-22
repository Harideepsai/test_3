/**
 * 3D Cadastral File Storage Service
 * Stores and manages binary 3D CAD/BIM models (.glb, .gltf, point clouds, and blueprints)
 * organized strictly by Survey Number.
 * 
 * Supports:
 * - Persistent browser IndexedDB storage (virtually unlimited binary capacity, offline-first)
 * - Server-side filesystem storage under /data/3d_files/{clean_survey_number}/
 * - Supabase storage bucket under surveys/{clean_survey_number}/ (when configured)
 */

import { getSupabaseClient, isSupabaseConfigured, BUCKET_NAME } from '../supabaseClient';

const DB_NAME = 'GeoCadastre3DStorage';
const DB_VERSION = 1;
const STORE_NAME = 'survey_3d_files';

export interface Stored3DFileRecord {
  surveyNumber: string;
  safeSurveyNumber: string;
  fileName: string;
  blob: Blob;
  sizeBytes: number;
  mimeType: string;
  storedAt: string;
  metadata?: Record<string, any>;
}

export function cleanSurveyNumber(surveyNumber?: string): string {
  if (!surveyNumber) return 'SY-UNKNOWN';
  return surveyNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

class Cadastre3DFileStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  // In-memory cache of active object URLs to avoid memory leaks
  private objectUrls: Map<string, string> = new Map();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'surveyNumber' });
          store.createIndex('safeSurveyNumber', 'safeSurveyNumber', { unique: false });
          store.createIndex('storedAt', 'storedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Convert Blob or File to Base64 string for network transfer
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Store a 3D model file (GLB / GLTF / LAS) based on the cadastral Survey Number.
   * Persists in IndexedDB, posts to server storage, and optionally syncs to Supabase.
   */
  async store3DFileBySurveyNumber(
    surveyNumber: string,
    fileOrBlob: Blob | File,
    fileName?: string,
    metadata?: Record<string, any>
  ): Promise<{
    surveyNumber: string;
    safeSurveyNumber: string;
    fileName: string;
    url: string;
    sizeBytes: number;
  }> {
    const rawSurvey = surveyNumber?.trim() || 'SY-DEFAULT';
    const safeSurvey = cleanSurveyNumber(rawSurvey);
    const resolvedName = fileName || (fileOrBlob instanceof File ? fileOrBlob.name : `${safeSurvey}_model.glb`);
    const sizeBytes = fileOrBlob.size;
    const mimeType = fileOrBlob.type || 'model/gltf-binary';
    const storedAt = new Date().toISOString();

    // 1. Store in Browser IndexedDB
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record: Stored3DFileRecord = {
          surveyNumber: rawSurvey,
          safeSurveyNumber: safeSurvey,
          fileName: resolvedName,
          blob: fileOrBlob,
          sizeBytes,
          mimeType,
          storedAt,
          metadata: metadata || {},
        };
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (idbErr) {
      console.warn('Could not save to IndexedDB:', idbErr);
    }

    // 2. Post to Server Storage endpoint /api/files/store-3d
    let serverUrl: string | null = null;
    try {
      const base64Data = await this.blobToBase64(fileOrBlob);
      const res = await fetch('/api/files/store-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyNumber: rawSurvey,
          fileName: resolvedName,
          base64Data,
          metadata: {
            ...metadata,
            storedAt,
            sizeBytes,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        serverUrl = json.url;
      }
    } catch (srvErr) {
      console.warn('Could not post 3D file to server storage endpoint:', srvErr);
    }

    // 3. Sync to Supabase Storage if configured
    let supabaseUrl: string | null = null;
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured) {
      try {
        const storagePath = `surveys/${safeSurvey}/${resolvedName}`;
        await client.storage.createBucket(BUCKET_NAME, { public: true }).catch(() => {});
        const { error } = await client.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileOrBlob, {
            contentType: mimeType,
            upsert: true,
          });
        if (!error) {
          const { data } = client.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
          supabaseUrl = data.publicUrl;
        }
      } catch (sbErr) {
        console.warn('Could not upload to Supabase bucket:', sbErr);
      }
    }

    // Generate local object URL fallback
    if (this.objectUrls.has(rawSurvey)) {
      URL.revokeObjectURL(this.objectUrls.get(rawSurvey)!);
    }
    const localObjUrl = URL.createObjectURL(fileOrBlob);
    this.objectUrls.set(rawSurvey, localObjUrl);

    const activeUrl = serverUrl || supabaseUrl || localObjUrl;

    return {
      surveyNumber: rawSurvey,
      safeSurveyNumber: safeSurvey,
      fileName: resolvedName,
      url: activeUrl,
      sizeBytes,
    };
  }

  /**
   * Retrieve stored 3D model for a given survey number
   */
  async get3DFileBySurveyNumber(surveyNumber: string): Promise<{
    surveyNumber: string;
    blob: Blob;
    url: string;
    fileName: string;
    sizeBytes: number;
  } | null> {
    const rawSurvey = surveyNumber?.trim() || '';
    if (!rawSurvey) return null;
    const safeSurvey = cleanSurveyNumber(rawSurvey);

    // 1. Check IndexedDB
    try {
      const db = await this.getDB();
      const record = await new Promise<Stored3DFileRecord | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(rawSurvey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (record && record.blob) {
        let url = this.objectUrls.get(rawSurvey);
        if (!url) {
          url = URL.createObjectURL(record.blob);
          this.objectUrls.set(rawSurvey, url);
        }
        return {
          surveyNumber: record.surveyNumber,
          blob: record.blob,
          url,
          fileName: record.fileName,
          sizeBytes: record.sizeBytes,
        };
      }
    } catch (e) {
      console.warn('IndexedDB lookup failed:', e);
    }

    // 2. Fallback: Check backend /api/files/3d/:surveyNumber
    try {
      const res = await fetch(`/api/files/3d/${safeSurvey}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        this.objectUrls.set(rawSurvey, url);
        return {
          surveyNumber: rawSurvey,
          blob,
          url,
          fileName: `${safeSurvey}_model.glb`,
          sizeBytes: blob.size,
        };
      }
    } catch (fetchErr) {
      console.warn('Backend 3D file fetch error:', fetchErr);
    }

    return null;
  }

  /**
   * List all stored 3D models categorized by Survey Number
   */
  async listAllStored3DFiles(): Promise<Array<{
    surveyNumber: string;
    safeSurveyNumber: string;
    fileName: string;
    sizeBytes: number;
    storedAt: string;
  }>> {
    const results: Array<{
      surveyNumber: string;
      safeSurveyNumber: string;
      fileName: string;
      sizeBytes: number;
      storedAt: string;
    }> = [];

    // 1. From IndexedDB
    try {
      const db = await this.getDB();
      const idbRecords = await new Promise<Stored3DFileRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      idbRecords.forEach((rec) => {
        results.push({
          surveyNumber: rec.surveyNumber,
          safeSurveyNumber: rec.safeSurveyNumber,
          fileName: rec.fileName,
          sizeBytes: rec.sizeBytes,
          storedAt: rec.storedAt,
        });
      });
    } catch (e) {
      console.warn('Error reading stored files from IndexedDB:', e);
    }

    // 2. Combine with server catalog
    try {
      const res = await fetch('/api/files/3d-catalog');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          json.data.forEach((item: any) => {
            if (!results.some((r) => r.safeSurveyNumber === item.safeSurvey)) {
              results.push({
                surveyNumber: item.surveyNumber || item.safeSurvey,
                safeSurveyNumber: item.safeSurvey,
                fileName: item.files?.[0] || 'model.glb',
                sizeBytes: item.metadata?.fileSize || 0,
                storedAt: item.metadata?.storedAt || new Date().toISOString(),
              });
            }
          });
        }
      }
    } catch {}

    return results;
  }

  /**
   * Download the 3D file (.glb) directly for a survey number
   */
  async triggerFileDownload(surveyNumber: string, customFileName?: string) {
    const record = await this.get3DFileBySurveyNumber(surveyNumber);
    const safeSurvey = cleanSurveyNumber(surveyNumber);
    const downloadName = customFileName || `${safeSurvey}_3D_Cadastre.glb`;

    if (record && record.blob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(record.blob);
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Direct download link via backend
    const link = document.createElement('a');
    link.href = `/api/files/3d/${safeSurvey}`;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- DATABASE 3D FILE STORAGE (RELATIONAL DATABASE STATE) ---

  /**
   * Store building 3D model directly into relational database record
   */
  async storeBuilding3DFileInDatabase(
    buildingId: string,
    fileOrBlob?: Blob | File | null,
    options?: {
      fileName?: string;
      description?: string;
      storedBy?: string;
      modelFormat?: 'glb' | 'gltf';
      lodLevel?: 'LOD1' | 'LOD2' | 'LOD3' | 'LOD4';
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    record?: any;
    building?: any;
    error?: string;
  }> {
    try {
      let base64Data: string | undefined;
      let cleanFileName = options?.fileName;

      if (fileOrBlob) {
        base64Data = await this.blobToBase64(fileOrBlob);
        if (!cleanFileName && fileOrBlob instanceof File) {
          cleanFileName = fileOrBlob.name;
        }
      }

      const res = await fetch(`/api/buildings/${encodeURIComponent(buildingId)}/3d-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Data,
          fileName: cleanFileName,
          description: options?.description,
          storedBy: options?.storedBy,
          modelFormat: options?.modelFormat,
          lodLevel: options?.lodLevel,
          metadata: options?.metadata,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to store 3D file in database');
      }

      return {
        success: true,
        record: data.data?.record,
        building: data.data?.building,
      };
    } catch (err: any) {
      console.error('Error saving building 3D model to database:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Fetch a building's 3D model directly from the database endpoint
   */
  async fetchBuilding3DFileBlob(buildingId: string): Promise<Blob | null> {
    try {
      const res = await fetch(`/api/buildings/${encodeURIComponent(buildingId)}/3d-file`);
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      console.warn('Error fetching building 3D file blob from database:', e);
    }
    return null;
  }

  /**
   * List all 3D files in the database table
   */
  async listAllDatabase3DFiles(includeData = false): Promise<any[]> {
    try {
      const res = await fetch(`/api/database/3d-files?includeData=${includeData}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Error listing database 3D files:', e);
    }
    return [];
  }

  /**
   * Delete 3D file from database table
   */
  async deleteDatabase3DFile(fileId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/database/3d-files/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const cadastreFileStorage = new Cadastre3DFileStorageService();
