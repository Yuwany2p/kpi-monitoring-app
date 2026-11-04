import React, { useMemo, useState } from 'react';
import { FileDown, Send, FileSpreadsheet, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { getKpiResults, getActionPlans, getMyReport, saveReport, uploadReportFile } from '../services/supabaseService';
import { buildReportContent, DEFAULT_SECTIONS } from '../lib/reportContent';
import { exportReportPdf, exportReportExcel } from '../lib/reportExport';
import { REPORT_STATUS } from '../lib/constants';
import { formatDateTime } from '../lib/formatters';
import { Notice, LoadingBlock, StatusPill, EmptyState } from '../components/common/Notice';
import { Section } from '../components/common/Section';
import { Dialog } from '../components/common/Dialog';
import { ReportPreview } from '../components/laporan/ReportPreview';
import { ReviewHistory } from '../components/laporan/ReviewHistory';

const SECTION_LABELS = {
  ringkasan: 'Ringkasan capaian',
  tren: 'Grafik tren',
  kpiWarna: 'Daftar KPI merah dan kuning',
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
  const sendLabel = report?.status === 'revision' ? 'Kirim revisi ke manajemen' : 'Kirim ke manajemen';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="no-print space-y-6 lg:col-span-5">
        <section className="card" aria-labelledby="report-settings-title">
          <div className="card-header">
            <div>
              <h2 id="report-settings-title" className="section-title">
                Pengaturan laporan
              </h2>
              <p className="section-desc">
                {currentUser.team_name || '–'}, {selectedPeriod.name}
              </p>
            </div>
            <StatusPill className={statusCfg?.badge || 'bg-slate-100 text-slate-600'}>{statusCfg?.label || 'Belum dikirim'}</StatusPill>
          </div>

          <div className="card-body space-y-5">
            {message && (
              <Notice type={message.type} onDismiss={() => setMessage(null)}>
                {message.text}
              </Notice>
            )}

            <fieldset disabled={!canSend}>
              <legend className="label">Bagian yang dimuat</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(SECTION_LABELS).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 has-[:checked]:border-astra-200 has-[:checked]:bg-astra-50/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70"
                  >
                    <input
                      type="checkbox"
                      checked={currentSections[key] !== false}
                      onChange={(e) => setSections({ ...currentSections, [key]: e.target.checked })}
                      className="h-4 w-4 rounded border-control text-astra-600 focus:ring-astra-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="report-notes" className="label">
                Catatan supervisor
              </label>
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
          </div>

          <div className="space-y-3 border-t border-slate-200 px-4 py-4 sm:px-5">
            {canSend ? (
              <button type="button" onClick={handleSendClick} disabled={Boolean(busy)} className="btn-primary btn-lg w-full">
                {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                {sendLabel}
              </button>
            ) : (
              <p className="text-sm text-slate-600">
                Dikirim {formatDateTime(report.submitted_at)}. Laporan dikunci sampai manajemen meminta revisi.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
              <span className="mr-1 text-[13px] text-slate-500">Unduh salinan:</span>
              <button type="button" onClick={() => handleExport('pdf')} disabled={Boolean(busy)} className="btn-ghost btn-sm">
                {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}
                PDF
              </button>
              <button type="button" onClick={() => handleExport('excel')} disabled={Boolean(busy)} className="btn-ghost btn-sm">
                {busy === 'excel' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                )}
                Excel
              </button>
            </div>
          </div>
        </section>

        <Section title="Feedback manajemen">
          {!report?.report_reviews?.length ? (
            <EmptyState compact icon={MessageSquare}>
              Belum ada feedback untuk laporan periode ini.
            </EmptyState>
          ) : (
            <ReviewHistory reviews={report.report_reviews} />
          )}
        </Section>
      </div>

      <Section className="lg:col-span-7" title="Pratinjau laporan" description="Tampilan ini yang diterima manajemen">
        <div className="sm:px-2 sm:py-2">
          <ReportPreview content={previewContent} />
        </div>
      </Section>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Kirim laporan sekarang?"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setConfirming(false)} className="btn-secondary">
              Validasi dulu
            </button>
            <button type="button" onClick={send} className="btn-primary">
              Tetap kirim
            </button>
          </>
        }
      >
        <p className="text-slate-600">
          {content.pending} data masih menunggu validasi dan belum masuk perhitungan skor. Laporan yang sudah dikirim
          tidak bisa diubah sampai manajemen meminta revisi.
        </p>
      </Dialog>
    </div>
  );
};
