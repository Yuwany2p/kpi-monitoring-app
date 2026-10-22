import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { STATUS_TINDAKAN } from '../../lib/constants';

export const FormAnalisisMasalahModal = ({
  isOpen,
  onClose,
  onSave,
  realisasiItem,
  tindakanToEdit,
  karyawanList = [],
}) => {
  const [formData, setFormData] = useState({
    id_realisasi_kpi: '',
    masalah: '',
    akar_penyebab: '',
    tindakan_perbaikan: '',
    id_pic_tindakan: '',
    tenggat_waktu: '',
    status: 'Open',
    hasil_evaluasi: '',
  });

  useEffect(() => {
    if (tindakanToEdit) {
      setFormData({
        id: tindakanToEdit.id,
        id_realisasi_kpi: tindakanToEdit.id_realisasi_kpi,
        masalah: tindakanToEdit.masalah || '',
        akar_penyebab: tindakanToEdit.akar_penyebab || '',
        tindakan_perbaikan: tindakanToEdit.tindakan_perbaikan || '',
        id_pic_tindakan: tindakanToEdit.id_pic_tindakan || (karyawanList[0]?.id || ''),
        tenggat_waktu: tindakanToEdit.tenggat_waktu || '',
        status: tindakanToEdit.status || 'Open',
        hasil_evaluasi: tindakanToEdit.hasil_evaluasi || '',
      });
    } else if (realisasiItem) {
      const kpiName = realisasiItem.kpi?.nama_kpi || realisasiItem.nama_kpi || 'KPI Terkait';
      const gap = Number(realisasiItem.target_periode) - Number(realisasiItem.aktual);
      setFormData({
        id_realisasi_kpi: realisasiItem.id,
        masalah: `Deviasi Capaian ${kpiName}: Target ${realisasiItem.target_periode}, Aktual ${realisasiItem.aktual} (Gap deviasi: ${gap.toFixed(1)}, Capaian: ${realisasiItem.persen_capaian}%).`,
        akar_penyebab: '',
        tindakan_perbaikan: '',
        id_pic_tindakan: realisasiItem.kpi?.id_pic || (karyawanList[0]?.id || ''),
        tenggat_waktu: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Open',
        hasil_evaluasi: '',
      });
    }
  }, [tindakanToEdit, realisasiItem, isOpen, karyawanList]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tindakanToEdit ? 'Edit Analisis & Rencana Tindakan' : 'Analisis Masalah & Tindakan Korektif (CAPA)'}
      subtitle="Kaitan Materi: Problem Solving Kinerja Tim, Analisis Akar Penyebab & Tindakan Supervisi"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            1. Identifikasi Masalah (Problem Statement)
          </label>
          <textarea
            required
            rows={2}
            value={formData.masalah}
            onChange={(e) => setFormData({ ...formData, masalah: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Deskripsikan gap antara target supervisi dengan kenyataan di lapangan..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            2. Analisis Akar Penyebab Masalah (Root Cause / 5-Why Analysis)
          </label>
          <textarea
            required
            rows={3}
            value={formData.akar_penyebab}
            onChange={(e) => setFormData({ ...formData, akar_penyebab: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Contoh: Mengapa mesin reject? Sensor aus. Mengapa tidak diganti? Jadwal servis terlewat..."
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Gunakan pendekatan supervisi: Man (Manusia), Machine (Mesin), Method (Metode SOP), Material, Environment.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            3. Rencana Tindakan Perbaikan (Corrective Action Plan)
          </label>
          <textarea
            required
            rows={3}
            value={formData.tindakan_perbaikan}
            onChange={(e) => setFormData({ ...formData, tindakan_perbaikan: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Langkah konkret yang harus dieksekusi tim untuk mengatasi akar penyebab..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">PIC Penanggung Jawab</label>
            <select
              value={formData.id_pic_tindakan}
              onChange={(e) => setFormData({ ...formData, id_pic_tindakan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {karyawanList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nama_lengkap}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tenggat Waktu (Due Date)</label>
            <input
              type="date"
              required
              value={formData.tenggat_waktu}
              onChange={(e) => setFormData({ ...formData, tenggat_waktu: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Progres</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {STATUS_TINDAKAN.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            4. Hasil Evaluasi Efektivitas (Oleh Supervisor)
          </label>
          <input
            type="text"
            value={formData.hasil_evaluasi}
            onChange={(e) => setFormData({ ...formData, hasil_evaluasi: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Catatan verifikasi efektivitas setelah tindakan perbaikan dieksekusi..."
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary">
            Simpan Analisis & Tindakan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
