import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { getMonthName, getKpiStatus } from '../../lib/formatters';
import { STATUS_KPI_COLORS } from '../../lib/constants';

export const InputRealisasiModal = ({ isOpen, onClose, onSave, kpiList = [], initialData, tahun, bulan }) => {
  const [formData, setFormData] = useState({
    id_kpi: '',
    tahun: tahun || 2026,
    bulan: bulan || 10,
    target_periode: '',
    aktual: '',
    catatan: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        id_kpi: initialData.id_kpi || (kpiList[0]?.id || ''),
        tahun: initialData.tahun || tahun,
        bulan: initialData.bulan || bulan,
        target_periode: initialData.target_periode || '',
        aktual: initialData.aktual ?? '',
        catatan: initialData.catatan || '',
      });
    } else {
      setFormData({
        id_kpi: kpiList[0]?.id || '',
        tahun: tahun || 2026,
        bulan: bulan || 10,
        target_periode: kpiList[0]?.target_tahunan ? (kpiList[0].target_tahunan / 12).toFixed(1) : '100',
        aktual: '',
        catatan: '',
      });
    }
  }, [initialData, isOpen, kpiList, tahun, bulan]);

  const selectedKpi = kpiList.find((k) => k.id === formData.id_kpi);

  const calcPersen = () => {
    const t = Number(formData.target_periode);
    const a = Number(formData.aktual);
    if (!t || isNaN(t) || isNaN(a)) return 0;
    return Number(((a / t) * 100).toFixed(2));
  };

  const persen = calcPersen();
  const statusKey = getKpiStatus(persen);
  const statusInfo = STATUS_KPI_COLORS[statusKey];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      target_periode: Number(formData.target_periode),
      aktual: Number(formData.aktual),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Input Capaian Realisasi KPI"
      subtitle={`Periode Supervisi: ${getMonthName(formData.bulan)} ${formData.tahun}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih KPI</label>
          <select
            value={formData.id_kpi}
            onChange={(e) => {
              const kId = e.target.value;
              const found = kpiList.find((k) => k.id === kId);
              setFormData({
                ...formData,
                id_kpi: kId,
                target_periode: found ? (found.target_tahunan / 12).toFixed(1) : formData.target_periode,
              });
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {kpiList.map((kpi) => (
              <option key={kpi.id} value={kpi.id}>
                [{kpi.kode_kpi}] {kpi.nama_kpi} ({kpi.perspektif})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Periode ({selectedKpi?.satuan || 'Satuan'})
            </label>
            <input
              type="number"
              step="any"
              required
              value={formData.target_periode}
              onChange={(e) => setFormData({ ...formData, target_periode: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Realisasi Aktual ({selectedKpi?.satuan || 'Satuan'})
            </label>
            <input
              type="number"
              step="any"
              required
              value={formData.aktual}
              onChange={(e) => setFormData({ ...formData, aktual: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Masukkan angka aktual"
            />
          </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Kalkulasi Capaian Otomatis:</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{persen}%</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.badge}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
              {statusInfo.label}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              {persen >= 100 ? 'Memenuhi Standar' : persen >= 80 ? 'Evaluasi Standar' : 'Perlu Tindakan Korektif'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Supervisi / Keterangan Lapangan
          </label>
          <textarea
            rows={2}
            value={formData.catatan}
            onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Penjelasan deviasi atau faktor pendukung..."
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary">
            Simpan Realisasi
          </Button>
        </div>
      </form>
    </Modal>
  );
};
