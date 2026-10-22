import React from 'react';
import { Table } from '../common/Table';
import { Badge } from '../common/Badge';
import { Edit2, Trash2 } from 'lucide-react';
import { PERSPEKTIF_COLORS } from '../../lib/constants';

export const KpiTable = ({ kpiList = [], onEdit, onDelete, departemenList = [], karyawanList = [] }) => {
  const headers = [
    'Kode & Nama KPI',
    'Perspektif AMS',
    'Departemen',
    'PIC Supervisi',
    'Target Tahunan',
    'Bobot',
    'Aksi',
  ];

  const getDepName = (item) => {
    if (item.departemen?.nama_departemen) return item.departemen.nama_departemen;
    const dep = departemenList.find((d) => d.id === item.id_departemen);
    return dep ? dep.nama_departemen : '-';
  };

  const getPicName = (item) => {
    if (item.karyawan?.nama_lengkap) return item.karyawan.nama_lengkap;
    const emp = karyawanList.find((e) => e.id === item.id_pic);
    return emp ? emp.nama_lengkap : '-';
  };

  return (
    <Table headers={headers} emptyMessage="Belum ada data KPI yang ditambahkan.">
      {kpiList.map((item) => {
        const pColor = PERSPEKTIF_COLORS[item.perspektif] || {
          badge: 'bg-slate-100 text-slate-700',
        };

        return (
          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
            <td className="px-5 py-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 block">
                  {item.kode_kpi}
                </span>
                <span className="font-semibold text-slate-800 text-sm">{item.nama_kpi}</span>
                {item.deskripsi && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.deskripsi}</p>
                )}
              </div>
            </td>

            <td className="px-5 py-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pColor.badge}`}>
                {item.perspektif}
              </span>
            </td>

            <td className="px-5 py-4 text-xs font-medium text-slate-700">{getDepName(item)}</td>

            <td className="px-5 py-4 text-xs text-slate-600">{getPicName(item)}</td>

            <td className="px-5 py-4">
              <span className="font-bold text-slate-900 text-sm">{item.target_tahunan}</span>{' '}
              <span className="text-xs text-slate-500 font-medium">{item.satuan}</span>
            </td>

            <td className="px-5 py-4 text-xs font-bold text-slate-700">{item.bobot_kpi || 0}%</td>

            <td className="px-5 py-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(item)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit KPI"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Hapus KPI"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </Table>
  );
};
