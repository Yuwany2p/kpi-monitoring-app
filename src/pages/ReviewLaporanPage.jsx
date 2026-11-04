import React, { useState } from 'react';
import { FileDown, Loader2, Inbox, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  getReportsForReview,
  submitReportReview,
  getSignedUrl,
  getKpiResults,
  getActionPlans,
} from '../services/supabaseService';
import { buildReportContent, isContentEmpty } from '../lib/reportContent';
import { exportReportPdf } from '../lib/reportExport';
import { REPORT_STATUS, refreshSidebarBadges } from '../lib/constants';
import { formatDateTime } from '../lib/formatters';
import { Notice, LoadingBlock, EmptyState, StatusPill, TableSkeleton } from '../components/common/Notice';
import { Section } from '../components/common/Section';
import { ReviewHistory } from '../components/laporan/ReviewHistory';
import { ReportPreview } from '../components/laporan/ReportPreview';

const DECISION_OPTIONS = [
  { key: 'approved', label: 'Setujui', hint: 'Laporan diterima apa adanya' },
  { key: 'revision', label: 'Minta revisi', hint: 'Supervisor memperbaiki lalu mengirim ulang' },
  { key: 'special_action', label: 'Tindak lanjut khusus', hint: 'Tambahan sumber daya atau revisi target' },
];

const FEEDBACK_PLACEHOLDER = {
  approved: 'Contoh: laporan jelas, pantau terus progres KPI yang masih merah.',
  revision: 'Bagian mana yang perlu diperbaiki?',
  special_action: 'Tindak lanjut apa yang ditetapkan? Misalnya tambahan staf atau target baru.',
};

/**
 * Laporan lama (misalnya dari seed) bisa belum punya isi tersimpan;
 * isinya disusun ulang dari data KPI periode tersebut.
 */
const resolveContent = async (report, periods) => {
  if (!isContentEmpty(report.content)) return report.content;
  const idx = periods.findIndex((p) => p.id === report.period_id);
  const period = periods[idx];
  if (!period) return null;
  const trendPeriods = periods.slice(Math.max(0, idx - 5), idx + 1);
  const [rows, plans] = await Promise.all([
    getKpiResults({ periodIds: trendPeriods.map((p) => p.id), teamId: report.author?.team_id }),
    getActionPlans(),
  ]);
  return buildReportContent({
    rows,
    trendPeriods,
    period,
    plans: plans.filter((p) => rows.some((r) => r.staff_id === p.staff_id)),
    teamName: report.author?.teams?.name || '–',
    authorName: report.author?.full_name || '–',
    notes: report.summary || '',
  });
};

