import React, { useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { getKpiResults, validateActual } from '../services/supabaseService';
import { calculateAchievement, getStatusByScore, formatNumber, formatDateTime } from '../lib/formatters';
import { Notice, LoadingBlock, EmptyBlock, ScoreBadge } from '../components/common/Notice';
import { EvidenceLink } from '../components/common/EvidenceLink';

const TABS = [
  { key: 'submitted', label: 'Menunggu' },
  { key: 'approved', label: 'Valid' },
  { key: 'rejected', label: 'Ditolak' },
];

const Flag = ({ children, tone = 'amber' }) => (
  <span
    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${
      tone === 'amber' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'
    }`}
  >
    {tone === 'amber' && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
    {children}
  </span>
);

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

  const showMessage = (type, text) => {
    setMessage({ type, text });
    if (type !== 'error') setTimeout(() => setMessage(null), 5000);
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
      showMessage(
        'success',
        status === 'approved'
          ? `${targets.length} capaian disetujui. Skor dan status warna sudah dihitung.`
          : `Capaian ${targets[0].staff_name} (${targets[0].indicator_name}) dikembalikan ke staf.`
      );
    } catch (err) {
      showMessage('error', `Validasi belum tersimpan: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = (item) => {
    if (!rejectNote.trim()) {
      showMessage('error', 'Tulis catatan penolakan di kolom bawah tabel agar staf tahu apa yang perlu diperbaiki.');
      document.getElementById('reject-note')?.focus();
      return;
    }
    runValidation([item], 'rejected', rejectNote.trim());
  };

  if (!selectedPeriod) return <LoadingBlock />;

  return (
    <section className="card p-6">
      <div role="tablist" aria-label="Status data" className="flex gap-6 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSelected(new Set());
            }}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-astra-600 text-astra-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label} ({counts[tab.key] || 0})
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 empty:hidden">
        {message && <Notice type={message.type}>{message.text}</Notice>}
        {error && <Notice type="error">{error}</Notice>}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filter staf" value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="field w-auto">
            <option value="ALL">Semua staf</option>
            {staffOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter indikator"
            value={filterIndicator}
            onChange={(e) => setFilterIndicator(e.target.value)}
            className="field w-auto"
          >
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
            <span className="text-sm text-slate-500">{selectedVisible.length} dipilih</span>
            <button
              onClick={() => runValidation(selectedVisible, 'approved')}
              disabled={selectedVisible.length === 0 || Boolean(busyId)}
              className="btn-success"
            >
              {busyId === 'batch' && <Loader2 className="h-4 w-4 animate-spin" />}
              Setujui yang dipilih
            </button>
          </div>
        )}
      </div>

      <div className="-mx-2 mt-4 overflow-x-auto px-2">
        <table className="table-base">
          <thead>
            <tr>
              {isPendingTab && (
                <th className="w-8">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua"
                    checked={filteredItems.length > 0 && filteredItems.every((i) => selected.has(i.actual_id))}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(filteredItems.map((i) => i.actual_id)) : new Set())
                    }
                    className="h-4 w-4 rounded border-slate-300 text-astra-600 cursor-pointer"
                  />
                </th>
              )}
              <th>Staf</th>
              <th>Indikator</th>
              <th className="text-right">Target</th>
              <th className="text-right">Realisasi</th>
              <th className="text-center">Capaian</th>
              <th>Bukti</th>
              <th>{isPendingTab ? 'Perlu dicek' : 'Catatan'}</th>
              <th className="text-right">{isPendingTab ? 'Aksi' : 'Divalidasi'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9}>
                  <LoadingBlock text="Memuat pengajuan…" />
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyBlock>
                    {isPendingTab
                      ? `Tidak ada capaian yang menunggu validasi di ${selectedPeriod.name}.`
                      : 'Belum ada data di tab ini.'}
                  </EmptyBlock>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.actual_id} className="align-top">
                  {isPendingTab && (
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${item.staff_name} ${item.indicator_name}`}
                        checked={selected.has(item.actual_id)}
                        onChange={() => toggle(item.actual_id)}
                        className="h-4 w-4 rounded border-slate-300 text-astra-600 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="font-semibold text-slate-900">{item.staff_name}</td>
                  <td>
                    {item.indicator_name}
                    {item.notes && <p className="mt-0.5 max-w-xs text-sm text-slate-500">“{item.notes}”</p>}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums text-slate-600">
                    {formatNumber(item.target_value)} {item.unit}
                  </td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums">
                    {formatNumber(item.actual_value)} {item.unit}
                  </td>
                  <td className="text-center">
                    <ScoreBadge value={item.achievement} color={item.color} />
                  </td>
                  <td>
                    <EvidenceLink path={item.evidence_url} />
                  </td>
                  <td>
                    {isPendingTab ? (
                      <div className="flex flex-col items-start gap-1">
                        {item.largeDeviation && <Flag>Selisih besar</Flag>}
                        {!item.evidence_url && <Flag tone="slate">Tanpa bukti</Flag>}
                      </div>
                    ) : (
                      <span className="text-slate-600">{item.validation_note || '–'}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    {isPendingTab ? (
                      <>
                        <button
                          onClick={() => runValidation([item], 'approved')}
                          disabled={Boolean(busyId)}
                          className="btn-success btn-sm"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          disabled={Boolean(busyId)}
                          className="btn-danger-outline btn-sm ml-2"
                        >
                          Tolak
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-slate-500">{formatDateTime(item.validated_at)}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isPendingTab && (
        <div className="mt-6">
          <label htmlFor="reject-note" className="label">Catatan penolakan (wajib jika menolak)</label>
          <textarea
            id="reject-note"
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Contoh: Lampirkan rekap tiket dari sistem sebelum diajukan ulang."
            className="field"
          />
        </div>
      )}
    </section>
  );
};
