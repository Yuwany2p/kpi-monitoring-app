import React, { useMemo, useState } from 'react';
import { FileDown, Send, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { getKpiResults, getActionPlans, getMyReport, saveReport, uploadReportFile } from '../services/supabaseService';
import { buildReportContent, DEFAULT_SECTIONS } from '../lib/reportContent';
import { exportReportPdf, exportReportExcel } from '../lib/reportExport';
import { REPORT_STATUS, REVIEW_DECISIONS } from '../lib/constants';
import { formatDateTime } from '../lib/formatters';
import { Notice, LoadingBlock, StatusPill } from '../components/common/Notice';
import { ReportPreview } from '../components/laporan/ReportPreview';

const SECTION_LABELS = {
  ringkasan: 'Ringkasan capaian',
  tren: 'Grafik tren',
  kpiWarna: 'Daftar KPI merah & kuning',
  actionPlan: 'Action plan',
};

// Status yang masih boleh dikirim (ulang) oleh supervisor
const SENDABLE = [undefined, null, 'draft', 'revision'];

export const LaporanKpiPage = () => {
  const { currentUser } = useAuth();
  const { selectedPeriod, trendPeriods } = useFilter();
  const periodIds = useMemo(() => trendPeriods.map((p) => p.id), [trendPeriods]);

  const [sections, setSections] = useState(null);
  const [notes, setNotes] = useState(null);
  const [busy, setBusy] = useState(null); // 'pdf' | 'excel' | 'send'
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState(null);

  const { data, setData, loading, error } = useAsyncData(
    async () => {
      const [rows, plans, report] = await Promise.all([
        getKpiResults({ periodIds, teamId: currentUser.team_id }),
        getActionPlans(),
        getMyReport(selectedPeriod.id, currentUser.id),
      ]);
      return { rows, plans, report };
    },
    [periodIds.join(','), selectedPeriod?.id],
    { enabled: Boolean(selectedPeriod) && periodIds.length > 0 }
  );

  const [lastPeriodId, setLastPeriodId] = useState(selectedPeriod?.id);
  if (selectedPeriod?.id !== lastPeriodId) {
    setLastPeriodId(selectedPeriod?.id);
    setSections(null);
    setNotes(null);
    setMessage(null);
    setConfirming(false);
  }

  const report = data?.report || null;
  const currentSections = sections ?? report?.content?.sections ?? DEFAULT_SECTIONS;
  const currentNotes = notes ?? report?.summary ?? '';
  const canSend = SENDABLE.includes(report?.status);

  const content = useMemo(() => {
    if (!data || !selectedPeriod) return null;
    return buildReportContent({
      rows: data.rows,
      trendPeriods,
      period: selectedPeriod,
      plans: data.plans,
      teamName: currentUser.team_name,
      authorName: currentUser.full_name,
      notes: currentNotes,
      sections: currentSections,
    });
  }, [data, selectedPeriod, trendPeriods, currentUser, currentNotes, currentSections]);

  // Laporan yang sudah dikirim ditampilkan sesuai isi saat dikirim
  const previewContent = !canSend && report?.content?.staff ? report.content : content;

  const handleExport = async (type) => {
    setBusy(type);
    setMessage(null);
    try {
      if (type === 'pdf') await exportReportPdf(previewContent);
      else await exportReportExcel(previewContent);
    } catch (err) {
      setMessage({ type: 'error', text: `File belum bisa dibuat: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    setConfirming(false);
    setBusy('send');
    setMessage(null);
    try {
      let saved = await saveReport({
        id: report?.id,
        period_id: selectedPeriod.id,
        created_by: currentUser.id,
        title: `Laporan KPI ${currentUser.team_name || ''}, ${selectedPeriod.name}`.trim(),
        summary: currentNotes,
        content,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });
      let warning = null;
      try {
        const blob = await exportReportPdf(content, { download: false });
        const path = await uploadReportFile(currentUser.id, saved.id, blob);
        saved = await saveReport({ id: saved.id, file_url: path });
      } catch (err) {
        warning = `Laporan terkirim, tapi file PDF-nya gagal diunggah (${err.message}). Manajemen tetap bisa membaca laporan di aplikasi.`;
      }
      setData((prev) => ({ ...prev, report: saved }));
      setSections(null);
      setNotes(null);
      setMessage(warning ? { type: 'warning', text: warning } : { type: 'success', text: 'Laporan terkirim ke manajemen.' });
    } catch (err) {
      setMessage({ type: 'error', text: `Laporan belum terkirim: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  const handleSendClick = () => (content.pending > 0 ? setConfirming(true) : send());

  if (error) return <Notice type="error">{error}</Notice>;
  if (loading || !data || !content) return <LoadingBlock text="Menyusun laporan…" />;

  const statusCfg = report ? REPORT_STATUS[report.status] : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="no-print space-y-6 lg:col-span-5">
        <section className="card space-y-5 p-6">
          <h2 className="card-title">Pengaturan laporan</h2>

          {message && <Notice type={message.type}>{message.text}</Notice>}

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Periode</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{selectedPeriod.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tim</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{currentUser.team_name || '–'}</dd>
            </div>
          </dl>

          <fieldset disabled={!canSend}>
            <legend className="label">Isi laporan</legend>
            <div className="space-y-2">
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSections[key] !== false}
                    onChange={(e) => setSections({ ...currentSections, [key]: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-astra-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="report-notes" className="label">Catatan supervisor</label>
            <textarea
              id="report-notes"
              rows={4}
              disabled={!canSend}
              value={currentNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kondisi tim, kendala utama, dan rencana bulan depan"
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleExport('pdf')} disabled={Boolean(busy)} className="btn-secondary">
              {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Ekspor PDF
            </button>
            <button type="button" onClick={() => handleExport('excel')} disabled={Boolean(busy)} className="btn-secondary">
              {busy === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Ekspor Excel
            </button>
          </div>

          {canSend ? (
            confirming ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p>
                  {content.pending} data masih menunggu validasi dan belum masuk perhitungan. Kirim laporan sekarang
                  atau validasi dulu?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={send} className="btn-primary btn-sm">Tetap kirim</button>
                  <button onClick={() => setConfirming(false)} className="btn-secondary btn-sm">Batal</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={handleSendClick} disabled={Boolean(busy)} className="btn-primary w-full py-2.5">
                {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {report?.status === 'revision' ? 'Kirim revisi ke manajemen' : 'Kirim ke manajemen'}
              </button>
            )
          ) : (
            <p className="text-sm text-slate-600">
              Dikirim {formatDateTime(report.submitted_at)}. Status: <strong>{statusCfg?.label}</strong>.
            </p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="card-title">Feedback manajemen</h2>
          {!report?.report_reviews?.length ? (
            <p className="mt-2 text-sm text-slate-500">Belum ada feedback untuk laporan periode ini.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {report.report_reviews.map((rv) => (
                <li key={rv.id} className="border-l-2 border-astra-200 pl-4">
                  <p className="text-sm font-semibold text-slate-900">{REVIEW_DECISIONS[rv.decision]}</p>
                  <p className="mt-1 text-sm text-slate-700">{rv.feedback}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {rv.reviewer?.full_name}, {formatDateTime(rv.reviewed_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-6 sm:p-8 lg:col-span-7">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="card-title">Pratinjau laporan</h2>
          <StatusPill className={statusCfg?.badge || 'bg-slate-100 text-slate-600'}>{statusCfg?.label || 'Draft'}</StatusPill>
        </div>
        <ReportPreview content={previewContent} />
      </section>
    </div>
  );
};
