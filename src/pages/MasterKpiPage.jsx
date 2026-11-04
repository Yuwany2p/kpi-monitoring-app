import React, { useMemo, useState } from 'react';
import { Plus, Save, Copy, Loader2, AlertTriangle, Pencil, ListPlus, Users, Tags } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useTabParam } from '../hooks/useTabParam';
import {
  getKpiIndicators,
  createKpiIndicator,
  updateKpiIndicator,
  setKpiIndicatorActive,
  getStaff,
  getKpiTargets,
  upsertKpiTargets,
  getGoalCategories,
  createGoalCategory,
  updateGoalCategory,
  deleteGoalCategory,
} from '../services/supabaseService';
import { directionSymbol, formatNumber } from '../lib/formatters';
import { PERSPECTIVES, GOAL_PRIORITIES } from '../lib/constants';
import { Notice, EmptyState, TableSkeleton } from '../components/common/Notice';
import { Section } from '../components/common/Section';
import { Dialog } from '../components/common/Dialog';
import { Tabs, TabPanel } from '../components/common/Tabs';

const EMPTY_KPI = {
  code: '',
  name: '',
  unit: '',
  direction: 'higher_better',
  weight: 0,
  frequency: 'Bulanan',
  data_source: '',
  perspective: '',
  category_id: '',
};

const EMPTY_CATEGORY = { name: '', priority: 'penting', weight: 0, description: '' };

const WeightTotal = ({ total, label }) => {
  const ok = Math.round(total * 100) / 100 === 100;
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}{' '}
      <span className={`font-semibold tabular-nums ${ok ? 'text-slate-900' : 'text-rose-700'}`}>{formatNumber(total)}%</span>
      {!ok && (
        <>
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
          <span className="text-rose-700">seharusnya 100%</span>
        </>
      )}
    </span>
  );
};

