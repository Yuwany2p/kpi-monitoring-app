import React from 'react';
import { Table } from '../common/Table';
import { Badge } from '../common/Badge';
import { formatDate } from '../../lib/formatters';
import { CheckCircle2, Clock, HelpCircle, AlertCircle } from 'lucide-react';

export const TindakanTimeline = ({ tindakanList = [], onEdit, onUpdateStatus, karyawanList = [] }) => {
  const headers = [
    'Masalah Teridentifikasi',
    'Akar Penyebab (Root Cause)',
    'Rencana Tindakan Korektif',
    'PIC & Tenggat',
    'Status Tindakan',
    'Hasil Evaluasi',
    'Aksi',
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Closed':
      case 'Resolved':
        return <Badge variant="success">Selesai ({status})</Badge>;
      case 'In Progress':
        return <Badge variant="warning">Sedang Berjalan</Badge>;
      default:
        return <Badge variant="danger">Open (Baru)</Badge>;
    }
  };

  const getPicName = (item) => {
    if (item.karyawan?.nama_lengkap) return item.karyawan.nama_lengkap;
    const emp = karyawanList.find((e) => e.id === item.id_pic_tindakan);
    return emp ? emp.nama_lengkap : '-';
  };

  return (
    <Table headers={headers} emptyMessage="Belum ada catatan analisis masalah & tindakan perbaikan.">
      {tindakanList.map((item) => (
        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors align-top">
          <td className="px-5 py-4 max-w-xs">
            <span className="font-semibold text-slate-800 text-xs block leading-relaxed">
              {item.masalah}
            </span>
          </td>

          <td className="px-5 py-4 max-w-xs">
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed font-mono text-[11px]">
              {item.akar_penyebab}
            </p>
          </td>

          <td className="px-5 py-4 max-w-xs">
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {item.tindakan_perbaikan}
            </p>
          </td>

          <td className="px-5 py-4 whitespace-nowrap">
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">{getPicName(item)}</span>
              <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> Due: {formatDate(item.tenggat_waktu)}
              </span>
            </div>
          </td>

          <td className="px-5 py-4 whitespace-nowrap">
            {getStatusBadge(item.status)}
            <div className="mt-2">
              <select
                value={item.status}
                onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </td>

          <td className="px-5 py-4 max-w-xs">
            <p className="text-xs text-slate-500 italic">
              {item.hasil_evaluasi || 'Belum dievaluasi oleh supervisor'}
            </p>
          </td>

          <td className="px-5 py-4 whitespace-nowrap">
            <button
              onClick={() => onEdit(item)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Ubah Detail
            </button>
          </td>
        </tr>
      ))}
    </Table>
  );
};