export const ReviewLaporanPage = () => {
  const { currentUser } = useAuth();
  const { periods } = useFilter();
  const [selectedId, setSelectedId] = useState(null);
  const [decision, setDecision] = useState('approved');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  const reportsQuery = useAsyncData(() => getReportsForReview(), [], { initialData: [] });
  const reports = reportsQuery.data || [];
  const selectedReport = reports.find((r) => r.id === selectedId) || reports[0] || null;

  const contentQuery = useAsyncData(
    () => resolveContent(selectedReport, periods),
    [selectedReport?.id, periods.length],
    { enabled: Boolean(selectedReport) && periods.length > 0 }
  );
  const content = contentQuery.data;

  const handleSelect = (rep) => {
    setSelectedId(rep.id);
    setDecision('approved');
    setFeedback('');
    setMessage(null);
  };

  const handleDownload = async () => {
    setBusy('pdf');
    try {
      if (selectedReport.file_url) {
        const url = await getSignedUrl('reports', selectedReport.file_url);
        window.open(url, '_blank', 'noopener');
      } else if (content) {
        await exportReportPdf(content);
      }
    } catch (err) {
      setMessage({ type: 'error', text: `PDF belum bisa diunduh: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setBusy('review');
    setMessage(null);
    try {
      await submitReportReview({
        reportId: selectedReport.id,
        decision,
        feedback: feedback.trim(),
        reviewerId: currentUser.id,
      });
      await reportsQuery.reload();
      refreshSidebarBadges();
      setFeedback('');
      setMessage({ type: 'success', text: 'Keputusan terkirim ke supervisor.' });
      // Form hilang setelah terkirim; bawa pengguna ke pesan konfirmasi di atas
      window.scrollTo({ top: 0 });
    } catch (err) {
      setMessage({ type: 'error', text: `Keputusan belum terkirim: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  const waiting = reports.filter((r) => r.status === 'submitted').length;
  const canReview = selectedReport?.status === 'submitted';
  const selectedCfg = selectedReport ? REPORT_STATUS[selectedReport.status] : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Section
        flush
        className="lg:col-span-4 lg:self-start"
        title="Laporan masuk"
        description={waiting > 0 ? `${waiting} menunggu keputusan Anda` : 'Tidak ada yang menunggu keputusan'}
      >
        {reportsQuery.error && <Notice type="error" className="m-4 sm:m-5">{reportsQuery.error}</Notice>}

        {reportsQuery.loading ? (
          <TableSkeleton rows={3} cols={2} label="Memuat laporan…" />
        ) : reports.length === 0 ? (
          <EmptyState icon={Inbox} title="Belum ada laporan">
            Laporan muncul di sini setelah supervisor mengirimnya.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reports.map((rep) => {
              const isSelected = selectedReport?.id === rep.id;
              const cfg = REPORT_STATUS[rep.status];
              return (
                <li key={rep.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(rep)}
                    aria-pressed={isSelected}
                    className={`relative flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:-outline-offset-2 sm:px-5 ${
                      isSelected
                        ? 'bg-astra-50 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-astra-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {rep.author?.teams?.name || rep.title}
                      </span>
                      <span className="block text-[13px] text-slate-500">
                        {rep.periods?.name}, {rep.author?.full_name}
                      </span>
                    </span>
                    <StatusPill className={cfg?.badge}>{cfg?.label}</StatusPill>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div className="space-y-6 lg:col-span-8">
        {message && (
          <Notice type={message.type} onDismiss={() => setMessage(null)}>
            {message.text}
          </Notice>
        )}

        {!selectedReport ? (
          !reportsQuery.loading && (
            <div className="card">
              <EmptyState icon={FileText} title="Tidak ada laporan untuk ditampilkan">
                Pilih laporan di daftar setelah supervisor mengirimnya.
              </EmptyState>
            </div>
          )
        ) : (
          <>
            <section className="card" aria-labelledby="report-title">
              <div className="card-header">
                <div className="min-w-0">
                  <h2 id="report-title" className="section-title">
                    {selectedReport.author?.teams?.name}, {selectedReport.periods?.name}
                  </h2>
                  <p className="section-desc">
                    Dikirim {selectedReport.author?.full_name}, {formatDateTime(selectedReport.submitted_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill className={selectedCfg?.badge}>{selectedCfg?.label}</StatusPill>
                  {canReview && (
                    <a href="#keputusan" className="btn-primary btn-sm">
                      Beri keputusan
                    </a>
                  )}
                  <button
                    onClick={handleDownload}
                    disabled={busy === 'pdf' || (!selectedReport.file_url && !content)}
                    className="btn-secondary btn-sm"
                  >
                    {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}
                    Unduh PDF
                  </button>
                </div>
              </div>

              <div className="card-body">
                {contentQuery.error && <Notice type="error">{contentQuery.error}</Notice>}
                {contentQuery.loading || !content ? (
                  <LoadingBlock text="Memuat isi laporan…" />
                ) : (
                  <ReportPreview content={content} compact />
                )}
              </div>
            </section>

            {selectedReport.report_reviews?.length > 0 && (
              <Section title="Keputusan sebelumnya">
                <ReviewHistory reviews={selectedReport.report_reviews} />
              </Section>
            )}

            {canReview && (
              <Section
                id="keputusan"
                title="Keputusan manajemen"
                description="Keputusan dan feedback langsung terlihat oleh supervisor pengirim"
              >
                <form onSubmit={handleSubmitFeedback} className="space-y-5">
                  <fieldset>
                    <legend className="label">Keputusan</legend>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {DECISION_OPTIONS.map((opt) => (
                        <label
                          key={opt.key}
                          className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 p-3 text-sm text-slate-800 has-[:checked]:border-astra-600 has-[:checked]:bg-astra-50"
                        >
                          <input
                            type="radio"
                            name="decision"
                            value={opt.key}
                            checked={decision === opt.key}
                            onChange={() => setDecision(opt.key)}
                            className="mt-0.5 h-4 w-4 border-control text-astra-600 focus:ring-astra-600"
                          />
                          <span>
                            <span className="block font-medium">{opt.label}</span>
                            <span className="block text-[13px] text-slate-500">{opt.hint}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="feedback" className="label">
                      Feedback untuk supervisor
                    </label>
                    <textarea
                      id="feedback"
                      rows={4}
                      required
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={FEEDBACK_PLACEHOLDER[decision]}
                      className="field"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button type="submit" disabled={busy === 'review' || !feedback.trim()} className="btn-primary">
                      {busy === 'review' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      Kirim keputusan
                    </button>
                  </div>
                </form>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
