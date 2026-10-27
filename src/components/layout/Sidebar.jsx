import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Sliders,
  CheckCircle2,
  TrendingUp,
  FileText,
  Edit3,
  History,
  ListTodo,
  BarChart3,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, DEMO_USERS } from '../../lib/constants';

export const Sidebar = () => {
  const { currentUser, role, switchRole, logout } = useAuth();
  const navigate = useNavigate();

  // Menu items configured strictly per role from the documentation mockups
  const getNavItems = () => {
    if (role === ROLES.STAF) {
      return [
        { name: 'Dashboard Saya', to: '/', icon: LayoutGrid },
        { name: 'Input Capaian', to: '/input-capaian', icon: Edit3 },
        { name: 'Riwayat Pengajuan', to: '/riwayat-pengajuan', icon: History },
        { name: 'Tindak Lanjut', to: '/tindak-lanjut-staf', icon: ListTodo },
      ];
    }

    if (role === ROLES.MANAJEMEN) {
      return [
        { name: 'Dashboard', to: '/', icon: LayoutGrid },
        { name: 'Kelola KPI & Target', to: '/kelola-kpi', icon: Sliders },
        { name: 'Review Laporan', to: '/review-laporan', icon: FileText, badge: '2' },
      ];
    }

    // Default: Supervisor
    return [
      { name: 'Dashboard', to: '/', icon: LayoutGrid },
      { name: 'Kelola KPI & Target', to: '/kelola-kpi', icon: Sliders },
      { name: 'Validasi Data', to: '/validasi', icon: CheckCircle2, badge: '5' },
      { name: 'Analisis & Tindak Lanjut', to: '/analisis-tindak-lanjut', icon: TrendingUp },
      { name: 'Laporan KPI', to: '/laporan-kpi', icon: FileText },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-astra-navy text-slate-300 min-h-screen flex flex-col justify-between shrink-0 no-print select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-astra-800 flex items-center justify-center text-white shadow-md">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">KPI Monitor</span>
        </div>

        {/* Navigation Menu */}
        <div className="px-3 pt-2 space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2.5">
              MENU
            </p>
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800/90 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-900">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Role Switcher & User Profile */}
      <div className="p-3 border-t border-slate-800/80">
        {/* Role Quick Switcher for Testing/Demo */}
        <div className="mb-3 px-2 py-2 rounded-xl bg-slate-800/50 text-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-astra-400" /> Ganti Peran (Simulasi):
          </p>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => {
                switchRole(ROLES.SUPERVISOR);
                navigate('/');
              }}
              className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                role === ROLES.SUPERVISOR
                  ? 'bg-astra-800 text-white'
                  : 'text-slate-400 hover:bg-slate-700/60'
              }`}
            >
              Supervisor
            </button>
            <button
              onClick={() => {
                switchRole(ROLES.STAF);
                navigate('/');
              }}
              className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                role === ROLES.STAF
                  ? 'bg-astra-800 text-white'
                  : 'text-slate-400 hover:bg-slate-700/60'
              }`}
            >
              Staf
            </button>
            <button
              onClick={() => {
                switchRole(ROLES.MANAJEMEN);
                navigate('/');
              }}
              className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                role === ROLES.MANAJEMEN
                  ? 'bg-astra-800 text-white'
                  : 'text-slate-400 hover:bg-slate-700/60'
              }`}
            >
              Manajemen
            </button>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="p-2.5 rounded-xl bg-slate-800/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-astra-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser?.initials || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser?.full_name}</p>
              <p className="text-[11px] text-slate-400 capitalize">{currentUser?.role}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            title="Keluar / Ganti Akun"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
