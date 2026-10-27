import React, { useMemo, useState } from 'react';
import { Plus, Save, Copy, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  getKpiIndicators,
  createKpiIndicator,
  updateKpiIndicator,
  setKpiIndicatorActive,
  getStaff,
  getKpiTargets,
  upsertKpiTargets,
} from '../services/supabaseService';
import { directionSymbol } from '../lib/formatters';
import { Notice, LoadingBlock } from '../components/common/Notice';

const EMPTY_FORM = {
  code: '',
  name: '',
  unit: '',
  direction: 'higher_better',
  weight: 0,
  frequency: 'Bulanan',
  data_source: '',
};

const inputClass =
  'w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-astra-600';

export const MasterKpiPage = () => {
  const { currentUser } = useAuth();
  const { selectedPeriod, previousPeriod, selectedTeamId, teamLabel } = useFilter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [savingKpi, setSavingKpi] = useState(false);
  const [message, setMessage] = useState(null);

  // draft target yang sedang diedit: { [staffId]: { [indicatorId]: value } }
  const [draftTargets, setDraftTargets] = useState({});
  const [savingTargets, setSavingTargets] = useState(false);

  const indicatorsQuery = useAsyncData(() => getKpiIndicators({ includeInactive: true }), [], {
    initialData: [],
  });
  const indicators = useMemo(() => indicatorsQuery.data || [], [indicatorsQuery.data]);
  const activeIndicators = indicators.filter((i) => i.is_active);

  const targetsQuery = useAsyncData(
    async () => {
      const [staff, targets] = await Promise.all([getStaff(selectedTeamId), getKpiTargets(selectedPeriod.id)]);
      return { staff, targets };
    },
    [selectedPeriod?.id, selectedTeamId],
    { enabled: Boolean(selectedPeriod), initialData: { staff: [], targets: [] } }
  );

  const savedTargets = useMemo(() => {
    const map = {};
    (targetsQuery.data?.targets || []).forEach((t) => {
      map[t.staff_id] = map[t.staff_id] || {};
      map[t.staff_id][t.indicator_id] = Number(t.target_value);
    });
    return map;
  }, [targetsQuery.data]);

  // Reset draft saat periode/tim berganti
  const draftKey = `${selectedPeriod?.id}-${selectedTeamId}`;
  const [lastDraftKey, setLastDraftKey] = useState(draftKey);
  if (draftKey !== lastDraftKey) {
    setLastDraftKey(draftKey);
    setDraftTargets({});
  }

  const staffList = targetsQuery.data?.staff || [];
  const multiTeam = new Set(staffList.map((s) => s.team_id)).size > 1;
  const totalWeight = activeIndicators.reduce((acc, i) => acc + Number(i.weight || 0), 0);
  const dirtyCount = Object.values(draftTargets).reduce((acc, row) => acc + Object.keys(row).length, 0);

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ---------------- Indikator ----------------
  const handleOpenAdd = () => {
    setEditingKpi(null);
    const nextNo = String(indicators.length + 1).padStart(2, '0');
    setFormData({ ...EMPTY_FORM, code: `KPI-${nextNo}` });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (kpi) => {
    setEditingKpi(kpi);
    setFormData({
      code: kpi.code,
      name: kpi.name,
      unit: kpi.unit,
      direction: kpi.direction,
      weight: Number(kpi.weight),
      frequency: kpi.frequency,
      data_source: kpi.data_source || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveKpi = async (e) => {
    e.preventDefault();
    setSavingKpi(true);
    setFormError(null);
    try {
      const payload = { ...formData, weight: Number(formData.weight) };
      if (editingKpi) {
        const updated = await updateKpiIndicator(editingKpi.id, payload);
        indicatorsQuery.setData(indicators.map((k) => (k.id === updated.id ? updated : k)));
        flash('success', `Indikator ${updated.code} diperbarui.`);
      } else {
        const created = await createKpiIndicator({ ...payload, created_by: currentUser.id });
        indicatorsQuery.setData([...indicators, created]);
        flash('success', `Indikator ${created.code} ditambahkan.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message.includes('duplicate') ? 'Kode KPI sudah dipakai.' : err.message);
    } finally {
      setSavingKpi(false);
    }
  };

  const handleToggleActive = async (kpi) => {
    try {
      const updated = await setKpiIndicatorActive(kpi.id, !kpi.is_active);
      indicatorsQuery.setData(indicators.map((k) => (k.id === updated.id ? updated : k)));
      flash('success', `Indikator ${kpi.code} ${updated.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch (err) {
      flash('error', err.message);
    }
  };

  // ---------------- Target ----------------
  const getTargetValue = (staffId, indicatorId) => {
    const draft = draftTargets[staffId]?.[indicatorId];
    if (draft !== undefined) return draft;
    return savedTargets[staffId]?.[indicatorId] ?? '';
  };

  const handleTargetChange = (staffId, indicatorId, val) => {
    setDraftTargets((prev) => ({
      ...prev,
      [staffId]: { ...(prev[staffId] || {}), [indicatorId]: val },
    }));
  };

  const handleSaveTargets = async () => {
    const rows = [];
    let invalid = false;
    Object.entries(draftTargets).forEach(([staffId, row]) => {
      Object.entries(row).forEach(([indicatorId, val]) => {
        if (val === '' || val === null) return;
        const num = Number(val);
        if (!(num > 0)) {
          invalid = true;
          return;
        }
        rows.push({
          staff_id: staffId,
          indicator_id: indicatorId,
          period_id: selectedPeriod.id,
          target_value: num,
          created_by: currentUser.id,
        });
      });
    });
    if (invalid) {
      flash('error', 'Nilai target harus lebih besar dari 0.');
      return;
    }
    if (!rows.length) {
      flash('info', 'Tidak ada perubahan target.');
      return;
    }
    setSavingTargets(true);
    try {
      await upsertKpiTargets(rows);
      setDraftTargets({});
      await targetsQuery.reload();
      flash('success', `${rows.length} target berhasil disimpan untuk periode ${selectedPeriod.name}.`);
    } catch (err) {
      flash('error', `Gagal menyimpan target: ${err.message}`);
    } finally {
      setSavingTargets(false);
    }
  };

  const handleCopyLastPeriod = async () => {
    if (!previousPeriod) {
      flash('info', 'Tidak ada periode sebelumnya.');
      return;
    }
    try {
      const prevTargets = await getKpiTargets(previousPeriod.id);
      const staffIds = new Set(staffList.map((s) => s.id));
      const activeIds = new Set(activeIndicators.map((i) => i.id));
      const next = {};
      let copied = 0;
      prevTargets.forEach((t) => {
        if (!staffIds.has(t.staff_id) || !activeIds.has(t.indicator_id)) return;
        next[t.staff_id] = next[t.staff_id] || {};
        next[t.staff_id][t.indicator_id] = Number(t.target_value);
        copied += 1;
      });
      if (!copied) {
        flash('info', `Periode ${previousPeriod.name} belum punya target untuk disalin.`);
        return;
      }
      setDraftTargets(next);
      flash('info', `${copied} target disalin dari ${previousPeriod.name}. Klik "Simpan Target" untuk menyimpan.`);
    } catch (err) {
      flash('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {message && <Notice type={message.type}>{message.text}</Notice>}

      {/* Daftar Indikator KPI */}
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

        {indicatorsQuery.error && <Notice type="error">{indicatorsQuery.error}</Notice>}

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
              {indicatorsQuery.loading ? (
                <tr>
                  <td colSpan={8}>
                    <LoadingBlock text="Memuat indikator..." />
                  </td>
                </tr>
              ) : indicators.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada indikator KPI. Klik <strong>+ Tambah KPI</strong> untuk menambahkan.
                  </td>
                </tr>
              ) : (
                indicators.map((kpi) => (
                  <tr key={kpi.id} className={`hover:bg-slate-50/70 ${kpi.is_active ? '' : 'opacity-50'}`}>
                    <td className="py-4 font-bold text-slate-900">{kpi.code}</td>
                    <td className="py-4 font-semibold text-slate-800">
                      {kpi.name}
                      {!kpi.is_active && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-slate-600">{kpi.unit}</td>
                    <td className="py-4 text-slate-600">
                      {kpi.direction === 'higher_better' ? 'Semakin tinggi' : 'Semakin rendah'}
                    </td>
                    <td className="py-4 font-semibold text-slate-800">{Number(kpi.weight)}%</td>
                    <td className="py-4 text-slate-600">{kpi.frequency}</td>
                    <td className="py-4 text-slate-600">{kpi.data_source || '-'}</td>
                    <td className="py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(kpi)}
                          className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          Ubah
                        </button>
                        <button
                          onClick={() => handleToggleActive(kpi)}
                          className={`px-3 py-1 rounded-lg border font-medium text-[11px] transition-colors cursor-pointer ${
                            kpi.is_active
                              ? 'border-rose-200 hover:bg-rose-50 text-rose-600'
                              : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {kpi.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end items-center gap-2 text-xs">
          <span className="text-slate-500">Total bobot indikator aktif:</span>
          <strong className={totalWeight === 100 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
            {totalWeight}%
          </strong>
          {totalWeight !== 100 && <span className="text-rose-600">(seharusnya 100%)</span>}
        </div>
      </div>

      {/* Target per Staf */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Target per Staf · {selectedPeriod?.name || '-'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{teamLabel}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyLastPeriod}
              disabled={!previousPeriod}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Salin dari periode lalu
            </button>
            <button
              onClick={handleSaveTargets}
              disabled={savingTargets || dirtyCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-astra-800 hover:bg-astra-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {savingTargets ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan Target{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
            </button>
          </div>
        </div>

        {selectedPeriod?.status === 'closed' && (
          <Notice type="warning" className="mb-4">
            Periode ini sudah ditutup. Perubahan target akan memengaruhi perhitungan capaian historis.
          </Notice>
        )}
        {targetsQuery.error && <Notice type="error">{targetsQuery.error}</Notice>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-500 font-semibold">
                <th className="pb-3.5 font-medium">Staf</th>
                {activeIndicators.map((ind) => (
                  <th key={ind.id} className="pb-3.5 font-medium">
                    {ind.name} ({directionSymbol(ind.direction)} {ind.unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targetsQuery.loading ? (
                <tr>
                  <td colSpan={activeIndicators.length + 1}>
                    <LoadingBlock text="Memuat target..." />
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={activeIndicators.length + 1} className="py-8 text-center text-slate-400">
                    Belum ada staf aktif di tim ini.
                  </td>
                </tr>
              ) : (
                staffList.map((staf) => (
                  <tr key={staf.id} className="hover:bg-slate-50/60">
                    <td className="py-4">
                      <p className="font-bold text-slate-800">{staf.full_name}</p>
                      {multiTeam && <p className="text-[10px] text-slate-400">{staf.teams?.name}</p>}
                    </td>
                    {activeIndicators.map((ind) => {
                      const dirty = draftTargets[staf.id]?.[ind.id] !== undefined;
                      return (
                        <td key={ind.id} className="py-4">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={getTargetValue(staf.id, ind.id)}
                            onChange={(e) => handleTargetChange(staf.id, ind.id, e.target.value)}
                            placeholder="-"
                            className={`w-28 px-3 py-1.5 rounded-xl border text-slate-900 font-medium text-xs focus:ring-2 focus:ring-astra-600 focus:outline-none ${
                              dirty ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300'
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Ubah KPI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editingKpi ? 'Ubah Indikator KPI' : 'Tambah Indikator KPI'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKpi} className="p-6 space-y-4 text-xs">
              <Notice type="error">{formError}</Notice>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode KPI</label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className={inputClass}
                    placeholder="tiket, menit, %"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama KPI</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  placeholder="Contoh: Tiket Terselesaikan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Arah Penilaian</label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className={`${inputClass} bg-white`}
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
                    min="0"
                    max="100"
                    step="any"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frekuensi</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className={`${inputClass} bg-white`}
                  >
                    <option value="Bulanan">Bulanan</option>
                    <option value="Mingguan">Mingguan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sumber Data</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formData.data_source}
                    onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
                    className={inputClass}
                    placeholder="Sistem tiket, log sistem"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingKpi}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-astra-800 hover:bg-astra-900 disabled:opacity-60 text-white font-semibold cursor-pointer"
                >
                  {savingKpi && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
