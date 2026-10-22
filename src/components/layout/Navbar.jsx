import React from 'react';
import { Calendar, Building2, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { useDepartemen } from '../../hooks/useDepartemen';
import { BULAN_LIST } from '../../lib/constants';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

export const Navbar = () => {
  const {
    selectedTahun,
    setSelectedTahun,
    selectedBulan,
    setSelectedBulan,
    selectedDepartemen,
    setSelectedDepartemen,
  } = useFilter();

  const { departemenList } = useDepartemen();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Supabase Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
            title={
              isSupabaseConfigured
                ? 'Terhubung langsung ke Supabase'
                : 'Mode Simulasi Aktif (.env.local belum diisi kredensial Supabase)'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSupabaseConfigured ? 'Supabase Live' : 'Demo Mode (Local)'}</span>
            {isSupabaseConfigured ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            )}
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">| UAS Teknik Supervisi</span>
        </div>

        {/* Global Filter Bar: Periode & Departemen */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Departemen Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDepartemen}
              onChange={(e) => setSelectedDepartemen(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Departemen</option>
              {departemenList.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.nama_departemen}
                </option>
              ))}
            </select>
          </div>

          {/* Bulan Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(Number(e.target.value))}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              {BULAN_LIST.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun Filter */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
