import React, { useMemo, useState } from 'react';
import { Upload, Send, Loader2, Target, History, Save } from 'lucide-react';
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
import { Notice, EmptyState, ScoreBadge, StatusPill, TableSkeleton } from '../components/common/Notice';
import { Section } from '../components/common/Section';
import { EvidenceLink } from '../components/common/EvidenceLink';

const MAX_FILE_MB = 5;
const EDITABLE = [null, undefined, 'draft', 'rejected'];
// Kolom grid baris indikator (layar md ke atas)
const ROW_GRID =
  'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_5rem_minmax(0,1.5fr)_6.5rem] md:gap-4';

const StatusBadge = ({ status }) => {
  const cfg = ACTUAL_STATUS[status];
  if (!cfg) return <span className="text-[13px] text-slate-500">Belum diisi</span>;
  return <StatusPill className={cfg.badge}>{cfg.label}</StatusPill>;
};

const RiwayatPengajuan = ({ rows, loading, error, limit }) => {
  const history = useMemo(() => {
    const sorted = rows
      .filter((r) => r.actual_status && r.actual_status !== 'draft')
      .sort(
        (a, b) => new Date(b.period_start) - new Date(a.period_start) || a.indicator_code.localeCompare(b.indicator_code)
      );
    return limit ? sorted.slice(0, limit) : sorted;
  }, [rows, limit]);

  return (
    <Section
      flush
      title={limit ? 'Pengajuan terakhir' : 'Semua pengajuan'}
      description={limit ? `${limit} pengajuan terbaru dari semua periode` : 'Capaian yang sudah Anda ajukan, terbaru di atas'}
    >
      {error && <Notice type="error" className="m-4 sm:m-5">{error}</Notice>}
      {loading ? (
        <TableSkeleton cols={5} label="Memuat riwayat…" />
      ) : history.length === 0 ? (
        <EmptyState icon={History} title="Belum ada pengajuan">
          Capaian yang sudah diajukan ke supervisor akan tercatat di sini.
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th scope="col">Periode</th>
                <th scope="col">Indikator</th>
                <th scope="col" className="text-right">
                  Realisasi
                </th>
                <th scope="col" className="text-center">
                  Capaian
                </th>
                <th scope="col">Status</th>
                <th scope="col">Diajukan</th>
                <th scope="col">Catatan supervisor</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.target_id} className="row-hover">
                  <td className="whitespace-nowrap text-slate-600">{r.period_name}</td>
                  <td className="min-w-[12rem] font-medium text-slate-900">{r.indicator_name}</td>
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
                  <td className="min-w-[12rem] text-slate-600">{r.validation_note || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
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
  const dirty = Object.keys(edits).length > 0 || note !== null;

  return (
    <div className="space-y-8">
      <Section
        flush
        title={`Capaian ${selectedPeriod?.name || ''}`}
        description={
          selectedPeriod &&
          (periodOpen ? `Batas pengisian ${formatDate(selectedPeriod.end_date)}` : 'Periode ditutup, data hanya bisa dilihat')
        }
      >
        {(message || error || (rejectedCount > 0 && periodOpen)) && (
          <div className="space-y-3 border-b border-slate-200 p-4 sm:p-5">
            {message && (
              <Notice type={message.type} onDismiss={() => setMessage(null)}>
                {message.text}
              </Notice>
            )}
            {error && <Notice type="error">{error}</Notice>}
            {rejectedCount > 0 && periodOpen && (
              <Notice type="warning">
                {rejectedCount} capaian dikembalikan supervisor. Perbaiki sesuai catatannya, lalu ajukan lagi.
              </Notice>
            )}
          </div>
        )}

        {loading ? (
          <TableSkeleton cols={5} label="Memuat target Anda…" />
        ) : periodRows.length === 0 ? (
          <EmptyState icon={Target} title="Belum ada target">
            Supervisor belum menetapkan target KPI untuk Anda di periode ini.
          </EmptyState>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              persist('submitted');
            }}
          >
            {/* Satu baris per indikator: grid di layar lebar, kartu bertumpuk di HP */}
            <div
              className={`hidden border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-600 md:grid ${ROW_GRID}`}
              aria-hidden="true"
            >
              <span>Indikator</span>
              <span>Target</span>
              <span>Realisasi</span>
              <span className="text-center">Capaian</span>
              <span>Bukti</span>
              <span>Status</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {periodRows.map((r) => {
                const editable = isEditable(r);
                const value = valueOf(r);
                const preview = calculateAchievement(value, r.target_value, r.direction);
                const newFile = edits[r.target_id]?.file;
                const inputId = `real-${r.target_id}`;
                return (
                  <li key={r.target_id} className={`grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:px-5 md:items-start md:py-3.5 ${ROW_GRID}`}>
                    <div className="col-span-2 flex items-start justify-between gap-3 md:col-span-1 md:block">
                      <div>
                        <label htmlFor={inputId} className="font-medium text-slate-900">
                          {r.indicator_name}
                        </label>
                        {r.actual_status === 'rejected' && r.validation_note && (
                          <p className="mt-1 max-w-xs text-[13px] text-rose-700">Catatan supervisor: {r.validation_note}</p>
                        )}
                      </div>
                      <span className="md:hidden">
                        <StatusBadge status={r.actual_status} />
                      </span>
                    </div>

                    <div className="text-slate-600 md:pt-2">
                      <span className="block text-xs text-slate-500 md:hidden">Target</span>
                      <span className="whitespace-nowrap tabular-nums">
                        {directionSymbol(r.direction)} {formatNumber(r.target_value)} {r.unit}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs text-slate-500 md:hidden" aria-hidden="true">
                        Realisasi
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          id={inputId}
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          disabled={!editable}
                          value={value}
                          onChange={(e) => setRowEdit(r.target_id, { value: e.target.value })}
                          className="field w-full max-w-[8rem] tabular-nums"
                        />
                        <span className="text-slate-500">{r.unit}</span>
                      </div>
                    </div>

                    <div className="md:pt-2 md:text-center">
                      <span className="block text-xs text-slate-500 md:hidden">Capaian</span>
                      {r.achievement_pct !== null ? (
                        <ScoreBadge value={r.achievement_pct} color={r.status_color} />
                      ) : preview !== null ? (
                        <span title="Perkiraan. Capaian resmi dihitung setelah divalidasi supervisor.">
                          <ScoreBadge value={preview} color={getStatusByScore(preview).key} />
                          <span className="sr-only"> (perkiraan)</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">–</span>
                      )}
                    </div>

                    <div className={editable ? "col-span-2 md:col-span-1" : ""}>
                      <span className="mb-1 block text-xs text-slate-500 md:hidden">Bukti</span>
                      {editable ? (
                        <div className="flex flex-col items-start gap-1">
                          <label className="inline-flex h-9 max-w-[13rem] cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-control px-3 text-sm text-slate-600 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-astra-600 hover:border-astra-600 hover:text-astra-700">
                            <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{newFile?.name || (r.evidence_url ? 'Ganti file' : 'Lampirkan bukti')}</span>
                            <input
                              type="file"
                              className="sr-only"
                              aria-label={`Bukti untuk ${r.indicator_name}`}
                              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.docx"
                              onChange={(e) => handleFileChange(r.target_id, e)}
                            />
                          </label>
                          {r.evidence_url && !newFile && <EvidenceLink path={r.evidence_url} />}
                        </div>
                      ) : (
                        <EvidenceLink path={r.evidence_url} />
                      )}
                    </div>

                    <div className="hidden md:block md:pt-2">
                      <StatusBadge status={r.actual_status} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">
              Bukti maksimal {MAX_FILE_MB} MB (PDF, gambar, Excel, Word). Persentase sebelum validasi hanya perkiraan.
            </p>

            {editableRows.length > 0 ? (
              <>
                <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
                  <label htmlFor="note" className="label">
                    Catatan untuk supervisor <span className="font-normal text-slate-500">(opsional)</span>
                  </label>
                  <textarea
                    id="note"
                    rows={3}
                    value={noteValue}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Kondisi atau kendala selama periode ini"
                    className="field"
                  />
                </div>
                <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-b-lg border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-[13px] text-slate-500" aria-live="polite">
                    {dirty ? 'Ada perubahan yang belum disimpan.' : 'Draft bisa disimpan dulu dan diajukan nanti.'}
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button type="button" onClick={() => persist('draft')} disabled={Boolean(saving)} className="btn-secondary">
                      {saving === 'draft' ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="h-4 w-4" aria-hidden="true" />
                      )}
                      Simpan draft
                    </button>
                    <button type="submit" disabled={Boolean(saving)} className="btn-primary">
                      {saving === 'submit' ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden="true" />
                      )}
                      Ajukan ke supervisor
                    </button>
                  </div>
                </div>
              </>
            ) : (
              periodOpen && (
                <p className="border-t border-slate-200 px-4 py-4 text-sm text-slate-600 sm:px-5">
                  Semua capaian periode ini sudah diajukan. Pantau statusnya di daftar di atas.
                </p>
              )
            )}
          </form>
        )}
      </Section>

      <RiwayatPengajuan rows={rows || []} loading={loading} error={null} limit={10} />
    </div>
  );
};
