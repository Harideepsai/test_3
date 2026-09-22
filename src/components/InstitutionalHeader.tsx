import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  Building2,
  FileCheck2,
  Stamp,
  User,
  Radio,
  Flame,
  Check,
  Key,
  LogOut,
  Menu,
  X,
  PanelLeft,
  PanelLeftClose,
  Compass,
} from 'lucide-react';
import { ValidationReport, UserRole } from '../types';
import { useAuth, DEMO_PERSONAS } from '../services/authService';

interface InstitutionalHeaderProps {
  validationReport: ValidationReport | null;
  onOpenValidationModal: () => void;
  onResetDatabase: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const InstitutionalHeader: React.FC<InstitutionalHeaderProps> = ({
  validationReport,
  onOpenValidationModal,
  onResetDatabase,
  onToggleSidebar,
  isSidebarOpen = false,
}) => {
  const { activePersona, currentRole, switchPersona, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'surveyor':
        return <Building2 className="w-3.5 h-3.5 text-amber-300" />;
      case 'town_planner':
        return <FileCheck2 className="w-3.5 h-3.5 text-blue-200" />;
      case 'sro_officer':
        return <Stamp className="w-3.5 h-3.5 text-emerald-300" />;
      case 'citizen':
        return <User className="w-3.5 h-3.5 text-slate-200" />;
      case 'emergency_responder':
        return <Flame className="w-3.5 h-3.5 text-rose-300" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1e3a8a] text-white shadow-md border-b border-blue-950 font-sans">
      {/* 1. Indian National Portal Tricolor Ribbon */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#ff9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* 2. Top Municipal Institutional Header Bar */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Emblem & Institutional Title */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              id="btn-toggle-sidebar"
              type="button"
              onClick={onToggleSidebar}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded bg-blue-900/80 hover:bg-blue-800 text-blue-100 border border-blue-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title={isSidebarOpen ? "Close navigation sidebar" : "Open navigation sidebar"}
              aria-label="Toggle navigation"
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-amber-300" /> : <PanelLeft className="w-4 h-4 text-blue-200" />}
              <span className="text-xs font-semibold hidden md:inline">
                {isSidebarOpen ? 'Close Menu' : 'Menu'}
              </span>
            </button>
          )}

          {/* Institutional Seal Badge */}
          <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-xs">
            {/* Ashoka Chakra & Cadastre geometric emblem vector */}
            <svg
              className="w-7 h-7 text-amber-300 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M12 2.5v19M2.5 12h19M5.28 5.28l13.44 13.44M5.28 18.72L18.72 5.28"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              <polygon points="12,4 13,8 12,6 11,8" fill="currentColor" />
              <polygon points="12,20 13,16 12,18 11,16" fill="currentColor" />
              <polygon points="4,12 8,13 6,12 8,11" fill="currentColor" />
              <polygon points="20,12 16,13 18,12 16,11" fill="currentColor" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono tracking-wider uppercase text-blue-200 font-semibold">
                GOVERNMENT OF INDIA &bull; DEPT. OF LAND RESOURCES / DILRMP
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug truncate">
              National 3D ULPIN & Vertical Property Registry
            </h1>
            <p className="text-[11px] text-blue-200 hidden md:block leading-none mt-0.5 font-normal">
              Digital Cadastral GIS & Volumetric Spatial Title Management &bull; Capstone Project by Team CadastreGeeks
            </p>
          </div>
        </div>

        {/* Right: Relational Audit, Reset DB, & Official Officer Login Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Relational Integrity Audit Button */}
          <button
            onClick={onOpenValidationModal}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              validationReport?.isValid
                ? 'bg-emerald-950/70 text-emerald-200 border-emerald-500/50 hover:bg-emerald-900/80'
                : 'bg-rose-950/70 text-rose-200 border-rose-500/50 hover:bg-rose-900/80'
            }`}
            title="Inspect Database Foreign-Key & Volumetric Geometry Integrity"
          >
            {validationReport?.isValid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="hidden md:inline">Relational Audit:</span>
            <span>{validationReport?.isValid ? 'Passed' : 'Issues'}</span>
          </button>

          {/* Reset Demo Database */}
          <button
            onClick={onResetDatabase}
            className="p-1.5 rounded bg-blue-900 hover:bg-blue-800 text-blue-200 hover:text-white border border-blue-700 transition-colors cursor-pointer"
            title="Reset Database to Default SIH Demo Records"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Departmental RBAC Officer Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-3 py-1.5 rounded bg-blue-900/90 hover:bg-blue-800 text-white border border-blue-700 flex items-center gap-2 text-xs font-medium transition-colors shadow-xs cursor-pointer"
              title="Change Authorized Officer Persona"
              aria-expanded={isDropdownOpen}
            >
              <div className="p-0.5 rounded bg-blue-950/60 border border-blue-700">
                {getRoleIcon(currentRole)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[10px] text-blue-200 leading-none">Role:</div>
                <div className="font-semibold text-xs text-white leading-tight">
                  {activePersona.roleTitle.split(' ')[0]}
                </div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-blue-300 transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Officer Dropdown Card */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg bg-white border border-slate-300 shadow-xl z-50 text-slate-800 text-xs overflow-hidden">
                <div className="p-3 bg-slate-100 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      Select Authorized Officer Role
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-[#1e3a8a] font-bold border border-blue-200">
                      RBAC Mode
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Student Hackathon Prototype: Switch role to experience statutory workflows.
                  </p>
                </div>

                <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                  {(Object.keys(DEMO_PERSONAS) as UserRole[]).map((role) => {
                    const p = DEMO_PERSONAS[role];
                    const isCurrent = role === currentRole;
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          switchPersona(role);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 rounded text-left border flex items-start gap-2.5 transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-50 border-[#1e3a8a] ring-1 ring-[#1e3a8a]'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="p-1 rounded bg-slate-100 border border-slate-200 mt-0.5">
                          {getRoleIcon(role)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {p.roleTitle}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-[#059669] font-bold flex items-center gap-0.5 font-mono">
                                <Check className="w-3 h-3" /> ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                            {p.name} &bull; {p.email}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                            {p.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="flex items-center gap-1 font-mono">
                    <Key className="w-3.5 h-3.5 text-amber-600" /> Passcode: <strong>guest123</strong>
                  </span>
                  <button
                    onClick={() => {
                      signOut();
                      setIsDropdownOpen(false);
                    }}
                    className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition-colors"
                  >
                    Reset Role
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
