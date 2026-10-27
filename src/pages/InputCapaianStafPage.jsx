import React, { useMemo, useState } from 'react';
import { Upload, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { getKpiResults, saveActual, uploadEvidence } from '../services/supabaseService';
import {
  calculateAchievement,
  getStatusByScore,
  directionSymbol,
  formatNumber,
  formatDate,
  formatDateTime,
} from '../lib/formatters';
import { ACTUAL_STATUS } from '../lib/constants';
import { Notice, LoadingBlock, EmptyBlock, ScoreBadge, StatusPill } from '../components/common/Notice';
import { EvidenceLink } from '../components/common/EvidenceLink';

const MAX_FILE_MB = 5;
const EDITABLE = [null, undefined, 'draft', 'rejected'];

const StatusBadge = ({ status }) => {
  const cfg = ACTUAL_STATUS[status];
  if (!cfg) return <span className="text-sm text-slate-400">Belum diisi</span>;
  return <StatusPill className={cfg.badge}>{cfg.label}</StatusPill>;
};

const RiwayatPengajuan = ({ rows, loading, error, limit }) => {
  const history = useMemo(() => {
    const sorted = rows
      .filter((r) => r.actual_status && r.actual_status !== 'draft')
      .sort(
        (a, b) =>
          new Date(b.period_start) - new Date(a.period_start) || a.indicator_code.localeCompare(b.indicator_code)
      );
    return limit ? sorted.slice(0, limit) : sorted;
  }, [rows, limit]);

  return (
    <section className="card p-6">
      <h2 className="card-title">{limit ? 'Pengajuan terakhir' : 'Semua pengajuan'}</h2>
      {error && <Notice type="error" className="mt-4">{error}</Notice>}
      {loading ? (
        <LoadingBlock text="Memuat riwayat…" />
      ) : history.length === 0 ? (
        <EmptyBlock>Belum ada capaian yang diajukan.</EmptyBlock>
      ) : (
        <div className="-mx-2 mt-4 overflow-x-auto px-2">
          <table className="table-base">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Indikator</th>
                <th className="text-right">Realisasi</th>
                <th className="text-center">Capaian</th>
                <th>Status</th>
                <th>Diajukan</th>
                <th>Catatan supervisor</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.target_id}>
                  <td className="whitespace-nowrap text-slate-600">{r.period_name}</td>
                  <td className="font-medium text-slate-900">{r.indicator_name}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {formatNumber(r.actual_value)} {r.unit}
                  </td>
                  <td className="text-center">
                    <ScoreBadge value={r.achievement_pct} color={r.status_color} />
                  </td>
                  <td>
                    <StatusBadge status={r.actual_status} />
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{formatDateTime(r.submitted_at)}</td>
                  <td className="text-slate-600">{r.validation_note || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export const InputCapaianStafPage = ({ historyOnly = false }) => {
  const { currentUser } = useAuth();
  const { selectedPeriod } = useFilter();

  // { [targetId]: { value, file } }
  const [edits, setEdits] = useState({});
  const [note, setNote] = useState(null);
  const [saving, setSaving] = useState(null); // 'draft' | 'submit' | null
  const [message, setMessage] = useState(null);

  const { data: rows, loading, error, reload } = useAsyncData(
    () => getKpiResults({ staffId: currentUser.id }),
    [currentUser.id],
    { initialData: [] }
  );

  if (historyOnly) return <RiwayatPengajuan rows={rows || []} loading={loading} error={error} />;

  const periodRows = (rows || []).filter((r) => r.period_id === selectedPeriod?.id);
  const periodOpen = selectedPeriod?.status === 'open';
  const isEditable = (r) => periodOpen && EDITABLE.includes(r.actual_status);
  const editableRows = periodRows.filter(isEditable);

  const valueOf = (r) => edits[r.target_id]?.value ?? (r.actual_value ?? '');
  const noteValue = note ?? (periodRows.find((r) => r.notes)?.notes || '');

  const setRowEdit = (targetId, patch) =>
    setEdits((prev) => ({ ...prev, [targetId]: { ...(prev[targetId] || {}), ...patch } }));

  const handleFileChange = (targetId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setMessage({ type: 'error', text: `Ukuran file maksimal ${MAX_FILE_MB} MB.` });
      return;
    }
    setRowEdit(targetId, { file });
  };

  const persist = async (status) => {
    setMessage(null);
    const candidates = editableRows.filter((r) => valueOf(r) !== '' && valueOf(r) !== null);

    if (status === 'submitted') {
      const missing = editableRows.filter((r) => valueOf(r) === '' || valueOf(r) === null);
      if (missing.length) {
        setMessage({
          type: 'error',
          text: `Realisasi belum diisi: ${missing.map((m) => m.indicator_name).join(', ')}.`,
        });
        return;
      }
    }
    if (!candidates.length) {
      setMessage({ type: 'info', text: 'Belum ada realisasi yang diisi.' });
      return;
    }
    if (candidates.some((r) => Number(valueOf(r)) < 0 || Number.isNaN(Number(valueOf(r))))) {
      setMessage({ type: 'error', text: 'Nilai realisasi tidak valid.' });
      return;
    }

    setSaving(status === 'draft' ? 'draft' : 'submit');
    try {
      for (const r of candidates) {
        const file = edits[r.target_id]?.file;
        const evidencePath = file ? await uploadEvidence(currentUser.id, file) : r.evidence_url;
        await saveActual({
          actualId: r.actual_id,
          targetId: r.target_id,
          actualValue: Number(valueOf(r)),
          notes: noteValue,
          evidenceUrl: evidencePath,
          status,
        });
      }
      setEdits({});
      setNote(null);
      await reload();
      setMessage({
        type: 'success',
        text:
          status === 'draft'
            ? `Draft ${candidates.length} indikator tersimpan.`
            : `${candidates.length} capaian diajukan ke supervisor.`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: `Capaian belum tersimpan: ${err.message}` });
    } finally {
      setSaving(null);
    }
  };


  const rejectedCount = periodRows.filter((r) => r.actual_status === 'rejected').length;

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="card-title">Capaian {selectedPeriod?.name || ''}</h2>
          {selectedPeriod && (
            <span className="text-sm text-slate-500">
              {periodOpen ? `Batas pengisian ${formatDate(selectedPeriod.end_date)}` : 'Periode ditutup, data hanya bisa dilihat'}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-3 empty:hidden">
          {message && <Notice type={message.type}>{message.text}</Notice>}
          {error && <Notice type="error">{error}</Notice>}
          {rejectedCount > 0 && periodOpen && (
            <Notice type="warning">
              {rejectedCount} capaian dikembalikan supervisor. Perbaiki sesuai catatan di bawah, lalu ajukan lagi.
            </Notice>
          )}
        </div>

        {loading ? (
          <LoadingBlock text="Memuat target Anda…" />
        ) : periodRows.length === 0 ? (
          <EmptyBlock>Supervisor belum menetapkan target KPI untuk Anda di periode ini.</EmptyBlock>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              persist('submitted');
            }}
          >
            <div className="-mx-2 mt-5 overflow-x-auto px-2">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Indikator</th>
                    <th>Target</th>
                    <th>Realisasi</th>
                    <th className="text-center">Capaian</th>
                    <th>Bukti</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {periodRows.map((r) => {
                    const editable = isEditable(r);
                    const value = valueOf(r);
                    const preview = calculateAchievement(value, r.target_value, r.direction);
                    const newFile = edits[r.target_id]?.file;
                    const inputId = `real-${r.target_id}`;
                    return (
                      <tr key={r.target_id} className="align-top">
                        <td>
                          <label htmlFor={inputId} className="font-medium text-slate-900">{r.indicator_name}</label>
                          {r.actual_status === 'rejected' && r.validation_note && (
                            <p className="mt-1 max-w-xs text-sm text-rose-700">Catatan: {r.validation_note}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-slate-600">
                          {directionSymbol(r.direction)} {formatNumber(r.target_value)} {r.unit}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <input
                              id={inputId}
                              type="number"
                              min="0"
                              step="any"
                              disabled={!editable}
                              value={value}
                              onChange={(e) => setRowEdit(r.target_id, { value: e.target.value })}
                              className="field w-28 tabular-nums"
                            />
                            <span className="text-slate-500">{r.unit}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          {r.achievement_pct !== null ? (
                            <ScoreBadge value={r.achievement_pct} color={r.status_color} />
                          ) : preview !== null ? (
                            <span title="Perkiraan. Capaian resmi dihitung setelah divalidasi supervisor.">
                              <ScoreBadge value={preview} color={getStatusByScore(preview).key} />
                            </span>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>
                        <td>
                          {editable ? (
                            <div className="flex flex-col items-start gap-1">
                              <label className="inline-flex max-w-[200px] cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-astra-600 hover:text-astra-700 focus-within:outline focus-within:outline-2 focus-within:outline-astra-600">
                                <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="truncate">
                                  {newFile?.name || (r.evidence_url ? 'Ganti file' : 'Lampirkan')}
                                </span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.docx"
                                  onChange={(e) => handleFileChange(r.target_id, e)}
                                />
                              </label>
                              {r.evidence_url && !newFile && <EvidenceLink path={r.evidence_url} />}
                            </div>
                          ) : (
                            <EvidenceLink path={r.evidence_url} />
                          )}
                        </td>
                        <td>
                          <StatusBadge status={r.actual_status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Bukti maksimal {MAX_FILE_MB} MB (PDF, gambar, Excel, Word). Persentase capaian sebelum validasi hanya perkiraan.
            </p>

            {editableRows.length > 0 ? (
              <>
                <div className="mt-6">
                  <label htmlFor="note" className="label">Catatan untuk supervisor (opsional)</label>
                  <textarea
                    id="note"
                    rows={3}
                    value={noteValue}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Kondisi atau kendala selama periode ini"
                    className="field"
                  />
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => persist('draft')} disabled={Boolean(saving)} className="btn-secondary">
                    {saving === 'draft' && <Loader2 className="h-4 w-4 animate-spin" />}
                    Simpan draft
                  </button>
                  <button type="submit" disabled={Boolean(saving)} className="btn-primary">
                    {saving === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Ajukan ke supervisor
                  </button>
                </div>
              </>
            ) : (
              periodOpen && (
                <p className="mt-5 text-sm text-slate-600">
                  Semua capaian periode ini sudah diajukan. Statusnya bisa dipantau di tabel di atas.
                </p>
              )
            )}
          </form>
        )}
      </section>

      <RiwayatPengajuan rows={rows || []} loading={loading} error={null} limit={10} />
    </div>
  );
};
