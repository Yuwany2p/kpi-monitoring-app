import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { PERSPEKTIF_AMS } from '../../lib/constants';

export const KpiFormModal = ({ isOpen, onClose, onSave, kpiToEdit, departemenList, karyawanList, kategoriList }) => {
  const [formData, setFormData] = useState({
    kode_kpi: '',
    nama_kpi: '',
    deskripsi: '',
    perspektif: 'Keuangan',
    id_departemen: '',
    id_pic: '',
    id_kategori_sasaran: '',
    target_tahunan: '',
    satuan: '%',
    bobot_kpi: '',
  });

  useEffect(() => {
    if (kpiToEdit) {
      setFormData({
        kode_kpi: kpiToEdit.kode_kpi || '',
        nama_kpi: kpiToEdit.nama_kpi || '',
        deskripsi: kpiToEdit.deskripsi || '',
        perspektif: kpiToEdit.perspektif || 'Keuangan',
        id_departemen: kpiToEdit.id_departemen || (departemenList[0]?.id || ''),
        id_pic: kpiToEdit.id_pic || (karyawanList[0]?.id || ''),
        id_kategori_sasaran: kpiToEdit.id_kategori_sasaran || (kategoriList[0]?.id || ''),
        target_tahunan: kpiToEdit.target_tahunan || '',
        satuan: kpiToEdit.satuan || '%',
        bobot_kpi: kpiToEdit.bobot_kpi || '',
      });
    } else {
      setFormData({
        kode_kpi: `KPI-${Date.now().toString().slice(-4)}`,
        nama_kpi: '',
        deskripsi: '',
        perspektif: 'Keuangan',
        id_departemen: departemenList[0]?.id || '',
        id_pic: karyawanList[0]?.id || '',
        id_kategori_sasaran: kategoriList[0]?.id || '',
        target_tahunan: '',
        satuan: '%',
        bobot_kpi: '25',
      });
    }
  }, [kpiToEdit, isOpen, departemenList, karyawanList, kategoriList]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      target_tahunan: Number(formData.target_tahunan),
      bobot_kpi: Number(formData.bobot_kpi),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={kpiToEdit ? 'Edit Indikator Kinerja (KPI)' : 'Tambah KPI Baru'}
      subtitle="Klasifikasikan KPI berdasarkan 4 Perspektif AMS & Kategori Sasaran"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kode KPI</label>
            <input
              type="text"
              required
              value={formData.kode_kpi}
              onChange={(e) => setFormData({ ...formData, kode_kpi: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Contoh: KPI-FIN-01"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Perspektif AMS</label>
            <select
              value={formData.perspektif}
              onChange={(e) => setFormData({ ...formData, perspektif: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {PERSPEKTIF_AMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nama KPI</label>
          <input
            type="text"
            required
            value={formData.nama_kpi}
            onChange={(e) => setFormData({ ...formData, nama_kpi: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Contoh: Efisiensi Biaya Operasional Produksi"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi / Indikator</label>
          <textarea
            rows={2}
            value={formData.deskripsi}
            onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Keterangan cara pengukuran KPI..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Departemen</label>
            <select
              value={formData.id_departemen}
              onChange={(e) => setFormData({ ...formData, id_departemen: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {departemenList.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.nama_departemen}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">PIC Penanggung Jawab</label>
            <select
              value={formData.id_pic}
              onChange={(e) => setFormData({ ...formData, id_pic: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {karyawanList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nama_lengkap} ({emp.jabatan})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Sasaran</label>
            <select
              value={formData.id_kategori_sasaran}
              onChange={(e) => setFormData({ ...formData, id_kategori_sasaran: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {kategoriList.map((kat) => (
                <option key={kat.id} value={kat.id}>
                  {kat.nama_kategori} (Bobot {kat.bobot_persen}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tahunan</label>
            <input
              type="number"
              step="any"
              required
              value={formData.target_tahunan}
              onChange={(e) => setFormData({ ...formData, target_tahunan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Contoh: 95"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan Pengukuran</label>
            <input
              type="text"
              required
              value={formData.satuan}
              onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="%, Hari, Rupiah, Skor, Dokumen"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bobot KPI (%)</label>
            <input
              type="number"
              step="any"
              required
              value={formData.bobot_kpi}
              onChange={(e) => setFormData({ ...formData, bobot_kpi: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Contoh: 25"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary">
            Simpan KPI
          </Button>
        </div>
      </form>
    </Modal>
  );
};
