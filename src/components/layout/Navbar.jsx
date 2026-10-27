import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../lib/constants';

const PAGE_INFO = {
  '/kelola-kpi': { breadcrumb: 'Beranda / Kelola KPI & Target', title: 'Kelola KPI & Target' },
  '/validasi': { breadcrumb: 'Beranda / Validasi Data', title: 'Validasi Data Capaian' },
  '/analisis-tindak-lanjut': { breadcrumb: 'Beranda / Analisis & Tindak Lanjut', title: 'Analisis & Tindak Lanjut' },
  '/laporan-kpi': { breadcrumb: 'Beranda / Laporan KPI', title: 'Laporan KPI ke Manajemen' },
  '/review-laporan': { breadcrumb: 'Beranda / Review Laporan', title: 'Review Laporan KPI' },
  '/input-capaian': { breadcrumb: 'Beranda / Input Capaian', title: 'Input Capaian KPI' },
  '/riwayat-pengajuan': { breadcrumb: 'Beranda / Riwayat Pengajuan', title: 'Riwayat Pengajuan Capaian' },
  '/tindak-lanjut-staf': { breadcrumb: 'Beranda / Tindak Lanjut', title: 'Tindak Lanjut & Action Plan' },
};

// Halaman yang tidak bergantung pada filter periode
const NO_PERIOD_FILTER = ['/riwayat-pengajuan', '/tindak-lanjut-staf', '/review-laporan'];

const selectClass =
  'appearance-none bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-2 pr-9 text-xs font-semibold text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-astra-600 cursor-pointer';

export const Navbar = () => {
  const location = useLocation();
  const { periods, selectedPeriodId, setSelectedPeriodId, selectedPeriod, teams, selectedTeamId, setSelectedTeamId } =
    useFilter();
  const { role, currentUser } = useAuth();

  const { breadcrumb, title } = PAGE_INFO[location.pathname] || {
    breadcrumb: 'Beranda / Dashboard',
    title: role === ROLES.STAF ? 'Dashboard Capaian Saya' : 'Dashboard KPI Tim',
  };
  const showPeriod = !NO_PERIOD_FILTER.includes(location.pathname);

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-5 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">{breadcrumb}</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {showPeriod && selectedPeriod && (
            <span
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${
                selectedPeriod.status === 'open'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedPeriod.status === 'open' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              {selectedPeriod.status === 'open' ? 'Periode berjalan' : 'Periode ditutup'}
            </span>
          )}

          {showPeriod && (
            <div className="relative">
              <select
                value={selectedPeriodId || ''}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className={selectClass}
              >
                {periods.length === 0 && <option value="">Belum ada periode</option>}
                {[...periods].reverse().map((p) => (
                  <option key={p.id} value={p.id}>
                    Periode: {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {role === ROLES.MANAJEMEN && showPeriod ? (
            <div className="relative">
              <select
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(e.target.value || null)}
                className={selectClass}
              >
                <option value="">Semua tim</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            role === ROLES.SUPERVISOR &&
            currentUser?.team_name && (
              <span className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                {currentUser.team_name}
              </span>
            )
          )}
        </div>
      </div>
    </header>
  );
};
