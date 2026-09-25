/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Building,
  DatabaseState,
  EnrichedProperty,
  Floor,
  PropertyRecord,
  ValidationReport,
} from './types';
import { api } from './services/api';
import { NavigationTab } from './components/Navbar';
import { InstitutionalHeader } from './components/InstitutionalHeader';
import { SidebarNav } from './components/SidebarNav';
import { CombinedDemoView } from './components/CombinedDemoView';
import { DashboardView } from './components/DashboardView';
import { PropertyRecordsView } from './components/PropertyRecordsView';
import { BuildingDetailsView } from './components/BuildingDetailsView';
import { PropertyDetailsView } from './components/PropertyDetailsView';
import { MapPageView } from './components/MapPageView';
import { ValidationModal } from './components/ValidationModal';
import { GeoCadastreApp } from './components/GeoCadastreApp';
import { PlannerQueueView } from './components/PlannerQueueView';
import { SROQueueView } from './components/SROQueueView';
import { SurveyorSubmissionsView } from './components/SurveyorSubmissionsView';
import { TacticalBuildingOverlay } from './components/TacticalBuildingOverlay';
import { ModelIngestionModal } from './components/ModelIngestionModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './services/authService';
import { Box, Loader2, Sparkles, X, ChevronRight, Home, PanelLeft, PanelLeftClose } from 'lucide-react';

