import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../lib/constants';

const PAGE_TITLES = {
  '/kelola-kpi': 'Kelola KPI & target',
  '/karyawan': 'Karyawan & departemen',
  '/validasi': 'Validasi data capaian',
  '/analisis-tindak-lanjut': 'Analisis & tindak lanjut',
  '/laporan-kpi': 'Laporan KPI ke manajemen',
  '/review-laporan': 'Review laporan KPI',
  '/input-capaian': 'Input capaian KPI',
  '/riwayat-pengajuan': 'Riwayat pengajuan',
  '/tindak-lanjut-staf': 'Tindak lanjut',
};

// Halaman yang isinya tidak bergantung pada pilihan periode
const NO_PERIOD_FILTER = ['/riwayat-pengajuan', '/tindak-lanjut-staf', '/review-laporan', '/karyawan'];

const FilterSelect = ({ id, label, value, onChange, children }) => (
  <div className="flex min-w-0 flex-1 flex-col sm:flex-none">
    <label htmlFor={id} className="mb-1 text-xs font-medium text-slate-500">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="h-9 w-full cursor-pointer sm:min-w-[9rem] appearance-none rounded-md border border-control bg-white pl-3 pr-9 text-sm font-medium text-slate-800 hover:border-slate-400 focus:border-astra-600 focus:outline-none focus:ring-2 focus:ring-astra-600/20"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
  </div>
);

export const Navbar = ({ onOpenMenu }) => {
  const location = useLocation();
  const { periods, selectedPeriodId, setSelectedPeriodId, teams, selectedTeamId, setSelectedTeamId } = useFilter();
  const { role, currentUser } = useAuth();

  const isHome = location.pathname === '/';
  const title = PAGE_TITLES[location.pathname] || (role === ROLES.STAF ? 'Dashboard capaian saya' : 'Dashboard KPI tim');
  const showPeriod = !NO_PERIOD_FILTER.includes(location.pathname);

  return (
    <header className="no-print border-b border-slate-200 bg-white px-4 pb-4 pt-3 sm:px-6 lg:px-8 lg:pt-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={onOpenMenu} className="icon-btn -ml-1.5 h-9 w-9 lg:hidden" aria-label="Buka menu">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1 text-[13px] text-slate-500">
                <li>{isHome ? 'Beranda' : <Link to="/" className="hover:text-slate-900 hover:underline">Beranda</Link>}</li>
                {!isHome && (
                  <li className="flex min-w-0 items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    <span aria-current="page" className="truncate">
                      {title}
                    </span>
                  </li>
                )}
              </ol>
            </nav>
            <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight">{title}</h1>
          </div>
        </div>

        <div className="flex w-full items-end gap-3 sm:w-auto">
          {showPeriod && (
            <FilterSelect
              id="filter-periode"
              label="Periode"
              value={selectedPeriodId || ''}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
            >
              {periods.length === 0 && <option value="">Belum ada periode</option>}
              {[...periods].reverse().map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.status === 'closed' ? ' (ditutup)' : ''}
                </option>
              ))}
            </FilterSelect>
          )}

          {role === ROLES.MANAJEMEN && showPeriod && (
            <FilterSelect
              id="filter-tim"
              label="Tim"
              value={selectedTeamId || ''}
              onChange={(e) => setSelectedTeamId(e.target.value || null)}
            >
              <option value="">Semua tim</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </FilterSelect>
          )}

          {role === ROLES.SUPERVISOR && currentUser?.team_name && showPeriod && (
            <div className="flex min-w-0 flex-1 flex-col sm:flex-none">
              <span className="mb-1 text-xs font-medium text-slate-500">Tim</span>
              <span className="flex h-9 items-center truncate rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-700">
                {currentUser.team_name}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
