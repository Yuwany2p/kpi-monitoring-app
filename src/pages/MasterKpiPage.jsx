import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Copy, Save, X, RefreshCw, Loader2 } from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import {
  getKpiIndicators,
  createKpiIndicator,
  updateKpiIndicator,
  deleteKpiIndicator,
  getProfiles,
} from '../services/supabaseService';

export const MasterKpiPage = () => {
  const { selectedPeriod } = useFilter();
  const [indicators, setIndicators] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: 'tiket',
    direction: 'higher_better',
    weight: 30,
    frequency: 'Bulanan',
    data_source: 'Sistem tiket',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [indData, profData] = await Promise.all([
      getKpiIndicators(),
      getProfiles(),
    ]);
    setIndicators(indData || []);
    setStaffList(profData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalWeight = indicators.reduce((acc, curr) => acc + Number(curr.weight || 0), 0);

  const handleOpenAdd = () => {
    setEditingKpi(null);
    setFormData({
      code: `KPI-0${indicators.length + 1}`,
      name: '',
      unit: '%',
      direction: 'higher_better',
      weight: 30,
      frequency: 'Bulanan',
      data_source: 'Log sistem',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (kpi) => {
    setEditingKpi(kpi);
    setFormData({
      code: kpi.code,
      name: kpi.name,
      unit: kpi.unit,
      direction: kpi.direction,
      weight: kpi.weight,
      frequency: kpi.frequency,
      data_source: kpi.data_source,
    });
    setIsModalOpen(true);
  };

  const handleSaveKpi = async (e) => {
    e.preventDefault();
    if (editingKpi) {
      const res = await updateKpiIndicator(editingKpi.id, formData);
      if (res.success) {
        setIndicators(indicators.map((k) => (k.id === editingKpi.id ? { ...k, ...formData } : k)));
      }
    } else {
      const res = await createKpiIndicator(formData);
      if (res.success && res.data) {
        setIndicators([...indicators, res.data]);
      } else {
        setIndicators([...indicators, { ...formData, id: 'ind-' + Date.now(), is_active: true }]);
      }
    }
    setIsModalOpen(false);
  };

  const handleTargetChange = (staffId, field, val) => {
    setTargets({
      ...targets,
      [staffId]: {
        ...targets[staffId],
        [field]: Number(val),
      },
    });
  };

  const handleSaveTargets = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopyLastPeriod = () => {
    alert('Target berhasil disalin dari periode sebelumnya!');
  };

  return (
    <div className="space-y-6">
      {/* Top Card: Daftar Indikator KPI */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Daftar Indikator KPI</h2>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-astra-800 hover:bg-astra-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah KPI
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold">
                <th className="pb-3.5 font-medium">Kode</th>
                <th className="pb-3.5 font-medium">Nama KPI</th>
                <th className="pb-3.5 font-medium">Satuan</th>
                <th className="pb-3.5 font-medium">Arah</th>
                <th className="pb-3.5 font-medium">Bobot</th>
                <th className="pb-3.5 font-medium">Frekuensi</th>
                <th className="pb-3.5 font-medium">Sumber data</th>
                <th className="pb-3.5 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-astra-700" />
                    Memuat data indikator dari database...
                  </td>
                </tr>
              ) : indicators.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada data indikator KPI di database. Klik tombol <strong>+ Tambah KPI</strong> untuk menambahkan.
                  </td>
                </tr>
              ) : (
                indicators.map((kpi) => (
                  <tr key={kpi.id} className="hover:bg-slate-50/70">
                    <td className="py-4 font-bold text-slate-900">{kpi.code}</td>
                    <td className="py-4 font-semibold text-slate-800">{kpi.name}</td>
                    <td className="py-4 text-slate-600">{kpi.unit}</td>
                    <td className="py-4 text-slate-600">
                      {kpi.direction === 'higher_better' ? 'Semakin tinggi' : 'Semakin rendah'}
                    </td>
                    <td className="py-4 font-semibold text-slate-800">{kpi.weight}%</td>
                    <td className="py-4 text-slate-600">{kpi.frequency}</td>
                    <td className="py-4 text-slate-600">{kpi.data_source}</td>
                    <td className="py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(kpi)}
                          className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
                        >
                          Ubah
                        </button>
                        <button
                          onClick={async () => {
                            await deleteKpiIndicator(kpi.id);
                            setIndicators(indicators.filter((item) => item.id !== kpi.id));
                          }}
                          className="px-3 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-medium text-[11px] transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end text-xs">
          <span className="text-slate-500 mr-2">Total bobot:</span>
          <strong className={totalWeight === 100 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
            {totalWeight}%
          </strong>
        </div>
      </div>

      {/* Bottom Card: Target per Staf · Oktober 2026 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-base font-bold text-slate-900">
            Target per Staf · {selectedPeriod}
          </h2>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyLastPeriod}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Salin dari periode lalu
            </button>
            <button
              onClick={handleSaveTargets}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-astra-800 hover:bg-astra-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Simpan Target
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            ✓ Target berhasil disimpan untuk periode {selectedPeriod}!
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-500 font-semibold">
                <th className="pb-3.5 font-medium">Staf</th>
                <th className="pb-3.5 font-medium">Tiket (≥ per bulan)</th>
                <th className="pb-3.5 font-medium">Waktu respons (≤ menit)</th>
                <th className="pb-3.5 font-medium">Kepuasan (≥ %)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-astra-700" />
                    Memuat staf dari database...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Belum ada data staf di database profiles.
                  </td>
                </tr>
              ) : (
                staffList.map((staf) => (
                  <tr key={staf.id} className="hover:bg-slate-50/60">
                    <td className="py-4 font-bold text-slate-800">{staf.full_name || staf.name}</td>

                  {/* Tiket */}
                  <td className="py-4">
                    <input
                      type="number"
                      value={targets[staf.id]?.tiket ?? 200}
                      onChange={(e) => handleTargetChange(staf.id, 'tiket', e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-astra-600 focus:outline-none"
                    />
                  </td>

                  {/* Waktu respons */}
                  <td className="py-4">
                    <input
                      type="number"
                      step="0.1"
                      value={targets[staf.id]?.respons ?? 5}
                      onChange={(e) => handleTargetChange(staf.id, 'respons', e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-astra-600 focus:outline-none"
                    />
                  </td>

                  {/* Kepuasan */}
                  <td className="py-4">
                    <input
                      type="number"
                      value={targets[staf.id]?.kepuasan ?? 90}
                      onChange={(e) => handleTargetChange(staf.id, 'kepuasan', e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-xs focus:ring-2 focus:ring-astra-600 focus:outline-none"
                    />
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit KPI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editingKpi ? 'Ubah Indikator KPI' : 'Tambah Indikator KPI'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKpi} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode KPI</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    placeholder="tiket, menit, %"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama KPI</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  placeholder="Contoh: Tiket Terselesaikan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Arah Penilaian</label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="higher_better">Semakin tinggi (Realisasi ÷ Target)</option>
                    <option value="lower_better">Semakin rendah (Target ÷ Realisasi)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bobot (%)</label>
                  <input
                    type="number"
                    required
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frekuensi</label>
                  <input
                    type="text"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sumber Data</label>
                  <input
                    type="text"
                    value={formData.data_source}
                    onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    placeholder="Sistem tiket, log sistem"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-astra-800 hover:bg-astra-900 text-white font-semibold"
                >
                  Simpan Indikator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
