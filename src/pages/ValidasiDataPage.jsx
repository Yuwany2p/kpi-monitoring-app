import React, { useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { getKpiResults, validateActual } from '../services/supabaseService';
import { calculateAchievement, getStatusByScore, formatNumber, formatDateTime } from '../lib/formatters';
import { Notice, LoadingBlock, ScoreBadge } from '../components/common/Notice';
import { EvidenceLink } from '../components/common/EvidenceLink';

const TABS = [
  { key: 'submitted', label: 'Menunggu' },
  { key: 'approved', label: 'Valid' },
  { key: 'rejected', label: 'Ditolak' },
];

const selectClass =
  'px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-astra-600 cursor-pointer';

export const ValidasiDataPage = () => {
  const { selectedPeriod } = useFilter();
  const [activeTab, setActiveTab] = useState('submitted');
  const [filterStaff, setFilterStaff] = useState('ALL');
  const [filterIndicator, setFilterIndicator] = useState('ALL');
  const [selected, setSelected] = useState(new Set());
  const [rejectNote, setRejectNote] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  const { data, loading, error, reload } = useAsyncData(
    () => getKpiResults({ periodId: selectedPeriod.id }),
    [selectedPeriod?.id],
    { enabled: Boolean(selectedPeriod), initialData: [] }
  );

  const items = useMemo(
    () =>
      (data || [])
        .filter((r) => ['submitted', 'approved', 'rejected'].includes(r.actual_status))
        .map((r) => {
          const achievement =
            r.achievement_pct ?? calculateAchievement(r.actual_value, r.target_value, r.direction) ?? 0;
          return {
            ...r,
            achievement,
            color: r.status_color || getStatusByScore(achievement).key,
            largeDeviation: achievement < 80 || achievement > 150,
          };
        })
        .sort((a, b) => a.staff_name.localeCompare(b.staff_name) || a.indicator_code.localeCompare(b.indicator_code)),
    [data]
  );

  const counts = TABS.reduce((acc, t) => ({ ...acc, [t.key]: items.filter((i) => i.actual_status === t.key).length }), {});
  const staffOptions = [...new Set(items.map((i) => i.staff_name))];
  const indicatorOptions = [...new Set(items.map((i) => i.indicator_name))];

  const filteredItems = items.filter(
    (i) =>
      i.actual_status === activeTab &&
      (filterStaff === 'ALL' || i.staff_name === filterStaff) &&
      (filterIndicator === 'ALL' || i.indicator_name === filterIndicator)
  );
  const isPendingTab = activeTab === 'submitted';
  const selectedVisible = filteredItems.filter((i) => selected.has(i.actual_id));

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runValidation = async (targets, status, note) => {
    setBusyId(targets.length === 1 ? targets[0].actual_id : 'batch');
    try {
      for (const item of targets) {
        await validateActual(item.actual_id, status, note);
      }
      setSelected(new Set());
      if (status === 'rejected') setRejectNote('');
      await reload();
      flash(
        'success',
        status === 'approved'
          ? `${targets.length} data capaian disetujui. Capaian & status warna dihitung otomatis.`
          : `Data ${targets[0].staff_name} · ${targets[0].indicator_name} dikembalikan ke staf.`
      );
    } catch (err) {
      flash('error', `Gagal memproses: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = (item) => {
    if (!rejectNote.trim()) {
      flash('error', 'Isi catatan penolakan terlebih dahulu pada kotak di bawah tabel.');
      return;
    }
    runValidation([item], 'rejected', rejectNote.trim());
  };

  if (!selectedPeriod) return <LoadingBlock />;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex gap-8 border-b border-slate-200 text-sm font-semibold">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSelected(new Set());
            }}
            className={`pb-3.5 transition-colors relative cursor-pointer ${
              activeTab === tab.key
                ? 'text-astra-800 font-bold border-b-2 border-astra-800'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label} ({counts[tab.key] || 0})
          </button>
        ))}
      </div>

      {message && <Notice type={message.type}>{message.text}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className={selectClass}>
            <option value="ALL">Semua staf</option>
            {staffOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={filterIndicator} onChange={(e) => setFilterIndicator(e.target.value)} className={selectClass}>
            <option value="ALL">Semua indikator</option>
            {indicatorOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {isPendingTab && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">{selectedVisible.length} baris dipilih</span>
            <button
              onClick={() => runValidation(selectedVisible, 'approved')}
              disabled={selectedVisible.length === 0 || Boolean(busyId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {busyId === 'batch' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Setujui terpilih
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 text-slate-400 font-semibold">
              {isPendingTab && (
                <th className="pb-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && filteredItems.every((i) => selected.has(i.actual_id))}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(filteredItems.map((i) => i.actual_id)) : new Set())
                    }
                    className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="pb-3.5 font-medium">Staf</th>
              <th className="pb-3.5 font-medium">Indikator</th>
              <th className="pb-3.5 font-medium">Target</th>
              <th className="pb-3.5 font-medium">Realisasi</th>
              <th className="pb-3.5 font-medium">Capaian</th>
              <th className="pb-3.5 font-medium">Bukti</th>
              <th className="pb-3.5 font-medium">{isPendingTab ? 'Pengecekan' : 'Catatan'}</th>
              <th className="pb-3.5 text-center font-medium">{isPendingTab ? 'Aksi' : 'Divalidasi'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9}>
                  <LoadingBlock text="Memuat data pengajuan..." />
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  {isPendingTab
                    ? `Tidak ada data yang menunggu validasi di periode ${selectedPeriod.name}.`
                    : 'Tidak ada data.'}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.actual_id} className="hover:bg-slate-50/60 align-top">
                  {isPendingTab && (
                    <td className="py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(item.actual_id)}
                        onChange={() => toggle(item.actual_id)}
                        className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="py-4 font-bold text-slate-900">{item.staff_name}</td>
                  <td className="py-4 text-slate-700 font-medium">
                    {item.indicator_name}
                    {item.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">“{item.notes}”</p>}
                  </td>
                  <td className="py-4 text-slate-600 whitespace-nowrap">
                    {formatNumber(item.target_value)} {item.unit}
                  </td>
                  <td className="py-4 font-bold text-slate-900 whitespace-nowrap">
                    {formatNumber(item.actual_value)} {item.unit}
                  </td>
                  <td className="py-4">
                    <ScoreBadge value={item.achievement} color={item.color} />
                  </td>
                  <td className="py-4">
                    <EvidenceLink path={item.evidence_url} />
                  </td>
                  <td className="py-4">
                    {isPendingTab ? (
                      <div className="flex flex-col gap-1 items-start">
                        {item.largeDeviation && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900">
                            <AlertTriangle className="w-3 h-3 text-amber-700" /> Selisih besar
                          </span>
                        )}
                        {!item.evidence_url && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Tanpa bukti
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">{item.validation_note || '-'}</span>
                    )}
                  </td>
                  <td className="py-4 text-center">
                    {isPendingTab ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => runValidation([item], 'approved')}
                          disabled={Boolean(busyId)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          disabled={Boolean(busyId)}
                          className="px-3 py-1 border border-rose-300 hover:bg-rose-50 disabled:opacity-50 text-rose-600 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500 whitespace-nowrap">{formatDateTime(item.validated_at)}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isPendingTab && (
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Catatan penolakan (wajib jika menolak)
          </label>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Contoh: Mohon lampirkan rekap tiket dari sistem sebelum diajukan ulang."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-astra-600 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};
