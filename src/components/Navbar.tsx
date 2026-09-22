import React from 'react';
import {
  Box,
  Layers,
  Map,
  FileSpreadsheet,
  Building2,
  List,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Compass,
  FileCheck2,
  Stamp,
  Flame,
  Radio,
} from 'lucide-react';
import { ValidationReport } from '../types';
import { useAuth } from '../services/authService';
import { AuthBanner } from './AuthBanner';

export type NavigationTab =
  | 'geo-cadastre-explorer'
  | 'planner-queue'
  | 'sro-queue'
  | 'surveyor-submissions'
  | 'tactical-responder'
  | 'combined-demo'
  | 'dashboard'
  | 'property-records'
  | 'buildings'
  | 'properties'
  | 'map';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  validationReport: ValidationReport | null;
  onOpenValidationModal: () => void;
  onResetDatabase: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  validationReport,
  onOpenValidationModal,
  onResetDatabase,
}) => {
  const { currentRole } = useAuth();

  // Dynamic tabs: highlight role-priority queues first
  const tabs = [
    // Role-specific primary tabs
    ...(currentRole === 'town_planner'
      ? [
          {
            id: 'planner-queue' as NavigationTab,
            label: 'ULB Planning Queue',
            icon: FileCheck2,
            badge: 'Audit',
            highlight: true,
          },
        ]
      : []),
    ...(currentRole === 'sro_officer'
      ? [
          {
            id: 'sro-queue' as NavigationTab,
            label: 'SRO Title & 3D ULPIN',
            icon: Stamp,
            badge: 'Seal',
            highlight: true,
          },
        ]
      : []),
    ...(currentRole === 'surveyor'
      ? [
          {
            id: 'surveyor-submissions' as NavigationTab,
            label: 'Cadastral Lifecycle',
            icon: Building2,
            badge: 'Drafts',
            highlight: true,
          },
        ]
      : []),
    ...(currentRole === 'emergency_responder'
      ? [
          {
            id: 'tactical-responder' as NavigationTab,
            label: 'Tactical Disaster HUD',
            icon: Flame,
            badge: '300m GPS',
            highlight: true,
          },
        ]
      : []),

    // If not current role, still show queue tabs so evaluator can inspect all queues easily
    ...(currentRole !== 'town_planner'
      ? [
          {
            id: 'planner-queue' as NavigationTab,
            label: 'Town Planner Queue',
            icon: FileCheck2,
          },
        ]
      : []),
    ...(currentRole !== 'sro_officer'
      ? [
          {
            id: 'sro-queue' as NavigationTab,
            label: 'SRO Deed Queue',
            icon: Stamp,
          },
        ]
      : []),
    ...(currentRole !== 'surveyor'
      ? [
          {
            id: 'surveyor-submissions' as NavigationTab,
            label: 'Surveyor Pipeline',
            icon: Building2,
          },
        ]
      : []),
    ...(currentRole !== 'emergency_responder'
      ? [
          {
            id: 'tactical-responder' as NavigationTab,
            label: 'Tactical HUD',
            icon: Flame,
          },
        ]
      : []),

    // Core Cadastral Views
    {
      id: 'geo-cadastre-explorer' as NavigationTab,
      label: 'PostGIS 3D Ingestion',
      icon: Compass,
      badge: 'Spatial',
    },
    {
      id: 'combined-demo' as NavigationTab,
      label: '3D Building Demo',
      icon: Box,
    },
    {
      id: 'map' as NavigationTab,
      label: 'GIS Cadastral Map',
      icon: Map,
    },
    {
      id: 'property-records' as NavigationTab,
      label: 'Property Records (IGRS)',
      icon: FileSpreadsheet,
    },
    {
      id: 'dashboard' as NavigationTab,
      label: 'Analytics Dashboard',
      icon: Layers,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 border-b border-slate-200 backdrop-blur-md shadow-xs">
      {/* Top Banner: RBAC Fast Auth Switcher */}
      <AuthBanner />

      {/* SIH Hackathon Sub-Banner */}
      <div className="bg-gradient-to-r from-cyan-50 via-slate-50 to-indigo-50 px-4 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 font-bold tracking-wider rounded bg-cyan-600 text-white text-[10px] uppercase">
            SIH 2026
          </span>
          <span className="text-slate-700 font-medium text-[11px] hidden sm:inline">
            Problem Statement SIH26011: 3D ULPIN Generation & Vertical Property Mapping
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Validation Status Pill */}
          <button
            onClick={onOpenValidationModal}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors ${
              validationReport?.isValid
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
            title="View Database Relational & Geometry Integrity Report"
          >
            {validationReport?.isValid ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-3 h-3 text-rose-600" />
            )}
            <span>Relational Integrity: {validationReport?.isValid ? 'Valid' : 'Issues'}</span>
          </button>

          {/* Reset Demo State */}
          <button
            onClick={onResetDatabase}
            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-150 transition-colors"
            title="Reset Database to Initial State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 flex items-center justify-center shadow-md shadow-cyan-600/20">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>GeoCadastre 3D</span>
              <span className="text-[10px] font-mono text-cyan-800 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                v1.0-alpha
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-none hidden sm:block">
              Vertical 3D Cadastral & Spatial Property Unit System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id as NavigationTab)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && !isActive && (
                  <span className="hidden md:inline-block px-1.5 py-0.2 text-[9px] rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