// ---------------------------------------------------------------------
// Tab 1: daftar indikator, dikelompokkan per perspektif
// ---------------------------------------------------------------------
const IndicatorTab = ({ query, indicators, categories, flash }) => {
  const { currentUser } = useAuth();
  const [editing, setEditing] = useState(null); // null = tutup, {} = baru, {...kpi} = ubah
  const [form, setForm] = useState(EMPTY_KPI);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const activeIndicators = indicators.filter((i) => i.is_active);
  const totalWeight = activeIndicators.reduce((acc, i) => acc + Number(i.weight || 0), 0);
  const categoryName = (id) => categories.find((c) => c.id === id)?.name;

  const groups = useMemo(() => {
    const keys = [...Object.keys(PERSPECTIVES), ''];
    return keys
      .map((key) => ({
        key,
        label: key ? PERSPECTIVES[key].label : 'Belum ada perspektif',
        items: indicators.filter((i) => (i.perspective || '') === key),
      }))
      .filter((g) => g.items.length > 0);
  }, [indicators]);

  const openAdd = () => {
    const nextNo = String(indicators.length + 1).padStart(2, '0');
    setForm({ ...EMPTY_KPI, code: `KPI-${nextNo}` });
    setFormError(null);
    setEditing({});
  };

  const openEdit = (kpi) => {
    setForm({
      code: kpi.code,
      name: kpi.name,
      unit: kpi.unit,
      direction: kpi.direction,
      weight: Number(kpi.weight),
      frequency: kpi.frequency,
      data_source: kpi.data_source || '',
      perspective: kpi.perspective || '',
      category_id: kpi.category_id || '',
    });
    setFormError(null);
    setEditing(kpi);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...form,
        weight: Number(form.weight),
        perspective: form.perspective || null,
        category_id: form.category_id || null,
      };
      if (editing?.id) {
        const updated = await updateKpiIndicator(editing.id, payload);
        query.setData(indicators.map((k) => (k.id === updated.id ? updated : k)));
        flash('success', `Indikator ${updated.code} diperbarui.`);
      } else {
        const created = await createKpiIndicator({ ...payload, created_by: currentUser.id });
        query.setData([...indicators, created]);
        flash('success', `Indikator ${created.code} ditambahkan.`);
      }
      setEditing(null);
    } catch (err) {
      setFormError(err.message.includes('duplicate') ? 'Kode KPI sudah dipakai indikator lain.' : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (kpi) => {
    setTogglingId(kpi.id);
    try {
      const updated = await setKpiIndicatorActive(kpi.id, !kpi.is_active);
      query.setData(indicators.map((k) => (k.id === updated.id ? updated : k)));
      flash('success', `Indikator ${kpi.code} ${updated.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch (err) {
      flash('error', err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <Section
        flush
        title="Indikator KPI"
        description={<WeightTotal total={totalWeight} label="Total bobot indikator aktif" />}
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah KPI
          </button>
        }
      >
        {query.error && <Notice type="error" className="m-4 sm:m-5">{query.error}</Notice>}
        {query.loading ? (
          <TableSkeleton cols={6} label="Memuat indikator…" />
        ) : indicators.length === 0 ? (
          <EmptyState
            icon={ListPlus}
            title="Belum ada indikator"
            action={
              <button onClick={openAdd} className="btn-primary">
                <Plus className="h-4 w-4" aria-hidden="true" /> Tambah KPI pertama
              </button>
            }
          >
            Indikator dibutuhkan sebelum target staf bisa ditetapkan.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Kode</th>
                  <th scope="col">Nama KPI</th>
                  <th scope="col">Penilaian</th>
                  <th scope="col" className="text-right">
                    Bobot
                  </th>
                  <th scope="col" className="hidden lg:table-cell">
                    Sumber data
                  </th>
                  <th scope="col" className="text-right">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.key || 'none'}>
                  <tr className="group-row">
                    <td colSpan={6}>
                      {group.label} <span className="font-normal text-slate-500">({group.items.length})</span>
                    </td>
                  </tr>
                  {group.items.map((kpi) => (
                    <tr key={kpi.id} className={`row-hover ${kpi.is_active ? '' : 'text-slate-500'}`}>
                      <td className="whitespace-nowrap font-medium tabular-nums">{kpi.code}</td>
                      <td className="min-w-[14rem]">
                        <span className={`font-medium ${kpi.is_active ? 'text-slate-900' : ''}`}>{kpi.name}</span>
                        {!kpi.is_active && <span className="ml-2 rounded bg-slate-100 px-1.5 text-xs text-slate-500">Nonaktif</span>}
                        <span className="block text-xs text-slate-500">
                          {categoryName(kpi.category_id) || 'Tanpa kategori'}, {kpi.frequency.toLowerCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        {directionSymbol(kpi.direction)} {kpi.unit}
                        <span className="block text-xs text-slate-500">
                          {kpi.direction === 'higher_better' ? 'Semakin tinggi' : 'Semakin rendah'}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{formatNumber(kpi.weight)}%</td>
                      <td className="hidden lg:table-cell">{kpi.data_source || '–'}</td>
                      <td className="whitespace-nowrap text-right">
                        <button onClick={() => openEdit(kpi)} className="btn-ghost btn-sm" aria-label={`Ubah ${kpi.code}`}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Ubah
                        </button>
                        <button
                          onClick={() => handleToggleActive(kpi)}
                          disabled={togglingId === kpi.id}
                          className="btn-ghost btn-sm"
                        >
                          {kpi.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </Section>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Ubah ${editing.code}` : 'Tambah indikator KPI'}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
              Batal
            </button>
            <button type="submit" form="kpi-form" disabled={saving} className="btn-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {editing?.id ? 'Simpan perubahan' : 'Tambah KPI'}
            </button>
          </>
        }
      >
        <form id="kpi-form" onSubmit={handleSave} className="space-y-4">
          {formError && <Notice type="error">{formError}</Notice>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[8rem_1fr]">
            <div>
              <label htmlFor="kpi-code" className="label">Kode</label>
              <input id="kpi-code" type="text" required maxLength={20} value={form.code} onChange={set('code')} className="field" />
            </div>
            <div>
              <label htmlFor="kpi-name" className="label">Nama KPI</label>
              <input
                id="kpi-name"
                type="text"
                required
                maxLength={120}
                autoFocus
                value={form.name}
                onChange={set('name')}
                className="field"
                placeholder="Contoh: Tiket terselesaikan"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="kpi-perspective" className="label">Perspektif</label>
              <select id="kpi-perspective" value={form.perspective} onChange={set('perspective')} className="field">
                <option value="">Pilih perspektif</option>
                {Object.entries(PERSPECTIVES).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="kpi-category" className="label">Kategori sasaran</label>
              <select id="kpi-category" value={form.category_id} onChange={set('category_id')} className="field">
                <option value="">Tanpa kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="kpi-unit" className="label">Satuan</label>
              <input
                id="kpi-unit"
                type="text"
                required
                maxLength={20}
                value={form.unit}
                onChange={set('unit')}
                className="field"
                placeholder="tiket, menit, %"
              />
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
                value={form.weight}
                onChange={set('weight')}
                className="field tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="kpi-freq" className="label">Frekuensi</label>
              <select id="kpi-freq" value={form.frequency} onChange={set('frequency')} className="field">
                <option value="Bulanan">Bulanan</option>
                <option value="Mingguan">Mingguan</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="kpi-dir" className="label">Arah penilaian</label>
            <select id="kpi-dir" value={form.direction} onChange={set('direction')} className="field" aria-describedby="kpi-dir-hint">
              <option value="higher_better">Semakin tinggi semakin baik</option>
              <option value="lower_better">Semakin rendah semakin baik</option>
            </select>
            <p id="kpi-dir-hint" className="hint">
              {form.direction === 'lower_better'
                ? 'Capaian = target ÷ realisasi × 100%. Cocok untuk waktu respons atau jumlah komplain.'
                : 'Capaian = realisasi ÷ target × 100%.'}
            </p>
          </div>

          <div>
            <label htmlFor="kpi-source" className="label">
              Sumber data <span className="font-normal text-slate-500">(opsional)</span>
            </label>
            <input
              id="kpi-source"
              type="text"
              maxLength={100}
              value={form.data_source}
              onChange={set('data_source')}
              className="field"
              placeholder="Sistem tiket, log sistem"
            />
          </div>
        </form>
      </Dialog>
    </>
  );
};

// ---------------------------------------------------------------------
// Tab 2: kategori sasaran
// ---------------------------------------------------------------------
const CategoryTab = ({ query, categories, indicators, flash }) => {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const totalWeight = categories.reduce((acc, c) => acc + Number(c.weight || 0), 0);
  const usage = (id) => indicators.filter((i) => i.category_id === id).length;
  const sorted = [...categories].sort(
    (a, b) => (GOAL_PRIORITIES[a.priority]?.rank || 9) - (GOAL_PRIORITIES[b.priority]?.rank || 9) || b.weight - a.weight
  );

  const openAdd = () => {
    setForm(EMPTY_CATEGORY);
    setFormError(null);
    setEditing({});
  };
  const openEdit = (c) => {
    setForm({ name: c.name, priority: c.priority, weight: Number(c.weight), description: c.description || '' });
    setFormError(null);
    setEditing(c);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, name: form.name.trim(), weight: Number(form.weight), description: form.description.trim() || null };
      if (editing?.id) {
        const updated = await updateGoalCategory(editing.id, payload);
        query.setData(categories.map((c) => (c.id === updated.id ? updated : c)));
        flash('success', `Kategori ${updated.name} diperbarui.`);
      } else {
        const created = await createGoalCategory(payload);
        query.setData([...categories, created]);
        flash('success', `Kategori ${created.name} ditambahkan.`);
      }
      setEditing(null);
    } catch (err) {
      setFormError(err.message.includes('duplicate') ? 'Nama kategori sudah dipakai.' : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteGoalCategory(deleting.id);
      query.setData(categories.filter((c) => c.id !== deleting.id));
      flash('success', `Kategori ${deleting.name} dihapus.`);
      setDeleting(null);
    } catch (err) {
      flash('error', err.message);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <Section
        flush
        title="Kategori sasaran"
        description={<WeightTotal total={totalWeight} label="Total bobot kategori" />}
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah kategori
          </button>
        }
      >
        {query.error && <Notice type="error" className="m-4 sm:m-5">{query.error}</Notice>}
        {query.loading ? (
          <TableSkeleton cols={4} label="Memuat kategori…" />
        ) : categories.length === 0 ? (
          <EmptyState icon={Tags} title="Belum ada kategori sasaran">
            Kategori mengelompokkan KPI berdasarkan prioritas: utama, penting, atau rutin.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Kategori</th>
                  <th scope="col">Prioritas</th>
                  <th scope="col" className="text-right">
                    Bobot
                  </th>
                  <th scope="col" className="text-right">
                    KPI
                  </th>
                  <th scope="col" className="text-right">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id} className="row-hover">
                    <td className="min-w-[14rem]">
                      <span className="font-medium text-slate-900">{c.name}</span>
                      {c.description && <span className="block text-xs text-slate-500">{c.description}</span>}
                    </td>
                    <td className="whitespace-nowrap">{GOAL_PRIORITIES[c.priority]?.label || c.priority}</td>
                    <td className="text-right tabular-nums">{formatNumber(c.weight)}%</td>
                    <td className="text-right tabular-nums">{usage(c.id)}</td>
                    <td className="whitespace-nowrap text-right">
                      <button onClick={() => openEdit(c)} className="btn-ghost btn-sm">
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Ubah
                      </button>
                      <button onClick={() => setDeleting(c)} className="btn-ghost btn-sm text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Ubah kategori ${editing.name}` : 'Tambah kategori sasaran'}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
              Batal
            </button>
            <button type="submit" form="category-form" disabled={saving} className="btn-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {editing?.id ? 'Simpan perubahan' : 'Tambah kategori'}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSave} className="space-y-4">
          {formError && <Notice type="error">{formError}</Notice>}
          <div>
            <label htmlFor="cat-name" className="label">Nama kategori</label>
            <input id="cat-name" type="text" required maxLength={80} autoFocus value={form.name} onChange={set('name')} className="field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cat-priority" className="label">Prioritas</label>
              <select id="cat-priority" value={form.priority} onChange={set('priority')} className="field">
                {Object.entries(GOAL_PRIORITIES).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cat-weight" className="label">Bobot (%)</label>
              <input
                id="cat-weight"
                type="number"
                required
                min="0"
                max="100"
                step="any"
                value={form.weight}
                onChange={set('weight')}
                className="field tabular-nums"
              />
            </div>
          </div>
          <div>
            <label htmlFor="cat-desc" className="label">
              Keterangan <span className="font-normal text-slate-500">(opsional)</span>
            </label>
            <textarea id="cat-desc" rows={2} value={form.description} onChange={set('description')} className="field" />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Hapus kategori ${deleting?.name || ''}?`}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setDeleting(null)} className="btn-secondary">
              Batal
            </button>
            <button type="button" onClick={handleDelete} disabled={saving} className="btn-danger-outline">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Hapus kategori
            </button>
          </>
        }
      >
        <p className="text-slate-600">
          {deleting && usage(deleting.id) > 0
            ? `${usage(deleting.id)} KPI memakai kategori ini. KPI tersebut tetap ada, tetapi tidak punya kategori lagi.`
            : 'Kategori ini belum dipakai KPI mana pun.'}
        </p>
      </Dialog>
    </>
  );
};

// ---------------------------------------------------------------------
// Tab 3: target per staf (matriks staf x indikator)
// ---------------------------------------------------------------------
const TargetTab = ({ activeIndicators, flash }) => {
  const { currentUser } = useAuth();
  const { selectedPeriod, previousPeriod, selectedTeamId, teamLabel } = useFilter();
  const [draftTargets, setDraftTargets] = useState({});
  const [savingTargets, setSavingTargets] = useState(false);

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
  const dirtyCount = Object.values(draftTargets).reduce((acc, row) => acc + Object.keys(row).length, 0);

  const getTargetValue = (staffId, indicatorId) => {
    const draft = draftTargets[staffId]?.[indicatorId];
    if (draft !== undefined) return draft;
    return savedTargets[staffId]?.[indicatorId] ?? '';
  };

  const handleTargetChange = (staffId, indicatorId, val) => {
    setDraftTargets((prev) => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), [indicatorId]: val } }));
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
      flash('success', `${rows.length} target disimpan untuk ${selectedPeriod.name}.`);
    } catch (err) {
      flash('error', `Target belum tersimpan: ${err.message}`);
    } finally {
      setSavingTargets(false);
    }
  };

  const handleCopyLastPeriod = async () => {
    if (!previousPeriod) return;
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
        flash('info', `${previousPeriod.name} belum punya target untuk disalin.`);
        return;
      }
      setDraftTargets(next);
      flash('info', `${copied} target disalin dari ${previousPeriod.name}. Simpan untuk menerapkan.`);
    } catch (err) {
      flash('error', err.message);
    }
  };

  return (
    <Section
      flush
      title={`Target per staf, ${selectedPeriod?.name || '-'}`}
      description={teamLabel}
      actions={
        <button onClick={handleCopyLastPeriod} disabled={!previousPeriod} className="btn-secondary">
          <Copy className="h-4 w-4" aria-hidden="true" /> Salin dari {previousPeriod?.name || 'periode lalu'}
        </button>
      }
    >
      {selectedPeriod?.status === 'closed' && (
        <Notice type="warning" className="m-4 sm:m-5">
          Periode ini sudah ditutup. Mengubah target akan mengubah capaian yang sudah dilaporkan.
        </Notice>
      )}
      {targetsQuery.error && <Notice type="error" className="m-4 sm:m-5">{targetsQuery.error}</Notice>}

      {targetsQuery.loading ? (
        <TableSkeleton cols={activeIndicators.length + 1} label="Memuat target…" />
      ) : staffList.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada staf aktif">
          Tambahkan staf ke tim ini di menu Karyawan & departemen.
        </EmptyState>
      ) : activeIndicators.length === 0 ? (
        <EmptyState icon={ListPlus} title="Belum ada indikator aktif">
          Tambahkan atau aktifkan indikator di tab Indikator dulu.
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th scope="col" className="sticky-col min-w-[11rem]">
                  Staf
                </th>
                {activeIndicators.map((ind) => (
                  <th key={ind.id} scope="col" className="min-w-[7.5rem] align-bottom">
                    <span className="block" title={ind.name}>
                      {ind.code}
                    </span>
                    <span className="block max-w-[9rem] truncate font-normal text-slate-500" title={ind.name}>
                      {ind.name}
                    </span>
                    <span className="block font-normal text-slate-500">
                      {directionSymbol(ind.direction)} {ind.unit}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map((staf) => (
                <tr key={staf.id}>
                  <th scope="row" className="sticky-col">
                    <span className="block whitespace-nowrap font-medium text-slate-900">{staf.full_name}</span>
                    {multiTeam && <span className="block text-xs text-slate-500">{staf.teams?.name}</span>}
                  </th>
                  {activeIndicators.map((ind) => {
                    const dirty = draftTargets[staf.id]?.[ind.id] !== undefined;
                    return (
                      <td key={ind.id} className="py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          aria-label={`Target ${ind.name} untuk ${staf.full_name}`}
                          value={getTargetValue(staf.id, ind.id)}
                          onChange={(e) => handleTargetChange(staf.id, ind.id, e.target.value)}
                          placeholder="–"
                          className={`field h-9 w-24 tabular-nums ${dirty ? 'border-astra-500 bg-astra-50 ring-1 ring-astra-500' : ''}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {staffList.length > 0 && activeIndicators.length > 0 && (
        <div className="sticky bottom-0 z-20 flex flex-col gap-3 rounded-b-lg border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[13px] text-slate-600" aria-live="polite">
            {dirtyCount > 0
              ? `${dirtyCount} perubahan belum disimpan. Kolom yang berubah ditandai biru.`
              : 'Isi nilai target, lalu simpan.'}
          </p>
          <div className="flex gap-2">
            {dirtyCount > 0 && (
              <button onClick={() => setDraftTargets({})} disabled={savingTargets} className="btn-ghost">
                Batalkan
              </button>
            )}
            <button onClick={handleSaveTargets} disabled={savingTargets || dirtyCount === 0} className="btn-primary">
              {savingTargets ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {dirtyCount > 0 ? `Simpan ${dirtyCount} target` : 'Simpan target'}
            </button>
          </div>
        </div>
      )}
    </Section>
  );
};

// ---------------------------------------------------------------------
export const MasterKpiPage = () => {
  const [message, setMessage] = useState(null);

  const indicatorsQuery = useAsyncData(() => getKpiIndicators({ includeInactive: true }), [], { initialData: [] });
  const categoriesQuery = useAsyncData(() => getGoalCategories(), [], { initialData: [] });
  const indicators = useMemo(() => indicatorsQuery.data || [], [indicatorsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);
  const activeIndicators = indicators.filter((i) => i.is_active);

  const tabs = [
    { key: 'indikator', label: 'Indikator', count: indicatorsQuery.loading ? null : indicators.length },
    { key: 'kategori', label: 'Kategori sasaran', count: categoriesQuery.loading ? null : categories.length },
    { key: 'target', label: 'Target per staf' },
  ];
  const [active, setActive] = useTabParam(tabs, 'indikator');

  const flash = (type, text) => {
    setMessage({ type, text });
    if (type !== 'error') setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="space-y-5">
      <Tabs tabs={tabs} active={active} onChange={setActive} label="Bagian kelola KPI" idPrefix="kpi" />

      {message && (
        <Notice type={message.type} onDismiss={() => setMessage(null)}>
          {message.text}
        </Notice>
      )}

      <TabPanel tabKey="indikator" active={active} idPrefix="kpi">
        <IndicatorTab query={indicatorsQuery} indicators={indicators} categories={categories} flash={flash} />
      </TabPanel>
      <TabPanel tabKey="kategori" active={active} idPrefix="kpi">
        <CategoryTab query={categoriesQuery} categories={categories} indicators={indicators} flash={flash} />
      </TabPanel>
      <TabPanel tabKey="target" active={active} idPrefix="kpi">
        <TargetTab activeIndicators={activeIndicators} flash={flash} />
      </TabPanel>
    </div>
  );
};
