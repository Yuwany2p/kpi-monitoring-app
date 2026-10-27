import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
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
import { REPORT_STATUS, REVIEW_DECISIONS } from '../lib/constants';
import { formatDateTime } from '../lib/formatters';
import { Notice, LoadingBlock, EmptyBlock, StatusPill } from '../components/common/Notice';
import { ReportPreview } from '../components/laporan/ReportPreview';

const DECISION_OPTIONS = [
  { key: 'approved', label: 'Setujui laporan' },
  { key: 'revision', label: 'Minta revisi laporan' },
  { key: 'special_action', label: 'Tetapkan tindak lanjut khusus (sumber daya atau revisi target)' },
];

const FEEDBACK_PLACEHOLDER = {
  approved: 'Catatan untuk supervisor (opsional tapi disarankan)',
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
      setFeedback('');
      setMessage({ type: 'success', text: 'Keputusan terkirim ke supervisor.' });
    } catch (err) {
      setMessage({ type: 'error', text: `Keputusan belum terkirim: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  const waiting = reports.filter((r) => r.status === 'submitted').length;
  const canReview = selectedReport?.status === 'submitted';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="card p-6 lg:col-span-4">
        <div className="flex items-baseline justify-between">
          <h2 className="card-title">Laporan masuk</h2>
          <span className="text-sm text-slate-500">{waiting} menunggu</span>
        </div>

        {reportsQuery.error && <Notice type="error" className="mt-4">{reportsQuery.error}</Notice>}

        {reportsQuery.loading ? (
          <LoadingBlock text="Memuat laporan…" />
        ) : reports.length === 0 ? (
          <EmptyBlock>Belum ada laporan yang dikirim supervisor.</EmptyBlock>
        ) : (
          <ul className="mt-4 space-y-2">
            {reports.map((rep) => {
              const isSelected = selectedReport?.id === rep.id;
              const cfg = REPORT_STATUS[rep.status];
              return (
                <li key={rep.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(rep)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer ${
                      isSelected ? 'border-astra-600 bg-astra-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {rep.author?.teams?.name || rep.title}
                      </span>
                      <span className="block text-sm text-slate-500">
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
      </section>

      <div className="space-y-6 lg:col-span-8">
        {message && <Notice type={message.type}>{message.text}</Notice>}

        {!selectedReport ? (
          !reportsQuery.loading && (
            <div className="card p-12">
              <EmptyBlock>Laporan yang dikirim supervisor akan muncul di sini.</EmptyBlock>
            </div>
          )
        ) : (
          <>
            <section className="card p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedReport.author?.teams?.name}, {selectedReport.periods?.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Dikirim {selectedReport.author?.full_name} pada {formatDateTime(selectedReport.submitted_at)}
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={busy === 'pdf' || (!selectedReport.file_url && !content)}
                  className="btn-secondary"
                >
                  {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Unduh PDF
                </button>
              </div>

              {contentQuery.error && <Notice type="error">{contentQuery.error}</Notice>}
              {contentQuery.loading || !content ? (
                <LoadingBlock text="Memuat isi laporan…" />
              ) : (
                <ReportPreview content={content} compact />
              )}
            </section>

            {selectedReport.report_reviews?.length > 0 && (
              <section className="card p-6">
                <h2 className="card-title">Keputusan sebelumnya</h2>
                <ul className="mt-4 space-y-4">
                  {selectedReport.report_reviews.map((rv) => (
                    <li key={rv.id} className="border-l-2 border-astra-200 pl-4">
                      <p className="text-sm font-semibold text-slate-900">{REVIEW_DECISIONS[rv.decision]}</p>
                      <p className="mt-1 text-sm text-slate-700">{rv.feedback}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {rv.reviewer?.full_name}, {formatDateTime(rv.reviewed_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {canReview && (
              <section className="card p-6">
                <h2 className="card-title">Feedback & keputusan manajemen</h2>
                <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-5">
                  <fieldset className="space-y-2.5">
                    <legend className="sr-only">Keputusan</legend>
                    {DECISION_OPTIONS.map((opt) => (
                      <label key={opt.key} className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="decision"
                          value={opt.key}
                          checked={decision === opt.key}
                          onChange={() => setDecision(opt.key)}
                          className="h-4 w-4 border-slate-300 text-astra-600"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </fieldset>

                  <div>
                    <label htmlFor="feedback" className="label">Feedback untuk supervisor</label>
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
                      {busy === 'review' && <Loader2 className="h-4 w-4 animate-spin" />}
                      Kirim keputusan
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
