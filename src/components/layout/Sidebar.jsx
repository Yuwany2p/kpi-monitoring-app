import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  SlidersHorizontal,
  CircleCheck,
  TrendingUp,
  FileText,
  PencilLine,
  History,
  ListChecks,
  ChartColumn,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_LABELS } from '../../lib/constants';
import { countPendingValidation, countReportsToReview } from '../../services/supabaseService';

const NAV_ITEMS = {
  [ROLES.STAF]: [
    { name: 'Dashboard Saya', to: '/', icon: LayoutGrid },
    { name: 'Input Capaian', to: '/input-capaian', icon: PencilLine },
    { name: 'Riwayat Pengajuan', to: '/riwayat-pengajuan', icon: History },
    { name: 'Tindak Lanjut', to: '/tindak-lanjut-staf', icon: ListChecks },
  ],
  [ROLES.MANAJEMEN]: [
    { name: 'Dashboard', to: '/', icon: LayoutGrid },
    { name: 'Kelola KPI & Target', to: '/kelola-kpi', icon: SlidersHorizontal },
    { name: 'Review Laporan', to: '/review-laporan', icon: FileText, badgeKey: 'reports' },
  ],
  [ROLES.SUPERVISOR]: [
    { name: 'Dashboard', to: '/', icon: LayoutGrid },
    { name: 'Kelola KPI & Target', to: '/kelola-kpi', icon: SlidersHorizontal },
    { name: 'Validasi Data', to: '/validasi', icon: CircleCheck, badgeKey: 'pending' },
    { name: 'Analisis & Tindak Lanjut', to: '/analisis-tindak-lanjut', icon: TrendingUp },
    { name: 'Laporan KPI', to: '/laporan-kpi', icon: FileText },
  ],
};

export const Sidebar = ({ open, onClose }) => {
  const { currentUser, role, logout } = useAuth();
  const location = useLocation();
  const [badges, setBadges] = useState({});

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
        // badge hanya informasi tambahan
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, location.pathname]);

  const navItems = NAV_ITEMS[role] || [];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-astra-navy text-slate-300 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-astra-600 text-white">
              <ChartColumn className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-base font-bold text-white">KPI Monitor</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-white lg:hidden" aria-label="Tutup menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3" aria-label="Menu utama">
          <p className="mb-2 px-3 text-xs font-medium text-slate-400">Menu</p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const badge = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.name}</span>
                    {badge > 0 && (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900">
                        {badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-astra-600 text-xs font-bold text-white">
              {currentUser?.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{currentUser?.full_name}</p>
              <p className="truncate text-xs text-slate-400">{ROLE_LABELS[role]}</p>
            </div>
            <button
              onClick={logout}
              title="Keluar"
              aria-label="Keluar"
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
