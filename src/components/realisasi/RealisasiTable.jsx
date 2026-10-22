import React from 'react';
import { Table } from '../common/Table';
import { Edit3, AlertCircle } from 'lucide-react';
import { formatNumber, getKpiStatus } from '../../lib/formatters';
import { STATUS_KPI_COLORS, PERSPEKTIF_COLORS } from '../../lib/constants';

export const RealisasiTable = ({ realisasiList = [], onEdit, onAddAction }) => {
  const headers = [
    'Kode & Nama KPI',
    'Perspektif',
    'Target Periode',
    'Aktual Lapangan',
    '% Capaian',
    'Status Supervisi',
    'Aksi Tindakan',
  ];

  return (
    <Table headers={headers} emptyMessage="Belum ada data realisasi pada periode ini.">
      {realisasiList.map((item) => {
        const kpi = item.kpi || {};
        const persen = Number(item.persen_capaian || 0);
        const statusKey = getKpiStatus(persen);
        const statusConfig = STATUS_KPI_COLORS[statusKey];
        const pColor = PERSPEKTIF_COLORS[kpi.perspektif] || { badge: 'bg-slate-100 text-slate-700' };

        return (
          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
            <td className="px-5 py-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 block">
                  {kpi.kode_kpi || '-'}
                </span>
                <span className="font-semibold text-slate-800 text-sm">{kpi.nama_kpi || '-'}</span>
                {item.catatan && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 italic">
                    "{item.catatan}"
                  </p>
                )}
              </div>
            </td>

            <td className="px-5 py-4">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pColor.badge}`}>
                {kpi.perspektif || '-'}
              </span>
            </td>

            <td className="px-5 py-4 text-xs font-medium text-slate-700">
              {formatNumber(item.target_periode)} {kpi.satuan}
            </td>

            <td className="px-5 py-4 text-xs font-bold text-slate-900">
              {formatNumber(item.aktual)} {kpi.satuan}
            </td>

            <td className="px-5 py-4 min-w-[140px]">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span
                  className={
                    persen >= 100
                      ? 'text-emerald-600'
                      : persen >= 80
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }
                >
                  {persen}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    persen >= 100
                      ? 'bg-emerald-500'
                      : persen >= 80
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(persen, 100)}%` }}
                />
              </div>
            </td>

            <td className="px-5 py-4">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
            </td>

            <td className="px-5 py-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(item)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit Angka Realisasi"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {persen < 100 && (
                  <button
                    onClick={() => onAddAction(item)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                    title="Buat Analisis Masalah & Tindakan Perbaikan"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>CAPA</span>
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </Table>
  );
};
