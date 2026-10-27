import React, { useMemo, useState } from 'react';
import { FileDown, Send, FileSpreadsheet, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { getKpiResults, getActionPlans, getMyReport, saveReport, uploadReportFile } from '../services/supabaseService';
import { buildReportContent, DEFAULT_SECTIONS } from '../lib/reportContent';
import { exportReportPdf, exportReportExcel } from '../lib/reportExport';
import { REPORT_STATUS, REVIEW_DECISIONS } from '../lib/constants';
import { formatDateTime } from '../lib/formatters';
import { Notice, LoadingBlock } from '../components/common/Notice';
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

  // Reset form saat ganti periode
  const [lastPeriodId, setLastPeriodId] = useState(selectedPeriod?.id);
  if (selectedPeriod?.id !== lastPeriodId) {
    setLastPeriodId(selectedPeriod?.id);
    setSections(null);
    setNotes(null);
    setMessage(null);
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

  // Laporan yang sudah dikirim ditampilkan sesuai snapshot yang dikirim
  const previewContent = !canSend && report?.content?.staff ? report.content : content;

  const handleExport = async (type) => {
    setBusy(type);
    setMessage(null);
    try {
      if (type === 'pdf') await exportReportPdf(previewContent);
      else await exportReportExcel(previewContent);
    } catch (err) {
      setMessage({ type: 'error', text: `Gagal mengekspor: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  const handleSend = async () => {
    if (content.pending > 0 &&
      !window.confirm(`Masih ada ${content.pending} data yang belum divalidasi. Tetap kirim laporan?`)) {
      return;
    }
    setBusy('send');
    setMessage(null);
    try {
      let saved = await saveReport({
        id: report?.id,
        period_id: selectedPeriod.id,
        created_by: currentUser.id,
        title: `Laporan KPI ${currentUser.team_name || ''} · ${selectedPeriod.name}`.trim(),
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
        warning = `Laporan terkirim, tetapi file PDF gagal diunggah (${err.message}).`;
      }
      setData((prev) => ({ ...prev, report: saved }));
      setSections(null);
      setNotes(null);
      setMessage(
        warning
          ? { type: 'warning', text: warning }
          : { type: 'success', text: 'Laporan berhasil dikirim ke Manajemen untuk direview.' }
      );
    } catch (err) {
      setMessage({ type: 'error', text: `Gagal mengirim laporan: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  if (error) return <Notice type="error">{error}</Notice>;
  if (loading || !data || !content) return <LoadingBlock text="Menyusun laporan..." />;

  const statusCfg = report ? REPORT_STATUS[report.status] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-6 no-print">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <h2 className="text-base font-bold text-slate-900">Pengaturan Laporan</h2>

          {message && <Notice type={message.type}>{message.text}</Notice>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Periode</label>
              <div className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-slate-50">
                {selectedPeriod.name}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tim</label>
              <div className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-slate-50 truncate">
                {currentUser.team_name || '-'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Isi laporan</label>
            <div className="space-y-2 text-xs">
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    disabled={!canSend}
                    checked={currentSections[key] !== false}
                    onChange={(e) => setSections({ ...currentSections, [key]: e.target.checked })}
                    className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-600 cursor-pointer"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan supervisor</label>
            <textarea
              rows={3}
              disabled={!canSend}
              value={currentNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ringkasan kondisi tim, kendala, dan rencana periode depan."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none disabled:bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={Boolean(busy)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 text-slate-500" />}
              Ekspor PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport('excel')}
              disabled={Boolean(busy)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              {busy === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />}
              Ekspor Excel
            </button>
          </div>

          {canSend ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={Boolean(busy)}
              className="w-full py-3 px-4 bg-astra-800 hover:bg-astra-900 disabled:opacity-60 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {report?.status === 'revision' ? 'Kirim Revisi ke Manajemen' : 'Kirim ke Manajemen'}
            </button>
          ) : (
            <Notice type="info">
              Laporan periode ini sudah dikirim ({formatDateTime(report.submitted_at)}) dan berstatus{' '}
              <strong>{statusCfg?.label}</strong>.
            </Notice>
          )}
        </div>

        {/* Feedback manajemen */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-astra-700" /> Feedback Manajemen
          </h3>
          {!report?.report_reviews?.length ? (
            <p className="text-xs text-slate-400">Belum ada feedback untuk laporan periode ini.</p>
          ) : (
            report.report_reviews.map((rv) => (
              <div key={rv.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">{REVIEW_DECISIONS[rv.decision]}</span>
                  <span className="text-[11px] text-slate-400">{formatDateTime(rv.reviewed_at)}</span>
                </div>
                <p className="text-slate-600">{rv.feedback}</p>
                <p className="text-[11px] text-slate-400">— {rv.reviewer?.full_name}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <h3 className="font-bold text-slate-900 text-sm">Pratinjau Laporan</h3>
          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${statusCfg?.badge || 'bg-slate-100 text-slate-600'}`}>
            {statusCfg?.label || 'Draft'}
          </span>
        </div>
        <ReportPreview content={previewContent} />
      </div>
    </div>
  );
};
