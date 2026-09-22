import React from 'react';
import {
  Building2,
  FileCheck2,
  Stamp,
  Flame,
  Compass,
  Box,
  Map,
  FileSpreadsheet,
  Layers,
  Building,
  List,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react';
import { NavigationTab } from './Navbar';
import { useAuth } from '../services/authService';

interface SidebarNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onClose?: () => void;
  onCloseMobile?: () => void;
}

interface NavGroup {
  title: string;
  items: {
    id: NavigationTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[];
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentTab,
  onSelectTab,
  onClose,
  onCloseMobile,
}) => {
  const { currentRole } = useAuth();

  const navGroups: NavGroup[] = [
    {
      title: 'Statutory Workflows',
      items: [
        {
          id: 'surveyor-submissions',
          label: 'Surveyor Pipeline',
          sublabel: 'Field Ingest & Stage 1',
          icon: Building2,
          badge: currentRole === 'surveyor' ? 'Active' : undefined,
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        },
        {
          id: 'planner-queue',
          label: 'Town Planner Queue',
          sublabel: 'Setbacks & Height Audit',
          icon: FileCheck2,
          badge: currentRole === 'town_planner' ? 'Audit' : undefined,
          badgeColor: 'bg-blue-100 text-[#1e3a8a] border-blue-300',
        },
        {
          id: 'sro-queue',
          label: 'SRO Title & 3D ULPIN',
          sublabel: 'Deed Seal & Registry',
          icon: Stamp,
          badge: currentRole === 'sro_officer' ? 'Seal' : undefined,
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        },
        {
          id: 'tactical-responder',
          label: 'Emergency & Tactical HUD',
          sublabel: '300m GPS Disaster Mode',
          icon: Flame,
          badge: currentRole === 'emergency_responder' ? 'Live' : undefined,
          badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
        },
      ],
    },
    {
      title: '3D Spatial Cadastre',
      items: [
        {
          id: 'geo-cadastre-explorer',
          label: 'PostGIS 3D Ingestion',
          sublabel: 'Coordinate & Radius Lookup',
          icon: Compass,
          badge: 'Spatial',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
        },
        {
          id: 'combined-demo',
          label: '3D Volumetric Explorer',
          sublabel: 'Unit Extrusion & Slicing',
          icon: Box,
        },
        {
          id: 'map',
          label: 'GIS Cadastral Map',
          sublabel: 'Leaflet 2D/3D Footprints',
          icon: Map,
        },
      ],
    },
    {
      title: 'Official Registers & Ledgers',
      items: [
        {
          id: 'property-records',
          label: 'Property Records (IGRS)',
          sublabel: 'Deed Ledgers & CSV Import',
          icon: FileSpreadsheet,
        },
        {
          id: 'buildings',
          label: 'Building Inventory',
          sublabel: 'Plot & Elevation Geometry',
          icon: Building,
        },
        {
          id: 'properties',
          label: 'Unit Catalog & ULPINs',
          sublabel: 'Floor, Flat & Owner Ledger',
          icon: List,
        },
        {
          id: 'dashboard',
          label: 'Analytics & Audits',
          sublabel: 'Spatial Distribution & KPIs',
          icon: Layers,
        },
      ],
    },
  ];

  const handleItemClick = (id: NavigationTab) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 font-sans min-h-[calc(100vh-4rem)] h-full">
      {/* Navigation Sections */}
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        {/* Quick Close Button Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            Navigation Menu
          </span>
          {(onClose || onCloseMobile) && (
            <button
              id="btn-close-sidebar"
              type="button"
              onClick={onClose || onCloseMobile}
              className="p-1 px-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              title="Close sidebar"
            >
              <span className="text-[10px] font-medium">Close</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              {group.title}
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full px-3 py-2 rounded text-left flex items-center justify-between text-xs transition-colors cursor-pointer group ${
                      isActive
                        ? 'bg-[#1e3a8a] text-white font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-500 group-hover:text-[#1e3a8a]'
                        }`}
                      />
                      <div className="truncate">
                        <div className="truncate leading-tight font-medium text-xs">
                          {item.label}
                        </div>
                        <div
                          className={`text-[10px] truncate leading-tight ${
                            isActive ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          {item.sublabel}
                        </div>
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`shrink-0 ml-1.5 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border ${
                          isActive
                            ? 'bg-blue-800 text-white border-blue-600'
                            : item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Institutional Student Capstone Project Information Card */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-2">
        <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
          <GraduationCap className="w-4 h-4 text-[#1e3a8a]" />
          <span>Capstone Project 2026</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-snug">
          Smart India Hackathon Finalist (Problem ID: <strong>SIH26011</strong>)
          <br />
          Built with PostGIS 3.4, Three.js, React & Tailwind CSS.
        </p>
        <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-200">
          <span>Standards: OGC / ISO 19152</span>
          <span className="text-[#059669] font-bold">LADM v2</span>
        </div>
      </div>
    </aside>
  );
};
