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
import { Notice, LoadingBlock, EmptyBlock } from '../components/common/Notice';
import { ReportPreview } from '../components/laporan/ReportPreview';

/**
 * Laporan lama (mis. dari seed) mungkin belum punya snapshot `content`;
 * dalam kasus itu isi laporan disusun ulang dari data KPI periode tsb.
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
    plans: plans.filter((p) => !report.author?.team_id || rows.some((r) => r.staff_id === p.staff_id)),
    teamName: report.author?.teams?.name || '-',
    authorName: report.author?.full_name || '-',
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
      setMessage({ type: 'error', text: `Gagal mengunduh: ${err.message}` });
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
      setMessage({ type: 'success', text: 'Keputusan dan feedback manajemen berhasil dikirim kepada supervisor.' });
    } catch (err) {
      setMessage({ type: 'error', text: `Gagal mengirim feedback: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  const waiting = reports.filter((r) => r.status === 'submitted').length;
  const canReview = selectedReport?.status === 'submitted';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-slate-900">Laporan Masuk</h2>
          <span className="text-xs text-slate-400 font-medium">{waiting} menunggu</span>
        </div>

        {reportsQuery.error && <Notice type="error">{reportsQuery.error}</Notice>}

        <div className="space-y-3">
          {reportsQuery.loading ? (
            <LoadingBlock text="Memuat laporan..." />
          ) : reports.length === 0 ? (
            <EmptyBlock>Belum ada laporan dari supervisor.</EmptyBlock>
          ) : (
            reports.map((rep) => {
              const isSelected = selectedReport?.id === rep.id;
              const cfg = REPORT_STATUS[rep.status];
              return (
                <div
                  key={rep.id}
                  onClick={() => handleSelect(rep)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected ? 'border-astra-600 bg-astra-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{rep.author?.teams?.name || rep.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {rep.periods?.name} · oleh {rep.author?.full_name}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${cfg?.badge}`}>
                    {cfg?.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="lg:col-span-8 space-y-6">
        {message && <Notice type={message.type}>{message.text}</Notice>}

        {!selectedReport ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-xs">
            {reportsQuery.loading ? 'Memuat...' : 'Pilih laporan di sebelah kiri untuk melihat detail.'}
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedReport.title}</h3>
                  <p className="text-[11px] text-slate-400">
                    Dikirim {formatDateTime(selectedReport.submitted_at)} oleh {selectedReport.author?.full_name}
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={busy === 'pdf' || (!selectedReport.file_url && !content)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shrink-0"
                >
                  {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                  Unduh PDF
                </button>
              </div>

              {contentQuery.error && <Notice type="error">{contentQuery.error}</Notice>}
              {contentQuery.loading || !content ? (
                <LoadingBlock text="Memuat isi laporan..." />
              ) : (
                <ReportPreview content={content} compact />
              )}
            </div>

            {selectedReport.report_reviews?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">Riwayat Keputusan</h3>
                {selectedReport.report_reviews.map((rv) => (
                  <div key={rv.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800">{REVIEW_DECISIONS[rv.decision]}</span>
                      <span className="text-[11px] text-slate-400">{formatDateTime(rv.reviewed_at)}</span>
                    </div>
                    <p className="text-slate-600">{rv.feedback}</p>
                    <p className="text-[11px] text-slate-400">— {rv.reviewer?.full_name}</p>
                  </div>
                ))}
              </div>
            )}

            {canReview && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Feedback & Keputusan Manajemen</h3>
                <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
                  <div className="space-y-2">
                    {Object.entries(REVIEW_DECISIONS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                        <input
                          type="radio"
                          name="decision"
                          value={key}
                          checked={decision === key}
                          onChange={() => setDecision(key)}
                          className="w-4 h-4 text-astra-800 border-slate-300 focus:ring-astra-600 cursor-pointer"
                        />
                        <span className="font-medium">{key === 'approved' ? 'Setujui' : label}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Feedback untuk supervisor</label>
                    <textarea
                      rows={3}
                      required
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={
                        decision === 'revision'
                          ? 'Bagian mana yang perlu diperbaiki?'
                          : decision === 'special_action'
                            ? 'Tindak lanjut khusus apa yang ditetapkan (sumber daya, revisi target, dll.)?'
                            : 'Catatan untuk supervisor'
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedback('');
                        setDecision('approved');
                      }}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={busy === 'review'}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-astra-800 hover:bg-astra-900 disabled:opacity-60 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      {busy === 'review' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Kirim Feedback
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
