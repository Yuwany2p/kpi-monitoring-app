import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_LABELS } from '../../lib/constants';
import { countPendingValidation, countReportsToReview } from '../../services/supabaseService';

const NAV_ITEMS = {
  [ROLES.STAF]: [
    { name: 'Dashboard Saya', to: '/', icon: LayoutGrid },
    { name: 'Input Capaian', to: '/input-capaian', icon: Edit3 },
    { name: 'Riwayat Pengajuan', to: '/riwayat-pengajuan', icon: History },
    { name: 'Tindak Lanjut', to: '/tindak-lanjut-staf', icon: ListTodo },
  ],
  [ROLES.MANAJEMEN]: [
    { name: 'Dashboard', to: '/', icon: LayoutGrid },
    { name: 'Kelola KPI & Target', to: '/kelola-kpi', icon: Sliders },
    { name: 'Review Laporan', to: '/review-laporan', icon: FileText, badgeKey: 'reports' },
  ],
  [ROLES.SUPERVISOR]: [
    { name: 'Dashboard', to: '/', icon: LayoutGrid },
    { name: 'Kelola KPI & Target', to: '/kelola-kpi', icon: Sliders },
    { name: 'Validasi Data', to: '/validasi', icon: CheckCircle2, badgeKey: 'pending' },
    { name: 'Analisis & Tindak Lanjut', to: '/analisis-tindak-lanjut', icon: TrendingUp },
    { name: 'Laporan KPI', to: '/laporan-kpi', icon: FileText },
  ],
};

export const Sidebar = () => {
  const { currentUser, role, logout } = useAuth();
  const location = useLocation();
  const [badges, setBadges] = useState({});

  // Hitung ulang badge setiap pindah halaman (data bisa berubah setelah aksi)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (role === ROLES.SUPERVISOR) {
          const pending = await countPendingValidation();
          if (!cancelled) setBadges({ pending });
        } else if (role === ROLES.MANAJEMEN) {
          const reports = await countReportsToReview();
          if (!cancelled) setBadges({ reports });
        }
      } catch {
        // badge bersifat informatif, abaikan jika gagal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, location.pathname]);

  const navItems = NAV_ITEMS[role] || [];

  return (
    <aside className="w-64 bg-astra-navy text-slate-300 min-h-screen flex flex-col justify-between shrink-0 no-print select-none">
      <div>
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-astra-800 flex items-center justify-center text-white shadow-md">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">KPI Monitor</span>
        </div>

        <div className="px-3 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2.5">
            MENU
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const badge = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
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
                  {badge > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-900">
                      {badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-800/80">
        <div className="p-2.5 rounded-xl bg-slate-800/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-astra-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser?.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser?.full_name}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {ROLE_LABELS[role]}
                {currentUser?.team_name ? ` · ${currentUser.team_name}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Keluar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
