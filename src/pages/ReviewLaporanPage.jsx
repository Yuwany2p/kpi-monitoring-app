import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FileDown, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { getManagementReports, submitReportReview } from '../services/supabaseService';

export const ReviewLaporanPage = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState('approved'); // 'approved' | 'revision' | 'special_action'
  const [feedback, setFeedback] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const data = await getManagementReports();
      setReports(data || []);
      if (data && data.length > 0) {
        setSelectedReport(data[0]);
        setFeedback(data[0].feedback || 'Laporan telah diperiksa dan disetujui.');
      }
      setLoading(false);
    };
    loadReports();
  }, []);

  const trendData = [
    { bulan: 'Mei', skor: 80 },
    { bulan: 'Jun', skor: 83 },
    { bulan: 'Jul', skor: 86 },
    { bulan: 'Agu', skor: 84 },
    { bulan: 'Sep', skor: 87 },
    { bulan: 'Okt', skor: 89 },
  ];

  const handleSelectReport = (rep) => {
    setSelectedReport(rep);
    if (rep.feedback) {
      setFeedback(rep.feedback);
    } else {
      setFeedback('Laporan telah diperiksa dan disetujui.');
    }
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    const updatedStatus = decision === 'approved' ? 'Disetujui' : decision === 'revision' ? 'Revisi' : 'Tindak Lanjut';
    setReports(
      reports.map((r) =>
        r.id === selectedReport.id
          ? { ...r, status: updatedStatus, feedback, decision: updatedStatus }
          : r
      )
    );
    setSelectedReport({ ...selectedReport, status: updatedStatus, feedback, decision: updatedStatus });
    setFeedbackSuccess(true);
    setTimeout(() => setFeedbackSuccess(false), 4000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column (approx 35%): Laporan Masuk */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-slate-900">Laporan Masuk</h2>
          <span className="text-xs text-slate-400 font-medium">
            {reports.filter((r) => r.status !== 'Disetujui').length} menunggu
          </span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-astra-700" />
              Memuat laporan dari database...
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Belum ada laporan dari supervisor di database.
            </div>
          ) : (
            reports.map((rep) => {
              const isSelected = selectedReport?.id === rep.id;
              return (
                <div
                  key={rep.id}
                  onClick={() => handleSelectReport(rep)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-astra-600 bg-astra-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{rep.title || rep.team_name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {rep.periods?.name || rep.period || 'Periode'} · oleh {rep.profiles?.full_name || rep.author || 'Supervisor'}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      rep.status === 'Disetujui' || rep.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rep.status === 'Revisi' || rep.status === 'revision'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-astra-800'
                    }`}
                  >
                    {rep.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column (approx 65%): Review Detail */}
      <div className="lg:col-span-7 space-y-6">
        {feedbackSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Keputusan dan feedback manajemen berhasil dikirimkan kepada supervisor!
          </div>
        )}

        {!selectedReport ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
            {loading ? 'Memuat detail laporan...' : 'Pilih laporan di sebelah kiri untuk melihat detail review.'}
          </div>
        ) : (
          <>
            {/* Top Detail Card matching mockup */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {selectedReport.title || selectedReport.team_name} · {selectedReport.periods?.name || selectedReport.period_full}
              </h3>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" /> Unduh PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stats & Line Chart */}
              <div>
                <div className="flex items-center gap-6 mb-3">
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Skor tim</p>
                    <p className="text-2xl font-black text-slate-900">{selectedReport.score_tim || 89}%</p>
                  </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">KPI merah</p>
                  <p className="text-2xl font-black text-rose-600">{selectedReport.kpi_merah}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Action plan</p>
                  <p className="text-2xl font-black text-slate-900">{selectedReport.action_plan_count}</p>
                </div>
              </div>

              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis domain={[70, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'Skor']}
                      contentStyle={{
                        backgroundColor: '#0f1e36',
                        borderRadius: '0.5rem',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="skor"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      dot={{ fill: '#ffffff', stroke: '#1d4ed8', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ringkasan Supervisor */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs mb-2">Ringkasan supervisor</h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {selectedReport.summary}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Card: Feedback & Keputusan Manajemen */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Feedback & Keputusan Manajemen</h3>

          <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
            {/* Radio options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="decision"
                  value="approved"
                  checked={decision === 'approved'}
                  onChange={() => setDecision('approved')}
                  className="w-4 h-4 text-astra-800 border-slate-300 focus:ring-astra-600 cursor-pointer"
                />
                <span className="font-medium">Setujui</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="decision"
                  value="revision"
                  checked={decision === 'revision'}
                  onChange={() => setDecision('revision')}
                  className="w-4 h-4 text-astra-800 border-slate-300 focus:ring-astra-600 cursor-pointer"
                />
                <span className="font-medium">Minta revisi laporan</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="decision"
                  value="special_action"
                  checked={decision === 'special_action'}
                  onChange={() => setDecision('special_action')}
                  className="w-4 h-4 text-astra-800 border-slate-300 focus:ring-astra-600 cursor-pointer"
                />
                <span className="font-medium">
                  Tindak lanjut khusus (sumber daya / revisi target)
                </span>
              </label>
            </div>

            {/* Feedback textarea */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Feedback untuk supervisor
              </label>
              <textarea
                rows={3}
                required
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setFeedback(
                    'Laporan jelas. Mohon pantau action plan Rina dan laporkan progresnya di akhir November.'
                  )
                }
                className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-astra-800 hover:bg-astra-900 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Kirim Feedback
              </button>
            </div>
          </form>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