export default function App() {
  const { currentRole, activePersona } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('surveyor-submissions');
  const [loading, setLoading] = useState<boolean>(true);
  const [dbState, setDbState] = useState<DatabaseState | null>(null);
  const [enrichedProperties, setEnrichedProperties] = useState<EnrichedProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('PROP001');
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [cadastreRefreshKey, setCadastreRefreshKey] = useState<number>(0);

  // Auto-navigate to the persona's designated queue upon role switch
  useEffect(() => {
    switch (currentRole) {
      case 'surveyor':
        setCurrentTab('surveyor-submissions');
        break;
      case 'town_planner':
        setCurrentTab('planner-queue');
        break;
      case 'sro_officer':
        setCurrentTab('sro-queue');
        break;
      case 'emergency_responder':
        setCurrentTab('tactical-responder');
        break;
      case 'citizen':
        setCurrentTab('combined-demo');
        break;
    }
  }, [currentRole]);

  // Load state from API / Relational Store
  const loadCadastreData = useCallback(async () => {
    try {
      setLoading(true);
      const [state, properties, report] = await Promise.all([
        api.getDatabaseState(),
        api.getProperties(),
        api.getValidationReport(),
      ]);

      setDbState(state);
      setEnrichedProperties(properties);
      setValidationReport(report);

      if (properties.length > 0 && !properties.some((p) => p.property.property_id === selectedPropertyId)) {
        setSelectedPropertyId(properties[0].property.property_id);
      }
    } catch (err) {
      console.error('Error loading cadastre data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    loadCadastreData();
  }, []);

  const handleUpdateProperty = async (updatedFields: any) => {
    if (!selectedPropertyId) return;
    try {
      await api.updateProperty(selectedPropertyId, updatedFields);
      await loadCadastreData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProperty = async (payload: any) => {
    try {
      const created = await api.createProperty(payload);
      if (created) {
        setSelectedPropertyId(created.property.property_id);
      }
      await loadCadastreData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBuilding = async (bldId: string, updated: Partial<Building>) => {
    try {
      await api.updateBuilding(bldId, updated);
      await loadCadastreData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePropertyRecord = async (record: Partial<PropertyRecord>) => {
    try {
      await api.savePropertyRecord(record);
      await loadCadastreData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDatabase = async () => {
    if (window.confirm('Reset database to SIH26011 initial demo state (Building B001, Flat 203, Floor 2)?')) {
      await api.resetDatabase();
      setSelectedPropertyId('PROP001');
      await loadCadastreData();
    }
  };

  const selectedProperty =
    enrichedProperties.find((p) => p.property.property_id === selectedPropertyId) ||
    enrichedProperties[0] ||
    null;

  const allFloors: Floor[] = dbState?.floors || [];
  const buildings: Building[] = dbState?.buildings || [];
  const propertyRecords: PropertyRecord[] = dbState?.propertyRecords || [];

  if (loading && !dbState) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <div className="w-12 h-12 rounded bg-blue-100 border border-blue-300 flex items-center justify-center shadow-xs">
          <Box className="w-6 h-6 text-[#1e3a8a] animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">GeoCadastre 3D Initializing</h2>
          <p className="text-xs text-slate-500 font-mono">Loading SIH26011 Relational Cadastral Database...</p>
        </div>
        <Loader2 className="w-5 h-5 text-[#1e3a8a] animate-spin" />
      </div>
    );
  }

  // Map Tab Names for Breadcrumbs
  const getTabLabel = (tab: NavigationTab) => {
    switch (tab) {
      case 'surveyor-submissions':
        return 'Surveyor Pipeline & Ingest';
      case 'planner-queue':
        return 'Town Planning Zoning & Setback Audit';
      case 'sro-queue':
        return 'SRO Title Deed & 3D ULPIN Sealing';
      case 'tactical-responder':
        return 'Emergency & Tactical HUD';
      case 'geo-cadastre-explorer':
        return 'PostGIS 3D Spatial Query & Ingest';
      case 'combined-demo':
        return '3D Volumetric Explorer';
      case 'map':
        return 'Cadastral GIS Map';
      case 'property-records':
        return 'IGRS Property Records Ledger';
      case 'buildings':
        return 'Building & Parcel Inventory';
      case 'properties':
        return 'Unit Catalog & 3D ULPINs';
      case 'dashboard':
        return 'Analytics & Relational Verification';
      default:
        return 'Cadastre Module';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 1. Official Institutional Header with Tricolor Ribbon & RBAC Switcher */}
      <InstitutionalHeader
        validationReport={validationReport}
        onOpenValidationModal={() => setIsValidationModalOpen(true)}
        onResetDatabase={handleResetDatabase}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* 2. Main Layout with Side Navigation Bar */}
      <div className="flex-1 flex flex-row w-full min-h-[calc(100vh-4rem)] relative overflow-hidden">
        {/* Desktop Sidebar (Collapsible with smooth transition, default closed) */}
        <div
          className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
            isSidebarOpen
              ? 'w-64 opacity-100'
              : 'w-0 opacity-0 pointer-events-none -ml-px overflow-hidden'
          }`}
        >
          <div className="w-64 h-full">
            <SidebarNav
              currentTab={currentTab}
              onSelectTab={setCurrentTab}
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>

        {/* Mobile Sidebar Drawer Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-50 shadow-2xl">
              <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-800 font-mono">CADASTRE NAVIGATION</span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 cursor-pointer"
                  title="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarNav
                  currentTab={currentTab}
                  onSelectTab={(tab) => {
                    setCurrentTab(tab);
                    setIsSidebarOpen(false);
                  }}
                  onClose={() => setIsSidebarOpen(false)}
                  onCloseMobile={() => setIsSidebarOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
          {/* Institutional Breadcrumb & Context Bar */}
          <div className="px-4 sm:px-6 py-2 bg-white border-b border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Sidebar Button */}
              <button
                id="btn-breadcrumb-sidebar-toggle"
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                  isSidebarOpen
                    ? 'bg-blue-50 text-[#1e3a8a] border-blue-200 hover:bg-blue-100 font-semibold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={isSidebarOpen ? "Close navigation sidebar" : "Open navigation sidebar"}
                aria-expanded={isSidebarOpen}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-3.5 h-3.5 text-[#1e3a8a]" />
                ) : (
                  <PanelLeft className="w-3.5 h-3.5 text-[#1e3a8a]" />
                )}
                <span>{isSidebarOpen ? 'Close Menu' : 'Open Menu'}</span>
              </button>

              <span className="text-slate-300">|</span>

              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>Cadastre Portal</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-900">{getTabLabel(currentTab)}</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-500 hidden sm:inline">Active Officer Role:</span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1e3a8a] border border-blue-200 font-bold">
                {activePersona.roleTitle}
              </span>
            </div>
          </div>

          {/* Active View Container */}
          <main className="flex-1 w-full p-4 sm:p-6 md:p-8">
            <ErrorBoundary>
              {currentTab === 'surveyor-submissions' && (
                <SurveyorSubmissionsView
                  key={`surveyor-view-${cadastreRefreshKey}`}
                  refreshTrigger={cadastreRefreshKey}
                  onOpenModelIngestion={() => setIsIngestionModalOpen(true)}
                />
              )}

              {currentTab === 'planner-queue' && (
                <PlannerQueueView
                  key={`planner-view-${cadastreRefreshKey}`}
                  refreshTrigger={cadastreRefreshKey}
                  onSelectBuildingForMap={() => setCurrentTab('geo-cadastre-explorer')}
                />
              )}

              {currentTab === 'sro-queue' && (
                <SROQueueView
                  key={`sro-view-${cadastreRefreshKey}`}
                  refreshTrigger={cadastreRefreshKey}
                  onSelectBuildingForMap={() => setCurrentTab('geo-cadastre-explorer')}
                />
              )}

              {currentTab === 'tactical-responder' && <TacticalBuildingOverlay />}

              {currentTab === 'geo-cadastre-explorer' && <GeoCadastreApp />}

              {currentTab === 'combined-demo' && (
                <div className="max-w-7xl mx-auto">
                  <CombinedDemoView
                    enrichedProperty={selectedProperty}
                    allProperties={enrichedProperties}
                    allFloors={allFloors}
                    selectedPropertyId={selectedPropertyId}
                    onSelectProperty={setSelectedPropertyId}
                    onUpdateProperty={handleUpdateProperty}
                    onRefresh={loadCadastreData}
                  />
                </div>
              )}

              {currentTab === 'dashboard' && dbState && (
                <div className="max-w-7xl mx-auto">
                  <DashboardView
                    dbState={dbState}
                    enrichedProperties={enrichedProperties}
                    validationReport={validationReport}
                    onNavigate={setCurrentTab}
                    onSelectProperty={setSelectedPropertyId}
                  />
                </div>
              )}

              {currentTab === 'property-records' && (
                <div className="max-w-7xl mx-auto">
                  <PropertyRecordsView
                    propertyRecords={propertyRecords}
                    onSaveRecord={handleSavePropertyRecord}
                    onRefresh={loadCadastreData}
                  />
                </div>
              )}

              {currentTab === 'buildings' && (
                <div className="max-w-7xl mx-auto">
                  <BuildingDetailsView
                    buildings={buildings}
                    floors={allFloors}
                    onUpdateBuilding={handleUpdateBuilding}
                    onRefresh={loadCadastreData}
                  />
                </div>
              )}

              {currentTab === 'properties' && (
                <div className="max-w-7xl mx-auto">
                  <PropertyDetailsView
                    enrichedProperties={enrichedProperties}
                    selectedPropertyId={selectedPropertyId}
                    onSelectProperty={setSelectedPropertyId}
                    onCreateProperty={handleCreateProperty}
                    onRefresh={loadCadastreData}
                    buildings={buildings}
                    allFloors={allFloors}
                  />
                </div>
              )}

              {currentTab === 'map' && (
                <div className="max-w-7xl mx-auto">
                  <MapPageView
                    enrichedProperty={selectedProperty}
                    allProperties={enrichedProperties}
                    allFloors={allFloors}
                    selectedPropertyId={selectedPropertyId}
                    onSelectProperty={setSelectedPropertyId}
                    onUpdateProperty={handleUpdateProperty}
                    onUpdateCoordinates={async (lat, lng) => {
                      await handleUpdateProperty({ latitude: lat, longitude: lng });
                    }}
                    onRefresh={loadCadastreData}
                  />
                </div>
              )}
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Official Municipal Portal Footer */}
      <footer className="border-t border-slate-200 bg-white py-3.5 px-6 text-xs text-slate-600 shadow-xs font-sans">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              Department of Land Resources &bull; Government of India
            </span>
            <span className="text-slate-400">|</span>
            <span>Digital India Land Records Modernization Programme (DILRMP)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
            <span>Problem ID: <strong>SIH26011</strong></span>
            <span>&bull;</span>
            <span>Prototype 3D Cadastre by <strong>Team CadastreGeeks</strong></span>
          </div>
        </div>
      </footer>

      {/* Relational Validation Audit Modal */}
      {isValidationModalOpen && validationReport && (
        <ValidationModal
          isOpen={isValidationModalOpen}
          onClose={() => setIsValidationModalOpen(false)}
          report={validationReport}
        />
      )}

      {/* Surveyor 3D Model / Coordinate Ingestion Modal */}
      {isIngestionModalOpen && (
        <ErrorBoundary fallbackTitle="Surveyor 3D Ingestion Modal">
          <ModelIngestionModal
            isOpen={isIngestionModalOpen}
            onClose={() => setIsIngestionModalOpen(false)}
            coordinates={{ lat: 17.443372, lng: 78.541003 }}
            onSuccess={async () => {
              setIsIngestionModalOpen(false);
              await loadCadastreData();
              setCadastreRefreshKey((k) => k + 1);
              setCurrentTab('surveyor-submissions');
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
