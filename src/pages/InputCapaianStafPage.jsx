import React, { useMemo, useState } from 'react';
import { UploadCloud, Send, Loader2 } from 'lucide-react';
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
  fileNameFromPath,
} from '../lib/formatters';
import { ACTUAL_STATUS } from '../lib/constants';
import { Notice, LoadingBlock, EmptyBlock, ScoreBadge } from '../components/common/Notice';
import { EvidenceLink } from '../components/common/EvidenceLink';

const MAX_FILE_MB = 5;
const EDITABLE = [null, undefined, 'draft', 'rejected'];

const StatusBadge = ({ status }) => {
  const cfg = ACTUAL_STATUS[status];
  if (!cfg) return <span className="text-[11px] text-slate-400">Belum diisi</span>;
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${cfg.badge}`}>{cfg.label}</span>;
};

// ---------------------------------------------------------------------
// Riwayat pengajuan (semua periode)
// ---------------------------------------------------------------------
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
      <h3 className="text-base font-bold text-slate-900 mb-4">
        {limit ? 'Riwayat Pengajuan Terakhir' : 'Riwayat Pengajuan'}
      </h3>
      {error && <Notice type="error">{error}</Notice>}
      {loading ? (
        <LoadingBlock text="Memuat riwayat..." />
      ) : history.length === 0 ? (
        <EmptyBlock>Belum ada pengajuan capaian.</EmptyBlock>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold">
                <th className="pb-3.5 font-medium">Periode</th>
                <th className="pb-3.5 font-medium">Indikator</th>
                <th className="pb-3.5 font-medium">Realisasi</th>
                <th className="pb-3.5 font-medium">Capaian</th>
                <th className="pb-3.5 font-medium">Status</th>
                <th className="pb-3.5 font-medium">Diajukan</th>
                <th className="pb-3.5 font-medium">Catatan supervisor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((r) => (
                <tr key={r.target_id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 font-medium text-slate-700 whitespace-nowrap">{r.period_name}</td>
                  <td className="py-3.5 font-semibold text-slate-800">{r.indicator_name}</td>
                  <td className="py-3.5 text-slate-700 whitespace-nowrap">
                    {formatNumber(r.actual_value)} {r.unit}
                  </td>
                  <td className="py-3.5">
                    <ScoreBadge value={r.achievement_pct} color={r.status_color} />
                  </td>
                  <td className="py-3.5">
                    <StatusBadge status={r.actual_status} />
                  </td>
                  <td className="py-3.5 text-slate-500 whitespace-nowrap">{formatDateTime(r.submitted_at)}</td>
                  <td className="py-3.5 text-slate-500 italic">{r.validation_note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Halaman utama
// ---------------------------------------------------------------------
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
          text: `Isi realisasi untuk semua indikator sebelum mengajukan (${missing.map((m) => m.indicator_name).join(', ')}).`,
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
            ? `Draft capaian (${candidates.length} indikator) berhasil disimpan.`
            : `Capaian (${candidates.length} indikator) berhasil diajukan kepada supervisor untuk divalidasi.`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: `Gagal menyimpan: ${err.message}` });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Form Capaian · {selectedPeriod?.name || '-'}</h2>
          {selectedPeriod && (
            <span className="text-xs text-slate-500 font-medium">
              {periodOpen ? `Batas input: ${formatDate(selectedPeriod.end_date)}` : 'Periode ditutup'}
            </span>
          )}
        </div>

        {message && <Notice type={message.type} className="mb-4">{message.text}</Notice>}
        {error && <Notice type="error" className="mb-4">{error}</Notice>}
        {!periodOpen && selectedPeriod && (
          <Notice type="info" className="mb-4">
            Periode {selectedPeriod.name} sudah ditutup, data hanya bisa dilihat.
          </Notice>
        )}
        {periodRows.some((r) => r.actual_status === 'rejected') && periodOpen && (
          <Notice type="warning" className="mb-4">
            Ada capaian yang dikembalikan supervisor. Perbaiki sesuai catatan lalu ajukan ulang.
          </Notice>
        )}

        {loading ? (
          <LoadingBlock text="Memuat target KPI Anda..." />
        ) : periodRows.length === 0 ? (
          <EmptyBlock>Supervisor belum menetapkan target KPI untuk Anda di periode ini.</EmptyBlock>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              persist('submitted');
            }}
            className="space-y-6"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 font-semibold">
                    <th className="pb-3.5 font-medium">Indikator KPI</th>
                    <th className="pb-3.5 font-medium">Target</th>
                    <th className="pb-3.5 font-medium">Realisasi</th>
                    <th className="pb-3.5 font-medium">Satuan</th>
                    <th className="pb-3.5 text-center font-medium">Capaian (otomatis)</th>
                    <th className="pb-3.5 font-medium">Bukti</th>
                    <th className="pb-3.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodRows.map((r) => {
                    const editable = isEditable(r);
                    const value = valueOf(r);
                    const preview = calculateAchievement(value, r.target_value, r.direction);
                    const previewStatus = preview !== null ? getStatusByScore(preview) : null;
                    const newFile = edits[r.target_id]?.file;
                    return (
                      <tr key={r.target_id} className="hover:bg-slate-50/60 align-top">
                        <td className="py-4 font-bold text-slate-900">
                          {r.indicator_name}
                          {r.actual_status === 'rejected' && r.validation_note && (
                            <p className="mt-1 font-medium text-[11px] text-rose-600 italic">
                              Catatan: {r.validation_note}
                            </p>
                          )}
                        </td>
                        <td className="py-4 text-slate-600 font-medium whitespace-nowrap">
                          {directionSymbol(r.direction)} {formatNumber(r.target_value)} {r.unit}
                        </td>
                        <td className="py-4">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={!editable}
                            value={value}
                            onChange={(e) => setRowEdit(r.target_id, { value: e.target.value })}
                            className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs focus:ring-2 focus:ring-astra-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </td>
                        <td className="py-4 text-slate-500">{r.unit}</td>
                        <td className="py-4 text-center">
                          {r.achievement_pct !== null ? (
                            <ScoreBadge value={r.achievement_pct} color={r.status_color} />
                          ) : previewStatus ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${previewStatus.badge}`}
                              title="Perkiraan; capaian resmi dihitung setelah divalidasi supervisor"
                            >
                              {Math.round(preview)}%
                            </span>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>
                        <td className="py-4">
                          {editable ? (
                            <div className="flex flex-col gap-1">
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-astra-500 text-slate-600 hover:text-astra-800 text-[11px] cursor-pointer transition-colors max-w-[200px]">
                                <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">
                                  {newFile?.name || (r.evidence_url ? 'Ganti bukti' : 'Lampirkan bukti')}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.docx"
                                  onChange={(e) => handleFileChange(r.target_id, e)}
                                />
                              </label>
                              {r.evidence_url && !newFile && <EvidenceLink path={r.evidence_url} />}
                            </div>
                          ) : (
                            <EvidenceLink path={r.evidence_url} label={fileNameFromPath(r.evidence_url)} />
                          )}
                        </td>
                        <td className="py-4">
                          <StatusBadge status={r.actual_status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan untuk supervisor (opsional)
              </label>
              <textarea
                rows={3}
                disabled={editableRows.length === 0}
                value={noteValue}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Jelaskan kondisi atau kendala yang dihadapi selama periode ini..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            {editableRows.length > 0 ? (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => persist('draft')}
                  disabled={Boolean(saving)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {saving === 'draft' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Draft
                </button>
                <button
                  type="submit"
                  disabled={Boolean(saving)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-astra-800 hover:bg-astra-900 disabled:opacity-60 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {saving === 'submit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Ajukan ke Supervisor
                </button>
              </div>
            ) : (
              periodOpen && (
                <Notice type="success">
                  Semua capaian periode ini sudah diajukan. Pantau statusnya di riwayat pengajuan.
                </Notice>
              )
            )}
          </form>
        )}
      </div>

      <RiwayatPengajuan rows={rows || []} loading={loading} error={null} limit={10} />
    </div>
  );
};
