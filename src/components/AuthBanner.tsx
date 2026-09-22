import React, { useState, useRef, useEffect } from 'react';
import { useAuth, DEMO_PERSONAS } from '../services/authService';
import { UserRole } from '../types';
import {
  ShieldCheck,
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
  Info,
  Sparkles,
} from 'lucide-react';

export const AuthBanner: React.FC = () => {
  const {
    activePersona,
    currentRole,
    switchPersona,
    isSupabaseAuthActive,
    isLoading,
    signOut,
  } = useAuth();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'surveyor':
        return <Building2 className="w-4 h-4 text-amber-400" />;
      case 'town_planner':
        return <FileCheck2 className="w-4 h-4 text-indigo-400" />;
      case 'sro_officer':
        return <Stamp className="w-4 h-4 text-cyan-400" />;
      case 'citizen':
        return <User className="w-4 h-4 text-emerald-400" />;
      case 'emergency_responder':
        return <Flame className="w-4 h-4 text-rose-400 animate-pulse" />;
    }
  };

  const getRoleBadgeClasses = (role: UserRole) => {
    switch (role) {
      case 'surveyor':
        return 'bg-amber-50 border-amber-300 text-amber-900';
      case 'town_planner':
        return 'bg-indigo-50 border-indigo-300 text-indigo-900';
      case 'sro_officer':
        return 'bg-cyan-50 border-cyan-300 text-cyan-900';
      case 'citizen':
        return 'bg-emerald-50 border-emerald-300 text-emerald-900';
      case 'emergency_responder':
        return 'bg-rose-100 border-rose-400 text-rose-950 ring-2 ring-rose-300 animate-pulse';
    }
  };

  return (
    <div
      className={`border-b text-xs transition-colors ${
        currentRole === 'emergency_responder'
          ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-xs'
          : 'bg-slate-100/90 border-slate-200 text-slate-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active Persona & Role Description */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span className="hidden sm:inline font-semibold">RBAC Governance:</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-2 shadow-xs ${getRoleBadgeClasses(
              currentRole
            )}`}
          >
            {getRoleIcon(currentRole)}
            <span>{activePersona.roleTitle}</span>
            <span className="text-[10px] font-mono opacity-75 hidden md:inline">
              ({activePersona.name})
            </span>
          </div>

          {currentRole === 'emergency_responder' && (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-mono uppercase tracking-wide">
              <Radio className="w-3 h-3 text-rose-600 animate-spin" />
              Tactical HUD Active &bull; Zero-Trust Citizen Privacy
            </span>
          )}
        </div>

        {/* Right: Quick Switch Persona Dropdown */}
        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          <div className="text-[11px] text-slate-500 hidden lg:block font-mono">
            Hackathon Fast Auth:
          </div>

          <button
            id="btn-fast-auth-dropdown"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-medium text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-600 animate-ping" />
            <span className="font-semibold text-cyan-800">Quick Switch Persona</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Persona Menu Dropdown */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
              <div className="p-3 bg-gradient-to-r from-slate-50 to-cyan-50 flex items-center justify-between border-b border-slate-200">
                <div>
                  <div className="font-bold text-xs text-slate-900">Select Hackathon Persona</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Common Evaluation Password: <strong className="text-cyan-700">guest123</strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-100 text-cyan-800 border border-cyan-300 font-semibold">
                  5 Roles
                </span>
              </div>

              <div className="p-2 space-y-1.5 max-h-[420px] overflow-y-auto">
                {(Object.keys(DEMO_PERSONAS) as UserRole[]).map((role) => {
                  const p = DEMO_PERSONAS[role];
                  const isCurrent = role === currentRole;
                  return (
                    <button
                      key={role}
                      id={`btn-select-persona-${role}`}
                      onClick={() => {
                        switchPersona(role);
                        setIsOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        isCurrent
                          ? 'bg-cyan-50 border-cyan-500 shadow-xs ring-1 ring-cyan-500'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                        {getRoleIcon(role)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {p.roleTitle}
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 flex items-center gap-1 text-[10px] text-cyan-700 font-mono font-bold">
                              <Check className="w-3 h-3" /> ACTIVE
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                          {p.name} &bull; <span className="text-cyan-700 font-medium">{p.email}</span>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                          {p.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-2.5 bg-slate-50 flex items-center justify-between text-[11px] text-slate-600">
                <span className="flex items-center gap-1 font-mono">
                  <Key className="w-3 h-3 text-amber-600" /> Password: guest123
                </span>
                <button
                  onClick={() => {
                    signOut();
                    setIsOpen(false);
                  }}
                  className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Reset to Public</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
