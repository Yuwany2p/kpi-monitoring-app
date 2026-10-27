import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, Database } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../lib/constants';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

export const Navbar = () => {
  const location = useLocation();
  const { selectedPeriod, setSelectedPeriod, selectedTeam, setSelectedTeam, periods, teams } =
    useFilter();
  const { role } = useAuth();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/kelola-kpi':
        return { breadcrumb: 'Beranda / Kelola KPI & Target', title: 'Kelola KPI & Target' };
      case '/validasi':
        return { breadcrumb: 'Beranda / Validasi Data', title: 'Validasi Data Capaian' };
      case '/analisis-tindak-lanjut':
        return { breadcrumb: 'Beranda / Analisis & Tindak Lanjut', title: 'Analisis & Tindak Lanjut' };
      case '/laporan-kpi':
        return { breadcrumb: 'Beranda / Laporan KPI', title: 'Laporan KPI ke Manajemen' };
      case '/review-laporan':
        return { breadcrumb: 'Beranda / Review Laporan', title: 'Review Laporan KPI' };
      case '/input-capaian':
        return { breadcrumb: 'Beranda / Input Capaian', title: 'Input Capaian KPI' };
      case '/riwayat-pengajuan':
        return { breadcrumb: 'Beranda / Riwayat Pengajuan', title: 'Riwayat Pengajuan Capaian' };
      case '/tindak-lanjut-staf':
        return { breadcrumb: 'Beranda / Tindak Lanjut', title: 'Tindak Lanjut & Action Plan' };
      default:
        return {
          breadcrumb: 'Beranda / Dashboard',
          title: role === ROLES.STAF ? 'Dashboard Capaian Saya' : 'Dashboard KPI Tim',
        };
    }
  };

  const { breadcrumb, title } = getPageInfo();

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-5 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Breadcrumb */}
        <div>
          <p className="text-xs font-medium text-slate-400">{breadcrumb}</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">{title}</h1>
        </div>

        {/* Filters & Status */}
        <div className="flex items-center gap-3">
          {/* Supabase Connection Status Badge */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={
              isSupabaseConfigured
                ? 'Terhubung langsung ke database Supabase'
                : 'Belum terhubung ke Supabase URL/Key, menggunakan data mock lokal'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{isSupabaseConfigured ? 'Supabase: Live DB' : 'Mode: Mock Demo'}</span>
          </div>

          {/* Period Selector */}
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-2 pr-9 text-xs font-semibold text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-astra-600 cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.name}>
                  Periode: {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Team Selector (For Supervisor & Manajemen) */}
          {role !== ROLES.STAF && (
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="appearance-none bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-2 pr-9 text-xs font-semibold text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-astra-600 cursor-pointer"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
