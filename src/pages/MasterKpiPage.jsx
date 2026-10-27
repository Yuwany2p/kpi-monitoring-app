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
import { directionSymbol, formatNumber } from '../lib/formatters';
import { Notice, LoadingBlock, EmptyBlock } from '../components/common/Notice';

const EMPTY_FORM = {
  code: '',
  name: '',
  unit: '',
  direction: 'higher_better',
  weight: 0,
  frequency: 'Bulanan',
  data_source: '',
};

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
    if (type !== 'error') setTimeout(() => setMessage(null), 5000);
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
      flash('info', 'Belum ada target yang diubah.');
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
      flash('info', `${copied} target disalin dari ${previousPeriod.name}. Simpan untuk menerapkan.`);
    } catch (err) {
      flash('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {message && <Notice type={message.type}>{message.text}</Notice>}

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="card-title">Daftar indikator KPI</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Total bobot indikator aktif{' '}
              <span className={`font-semibold ${totalWeight === 100 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatNumber(totalWeight)}%
              </span>
              {totalWeight !== 100 && ', seharusnya 100%'}
            </p>
          </div>
          <button onClick={handleOpenAdd} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah KPI
          </button>
        </div>

        {indicatorsQuery.error && <Notice type="error" className="mt-4">{indicatorsQuery.error}</Notice>}

        <div className="-mx-2 mt-5 overflow-x-auto px-2">
          <table className="table-base">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama KPI</th>
                <th>Satuan</th>
                <th>Arah</th>
                <th className="text-right">Bobot</th>
                <th>Frekuensi</th>
                <th>Sumber data</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {indicatorsQuery.loading ? (
                <tr>
                  <td colSpan={8}>
                    <LoadingBlock text="Memuat indikator…" />
                  </td>
                </tr>
              ) : indicators.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyBlock>Belum ada indikator. Tambahkan KPI pertama untuk mulai menetapkan target.</EmptyBlock>
                  </td>
                </tr>
              ) : (
                indicators.map((kpi) => (
                  <tr key={kpi.id} className={kpi.is_active ? '' : 'text-slate-400'}>
                    <td className="font-semibold">{kpi.code}</td>
                    <td className="font-medium">
                      {kpi.name}
                      {!kpi.is_active && <span className="ml-2 text-xs text-slate-400">(nonaktif)</span>}
                    </td>
                    <td>{kpi.unit}</td>
                    <td>{kpi.direction === 'higher_better' ? 'Semakin tinggi' : 'Semakin rendah'}</td>
                    <td className="text-right tabular-nums">{formatNumber(kpi.weight)}%</td>
                    <td>{kpi.frequency}</td>
                    <td>{kpi.data_source || '–'}</td>
                    <td className="text-right whitespace-nowrap">
                      <button onClick={() => handleOpenEdit(kpi)} className="btn-secondary btn-sm">
                        Ubah
                      </button>
                      <button
                        onClick={() => handleToggleActive(kpi)}
                        className={`ml-2 btn-sm ${kpi.is_active ? 'btn-danger-outline' : 'btn-secondary'}`}
                      >
                        {kpi.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="card-title">Target per staf, {selectedPeriod?.name || '-'}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{teamLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopyLastPeriod} disabled={!previousPeriod} className="btn-secondary">
              <Copy className="h-4 w-4" aria-hidden="true" /> Salin dari periode lalu
            </button>
            <button onClick={handleSaveTargets} disabled={savingTargets || dirtyCount === 0} className="btn-primary">
              {savingTargets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {dirtyCount > 0 ? `Simpan ${dirtyCount} perubahan` : 'Simpan target'}
            </button>
          </div>
        </div>

        {selectedPeriod?.status === 'closed' && (
          <Notice type="warning" className="mt-4">
            Periode ini sudah ditutup. Mengubah target akan mengubah capaian yang sudah dilaporkan.
          </Notice>
        )}
        {targetsQuery.error && <Notice type="error" className="mt-4">{targetsQuery.error}</Notice>}

        <div className="-mx-2 mt-5 overflow-x-auto px-2">
          <table className="table-base">
            <thead>
              <tr>
                <th>Staf</th>
                {activeIndicators.map((ind) => (
                  <th key={ind.id}>
                    {ind.name} ({directionSymbol(ind.direction)} {ind.unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {targetsQuery.loading ? (
                <tr>
                  <td colSpan={activeIndicators.length + 1}>
                    <LoadingBlock text="Memuat target…" />
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={activeIndicators.length + 1}>
                    <EmptyBlock>Belum ada staf aktif di tim ini.</EmptyBlock>
                  </td>
                </tr>
              ) : (
                staffList.map((staf) => (
                  <tr key={staf.id}>
                    <td>
                      <p className="whitespace-nowrap font-semibold text-slate-900">{staf.full_name}</p>
                      {multiTeam && <p className="text-xs text-slate-500">{staf.teams?.name}</p>}
                    </td>
                    {activeIndicators.map((ind) => {
                      const dirty = draftTargets[staf.id]?.[ind.id] !== undefined;
                      return (
                        <td key={ind.id}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            aria-label={`Target ${ind.name} untuk ${staf.full_name}`}
                            value={getTargetValue(staf.id, ind.id)}
                            onChange={(e) => handleTargetChange(staf.id, ind.id, e.target.value)}
                            placeholder="–"
                            className={`field w-28 tabular-nums ${dirty ? 'border-amber-400 bg-amber-50' : ''}`}
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
        {dirtyCount > 0 && (
          <p className="mt-3 text-sm text-amber-700">Kolom berwarna kuning belum disimpan.</p>
        )}
      </section>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kpi-modal-title"
          onKeyDown={(e) => e.key === 'Escape' && setIsModalOpen(false)}
        >
          <div className="w-full max-w-lg rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 id="kpi-modal-title" className="card-title">
                {editingKpi ? 'Ubah indikator KPI' : 'Tambah indikator KPI'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKpi} className="space-y-4 p-6">
              {formError && <Notice type="error">{formError}</Notice>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kpi-code" className="label">Kode</label>
                  <input
                    id="kpi-code"
                    type="text"
                    required
                    maxLength={20}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="kpi-unit" className="label">Satuan</label>
                  <input
                    id="kpi-unit"
                    type="text"
                    required
                    maxLength={20}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="field"
                    placeholder="tiket, menit, %"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="kpi-name" className="label">Nama KPI</label>
                <input
                  id="kpi-name"
                  type="text"
                  required
                  maxLength={120}
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="field"
                  placeholder="Contoh: Tiket Terselesaikan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kpi-dir" className="label">Arah penilaian</label>
                  <select
                    id="kpi-dir"
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className="field"
                  >
                    <option value="higher_better">Semakin tinggi semakin baik</option>
                    <option value="lower_better">Semakin rendah semakin baik</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="kpi-weight" className="label">Bobot (%)</label>
                  <input
                    id="kpi-weight"
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="any"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="field"
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-slate-500">
                {formData.direction === 'lower_better'
                  ? 'Capaian = Target ÷ Realisasi × 100%, cocok untuk waktu respons atau jumlah komplain.'
                  : 'Capaian = Realisasi ÷ Target × 100%.'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kpi-freq" className="label">Frekuensi</label>
                  <select
                    id="kpi-freq"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="field"
                  >
                    <option value="Bulanan">Bulanan</option>
                    <option value="Mingguan">Mingguan</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="kpi-source" className="label">Sumber data</label>
                  <input
                    id="kpi-source"
                    type="text"
                    maxLength={100}
                    value={formData.data_source}
                    onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
                    className="field"
                    placeholder="Sistem tiket, log sistem"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={savingKpi} className="btn-primary">
                  {savingKpi && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingKpi ? 'Simpan perubahan' : 'Tambah KPI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
