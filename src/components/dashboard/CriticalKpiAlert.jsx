import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CriticalKpiAlert = ({ criticalKpis = [], onInitiateAction }) => {
  if (criticalKpis.length === 0) {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
          ✓
        </div>
        <div>
          <h4 className="font-bold text-emerald-900 text-sm">Semua KPI Berada di Jalur Aman</h4>
          <p className="text-xs text-emerald-700 mt-0.5">
            Tidak ada indikator kinerja di bawah target kritis (&lt;80%) pada periode yang dipilih.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-rose-900 text-sm">
              Perhatian Supervisi: {criticalKpis.length} KPI Kritis Teridentifikasi (&lt;80%)
            </h4>
            <p className="text-xs text-rose-700">
              Memerlukan analisis akar masalah dan tindakan perbaikan segera.
            </p>
          </div>
        </div>
        <Link
          to="/analisis-masalah"
          className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 shrink-0"
        >
          Lihat Semua CAPA <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {criticalKpis.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-rose-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                  {item.kpi?.kode_kpi || item.kode_kpi}
                </span>
                <span className="text-xs font-bold text-slate-800 line-clamp-1">
                  {item.kpi?.nama_kpi || item.nama_kpi}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Target: {item.target_periode} | Aktual: {item.aktual} | Capaian:{' '}
                <strong className="text-rose-600">{item.persen_capaian}%</strong>
              </p>
            </div>
            <button
              onClick={() => onInitiateAction && onInitiateAction(item)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shrink-0"
            >
              + Analisis Masalah
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
