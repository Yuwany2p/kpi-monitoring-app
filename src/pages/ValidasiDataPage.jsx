import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Inbox, Loader2, Paperclip } from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { getKpiResults, validateActual } from '../services/supabaseService';
import { calculateAchievement, getStatusByScore, formatNumber, formatDateTime } from '../lib/formatters';
import { Notice, LoadingBlock, EmptyState, ScoreBadge, TableSkeleton } from '../components/common/Notice';
import { EvidenceLink } from '../components/common/EvidenceLink';
import { refreshSidebarBadges } from '../lib/constants';
import { Dialog } from '../components/common/Dialog';
import { Tabs } from '../components/common/Tabs';

const STATUS_TABS = [
  { key: 'submitted', label: 'Menunggu' },
  { key: 'approved', label: 'Valid' },
  { key: 'rejected', label: 'Ditolak' },
];

const Flag = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-slate-600">
    <Icon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
    {children}
  </span>
);

export const ValidasiDataPage = () => {
  const { selectedPeriod } = useFilter();
  const [activeTab, setActiveTab] = useState('submitted');
  const [filterStaff, setFilterStaff] = useState('ALL');
  const [filterIndicator, setFilterIndicator] = useState('ALL');
  const [selected, setSelected] = useState(new Set());
  const [rejecting, setRejecting] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectError, setRejectError] = useState(null);
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
          const achievement = r.achievement_pct ?? calculateAchievement(r.actual_value, r.target_value, r.direction) ?? 0;
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

  const tabs = STATUS_TABS.map((t) => ({ ...t, count: items.filter((i) => i.actual_status === t.key).length }));
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
  const allSelected = filteredItems.length > 0 && filteredItems.every((i) => selected.has(i.actual_id));

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
      await reload();
      refreshSidebarBadges();
      showMessage(
        'success',
        status === 'approved'
          ? `${targets.length} capaian disetujui. Skor dan status warna sudah dihitung.`
          : `Capaian ${targets[0].staff_name} (${targets[0].indicator_name}) dikembalikan ke staf.`
      );
      return true;
    } catch (err) {
      showMessage('error', `Validasi belum tersimpan: ${err.message}`);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (item) => {
    setRejectNote('');
    setRejectError(null);
    setRejecting(item);
  };

  const confirmReject = async (e) => {
    e.preventDefault();
    if (!rejectNote.trim()) {
      setRejectError('Tulis alasan penolakan supaya staf tahu apa yang perlu diperbaiki.');
      return;
    }
    const ok = await runValidation([rejecting], 'rejected', rejectNote.trim());
    if (ok) setRejecting(null);
  };

  if (!selectedPeriod) return <LoadingBlock />;

  return (
    <div className="space-y-5">
      <Tabs
        tabs={tabs}
        active={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setSelected(new Set());
        }}
        label="Status data capaian"
        idPrefix="val"
      />

      {message && (
        <Notice type={message.type} onDismiss={() => setMessage(null)}>
          {message.text}
        </Notice>
      )}
      {error && <Notice type="error">{error}</Notice>}

      <section className="card" role="tabpanel" id={`val-panel-${activeTab}`} aria-labelledby={`val-${activeTab}`}>
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <label htmlFor="val-staff" className="sr-only">
              Filter staf
            </label>
            <select id="val-staff" value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="field h-9 sm:w-44">
              <option value="ALL">Semua staf</option>
              {staffOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label htmlFor="val-indicator" className="sr-only">
              Filter indikator
            </label>
            <select
              id="val-indicator"
              value={filterIndicator}
              onChange={(e) => setFilterIndicator(e.target.value)}
              className="field h-9 sm:w-52"
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
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-[13px] text-slate-500" aria-live="polite">
                {selectedVisible.length} dipilih
              </span>
              <button
                onClick={() => runValidation(selectedVisible, 'approved')}
                disabled={selectedVisible.length === 0 || Boolean(busyId)}
                className="btn-primary"
              >
                {busyId === 'batch' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                Setujui yang dipilih
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton cols={6} label="Memuat pengajuan…" />
        ) : filteredItems.length === 0 ? (
          <EmptyState icon={Inbox} title={isPendingTab ? 'Tidak ada yang menunggu' : 'Belum ada data'}>
            {isPendingTab
              ? `Semua capaian yang diajukan di ${selectedPeriod.name} sudah divalidasi.`
              : `Belum ada capaian berstatus ${activeTab === 'approved' ? 'valid' : 'ditolak'} di ${selectedPeriod.name}.`}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  {isPendingTab && (
                    <th scope="col" className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua di daftar ini"
                        checked={allSelected}
                        onChange={(e) => setSelected(e.target.checked ? new Set(filteredItems.map((i) => i.actual_id)) : new Set())}
                        className="h-4 w-4 cursor-pointer rounded border-control text-astra-600 focus:ring-astra-600"
                      />
                    </th>
                  )}
                  <th scope="col">Staf</th>
                  <th scope="col">Indikator</th>
                  <th scope="col" className="text-right">
                    Target
                  </th>
                  <th scope="col" className="text-right">
                    Realisasi
                  </th>
                  <th scope="col" className="text-center">
                    Capaian
                  </th>
                  <th scope="col">Bukti</th>
                  <th scope="col">{isPendingTab ? 'Perlu dicek' : 'Catatan'}</th>
                  <th scope="col" className="text-right">
                    {isPendingTab ? <span className="sr-only">Aksi</span> : 'Divalidasi'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.actual_id} className={`row-hover align-top ${selected.has(item.actual_id) ? 'bg-astra-50/50' : ''}`}>
                    {isPendingTab && (
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${item.staff_name}, ${item.indicator_name}`}
                          checked={selected.has(item.actual_id)}
                          onChange={() => toggle(item.actual_id)}
                          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-control text-astra-600 focus:ring-astra-600"
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap font-medium text-slate-900">{item.staff_name}</td>
                    <td className="min-w-[12rem]">
                      {item.indicator_name}
                      {item.notes && <p className="mt-0.5 max-w-xs text-[13px] text-slate-500">“{item.notes}”</p>}
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums text-slate-600">
                      {formatNumber(item.target_value)} {item.unit}
                    </td>
                    <td className="whitespace-nowrap text-right font-medium tabular-nums text-slate-900">
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
                          {item.largeDeviation && <Flag icon={AlertTriangle}>Selisih besar</Flag>}
                          {!item.evidence_url && <Flag icon={Paperclip}>Tanpa bukti</Flag>}
                          {!item.largeDeviation && item.evidence_url && <span className="text-slate-300">–</span>}
                        </div>
                      ) : (
                        <span className="text-slate-600">{item.validation_note || '–'}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {isPendingTab ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => runValidation([item], 'approved')}
                            disabled={Boolean(busyId)}
                            className="btn-secondary btn-sm"
                            aria-label={`Setujui ${item.staff_name}, ${item.indicator_name}`}
                          >
                            {busyId === item.actual_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            Setujui
                          </button>
                          <button
                            onClick={() => openReject(item)}
                            disabled={Boolean(busyId)}
                            className="btn-ghost btn-sm text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            aria-label={`Tolak ${item.staff_name}, ${item.indicator_name}`}
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-[13px] text-slate-500">{formatDateTime(item.validated_at)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredItems.length > 0 && (
          <p className="border-t border-slate-200 px-4 py-3 text-[13px] text-slate-500 sm:px-5">
            {filteredItems.length} dari {items.filter((i) => i.actual_status === activeTab).length} data ditampilkan
          </p>
        )}
      </section>

      <Dialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Tolak capaian"
        description={rejecting ? `${rejecting.staff_name}, ${rejecting.indicator_name}` : undefined}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setRejecting(null)} className="btn-secondary">
              Batal
            </button>
            <button type="submit" form="reject-form" disabled={Boolean(busyId)} className="btn-danger-outline">
              {busyId && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Kembalikan ke staf
            </button>
          </>
        }
      >
        <form id="reject-form" onSubmit={confirmReject} className="space-y-3">
          {rejecting && (
            <dl className="inset-panel grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-[13px] text-slate-500">Target</dt>
                <dd className="font-medium tabular-nums">
                  {formatNumber(rejecting.target_value)} {rejecting.unit}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-slate-500">Realisasi</dt>
                <dd className="font-medium tabular-nums">
                  {formatNumber(rejecting.actual_value)} {rejecting.unit}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-slate-500">Capaian</dt>
                <dd>
                  <ScoreBadge value={rejecting.achievement} color={rejecting.color} />
                </dd>
              </div>
            </dl>
          )}
          <div>
            <label htmlFor="reject-note" className="label">
              Alasan penolakan
            </label>
            <textarea
              id="reject-note"
              rows={4}
              aria-required="true"
              autoFocus
              value={rejectNote}
              onChange={(e) => {
                setRejectNote(e.target.value);
                if (rejectError) setRejectError(null);
              }}
              aria-invalid={Boolean(rejectError)}
              aria-describedby="reject-note-hint"
              placeholder="Contoh: lampirkan rekap tiket dari sistem sebelum diajukan ulang."
              className={`field ${rejectError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
            />
            <p id="reject-note-hint" className={`mt-1 text-xs ${rejectError ? 'text-rose-700' : 'text-slate-500'}`}>
              {rejectError || 'Wajib diisi. Catatan ini dikirim ke staf bersama datanya.'}
            </p>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
