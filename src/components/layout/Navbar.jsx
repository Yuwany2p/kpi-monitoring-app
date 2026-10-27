import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, Menu } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../lib/constants';

const PAGE_TITLES = {
  '/kelola-kpi': 'Kelola KPI & Target',
  '/validasi': 'Validasi Data Capaian',
  '/analisis-tindak-lanjut': 'Analisis & Tindak Lanjut',
  '/laporan-kpi': 'Laporan KPI ke Manajemen',
  '/review-laporan': 'Review Laporan KPI',
  '/input-capaian': 'Input Capaian KPI',
  '/riwayat-pengajuan': 'Riwayat Pengajuan',
  '/tindak-lanjut-staf': 'Tindak Lanjut',
};

// Halaman yang isinya tidak bergantung pada pilihan periode
const NO_PERIOD_FILTER = ['/riwayat-pengajuan', '/tindak-lanjut-staf', '/review-laporan'];

const Select = ({ label, value, onChange, children }) => (
  <label className="relative block">
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={onChange}
      className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 hover:border-slate-400 focus:border-astra-600 focus:outline-none focus:ring-2 focus:ring-astra-600/20 cursor-pointer"
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  </label>
);

export const Navbar = ({ onOpenMenu }) => {
  const location = useLocation();
  const { periods, selectedPeriodId, setSelectedPeriodId, teams, selectedTeamId, setSelectedTeamId } = useFilter();
  const { role, currentUser } = useAuth();

  const title =
    PAGE_TITLES[location.pathname] || (role === ROLES.STAF ? 'Dashboard Capaian Saya' : 'Dashboard KPI Tim');
  const crumb = location.pathname === '/' ? 'Dashboard' : title;
  const showPeriod = !NO_PERIOD_FILTER.includes(location.pathname);

  return (
    <header className="no-print border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm text-slate-500">Beranda / {crumb}</p>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showPeriod && (
            <Select label="Periode" value={selectedPeriodId || ''} onChange={(e) => setSelectedPeriodId(e.target.value)}>
              {periods.length === 0 && <option value="">Belum ada periode</option>}
              {[...periods].reverse().map((p) => (
                <option key={p.id} value={p.id}>
                  Periode: {p.name}
                  {p.status === 'closed' ? ' (ditutup)' : ''}
                </option>
              ))}
            </Select>
          )}

          {role === ROLES.MANAJEMEN && showPeriod && (
            <Select label="Tim" value={selectedTeamId || ''} onChange={(e) => setSelectedTeamId(e.target.value || null)}>
              <option value="">Semua tim</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}

          {role === ROLES.SUPERVISOR && currentUser?.team_name && (
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              {currentUser.team_name}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
