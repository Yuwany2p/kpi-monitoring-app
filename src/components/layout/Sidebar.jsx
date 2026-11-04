import React, { useEffect, useRef, useState } from 'react';
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
  Users,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_LABELS, BADGE_REFRESH_EVENT } from '../../lib/constants';
import { countPendingValidation, countReportsToReview } from '../../services/supabaseService';

const NAV_ITEMS = {
  [ROLES.STAF]: [
    { name: 'Dashboard saya', to: '/', icon: LayoutGrid },
    { name: 'Input capaian', to: '/input-capaian', icon: PencilLine },
    { name: 'Riwayat pengajuan', to: '/riwayat-pengajuan', icon: History },
    { name: 'Tindak lanjut', to: '/tindak-lanjut-staf', icon: ListChecks },
  ],
  [ROLES.MANAJEMEN]: [
    { name: 'Dashboard', to: '/', icon: LayoutGrid },
    { name: 'Karyawan & departemen', to: '/karyawan', icon: Users },
    { name: 'Kelola KPI & target', to: '/kelola-kpi', icon: SlidersHorizontal },
    { name: 'Review laporan', to: '/review-laporan', icon: FileText, badgeKey: 'reports', badgeLabel: 'laporan menunggu review' },
  ],
  [ROLES.SUPERVISOR]: [
    { name: 'Dashboard', to: '/', icon: LayoutGrid },
    { name: 'Karyawan & departemen', to: '/karyawan', icon: Users },
    { name: 'Kelola KPI & target', to: '/kelola-kpi', icon: SlidersHorizontal },
    { name: 'Validasi data', to: '/validasi', icon: CircleCheck, badgeKey: 'pending', badgeLabel: 'data menunggu validasi' },
    { name: 'Analisis & tindak lanjut', to: '/analisis-tindak-lanjut', icon: TrendingUp },
    { name: 'Laporan KPI', to: '/laporan-kpi', icon: FileText },
  ],
};

export const Sidebar = ({ open, onClose }) => {
  const { currentUser, role, logout } = useAuth();
  const location = useLocation();
  const [badges, setBadges] = useState({});
  const closeRef = useRef(null);

  // Naikkan angka ini untuk memuat ulang badge (dipicu event BADGE_REFRESH_EVENT)
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const onRefresh = () => setRefreshKey((k) => k + 1);
    window.addEventListener(BADGE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(BADGE_REFRESH_EVENT, onRefresh);
  }, []);

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
  }, [role, location.pathname, refreshKey]);

  // Drawer (layar kecil): Esc menutup, fokus pindah ke tombol tutup
  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const navItems = NAV_ITEMS[role] || [];

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        aria-label="Navigasi"
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-astra-navy text-slate-300 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-xl' : '-translate-x-full max-lg:invisible'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-astra-600 text-white">
              <ChartColumn className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold text-white">KPI Monitor</span>
              <span className="block text-xs text-slate-400">Pelaporan ke manajemen</span>
            </span>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu utama">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const badge = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-white ${
                        isActive
                          ? 'bg-white/10 font-medium text-white before:absolute before:inset-y-1.5 before:-left-3 before:w-[3px] before:rounded-r before:bg-astra-400'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden="true" />
                    <span className="flex-1">{item.name}</span>
                    {badge > 0 && (
                      <span className="rounded bg-white px-1.5 text-xs font-semibold tabular-nums text-astra-900">
                        {badge}
                        <span className="sr-only"> {item.badgeLabel}</span>
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              {currentUser?.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{currentUser?.full_name}</p>
              <p className="truncate text-xs text-slate-400">{ROLE_LABELS[role]}</p>
            </div>
            <button
              onClick={logout}
              title="Keluar"
              aria-label="Keluar"
              className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
