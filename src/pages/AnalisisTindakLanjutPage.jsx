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
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { getActionPlans, createActionPlan } from '../services/supabaseService';

export const AnalisisTindakLanjutPage = () => {
  const kpiIssues = [
    {
      id: 'kpi-rina-tiket',
      staff_name: 'Rina Marlina',
      indicator: 'Tiket Terselesaikan',
      score: 68,
      status_label: 'Merah',
      target: 200,
      realisasi: 136,
      deviasi: -64,
      trend: [
        { bulan: 'Jun', nilai: 88 },
        { bulan: 'Jul', nilai: 84 },
        { bulan: 'Agu', nilai: 81 },
        { bulan: 'Sep', nilai: 74 },
        { bulan: 'Okt', nilai: 68 },
      ],
      default_analysis:
        'Volume tiket naik sejak promo akhir bulan dan 2 hari izin sakit mengurangi jam layanan.',
      default_action: 'Redistribusi tiket antrean dan sesi coaching manajemen waktu.',
      pic: 'Hendra Wijaya',
      due_date: '2026-11-05',
      status: 'Terbuka',
    },
    {
      id: 'kpi-rina-kepuasan',
      staff_name: 'Rina Marlina',
      indicator: 'Kepuasan Pelanggan',
      score: 78,
      status_label: 'Merah',
      target: 90,
      realisasi: 70,
      deviasi: -20,
      trend: [
        { bulan: 'Jun', nilai: 85 },
        { bulan: 'Jul', nilai: 82 },
        { bulan: 'Agu', nilai: 80 },
        { bulan: 'Sep', nilai: 79 },
        { bulan: 'Okt', nilai: 78 },
      ],
      default_analysis: 'Komplain terkait respon chat yang terlambat di jam sibuk.',
      default_action: 'Coaching teknik komunikasi dan simulasi penanganan komplain.',
      pic: 'Hendra Wijaya',
      due_date: '2026-11-12',
      status: 'Berjalan',
    },
    {
      id: 'kpi-dewi-tiket',
      staff_name: 'Dewi Lestari',
      indicator: 'Tiket Terselesaikan',
      score: 72,
      status_label: 'Merah',
      target: 200,
      realisasi: 144,
      deviasi: -56,
      trend: [
        { bulan: 'Jun', nilai: 80 },
        { bulan: 'Jul', nilai: 78 },
        { bulan: 'Agu', nilai: 76 },
        { bulan: 'Sep', nilai: 75 },
        { bulan: 'Okt', nilai: 72 },
      ],
      default_analysis: 'Gangguan teknis koneksi VPN selama 3 hari berturut-turut.',
      default_action: 'Eskalasi perbaikan jaringan ke tim IT infrastruktur.',
      pic: 'Hendra Wijaya',
      due_date: '2026-11-08',
      status: 'Terbuka',
    },
    {
      id: 'kpi-budi-tiket',
      staff_name: 'Budi Santoso',
      indicator: 'Tiket Terselesaikan',
      score: 85,
      status_label: 'Kuning',
      target: 200,
      realisasi: 170,
      deviasi: -30,
      trend: [
        { bulan: 'Jun', nilai: 88 },
        { bulan: 'Jul', nilai: 86 },
        { bulan: 'Agu', nilai: 87 },
        { bulan: 'Sep', nilai: 85 },
        { bulan: 'Okt', nilai: 85 },
      ],
      default_analysis: 'Handling time per tiket meningkat karena tipe kendala kompleks.',
      default_action: 'Pembuatan knowledge base artikel bantuan untuk solusi instan.',
      pic: 'Hendra Wijaya',
      due_date: '2026-11-15',
      status: 'Terbuka',
    },
  ];

  const [selectedKpi, setSelectedKpi] = useState(kpiIssues[0]);
  const [analysisText, setAnalysisText] = useState(kpiIssues[0].default_analysis);
  const [actionText, setActionText] = useState(kpiIssues[0].default_action);
  const [pic, setPic] = useState(kpiIssues[0].pic);
  const [dueDate, setDueDate] = useState(kpiIssues[0].due_date);
  const [planStatus, setPlanStatus] = useState(kpiIssues[0].status);
  const [actionPlans, setActionPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const loadPlans = async () => {
      setLoadingPlans(true);
      const data = await getActionPlans();
      setActionPlans(data || []);
      setLoadingPlans(false);
    };
    loadPlans();
  }, []);

  const handleSelectIssue = (issue) => {
    setSelectedKpi(issue);
    setAnalysisText(issue.default_analysis);
    setActionText(issue.default_action);
    setPic(issue.pic);
    setDueDate(issue.due_date);
    setPlanStatus(issue.status);
  };

  const handleSaveActionPlan = async (e) => {
    e.preventDefault();
    const newPlan = {
      id: 'ap-' + Date.now(),
      staff_name: selectedKpi.staff_name,
      indicator_name: selectedKpi.indicator,
      score: selectedKpi.score,
      action: actionText,
      due_date: dueDate,
      due_date_formatted: new Date(dueDate).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
      }),
      status: planStatus,
    };

    await createActionPlan({
      analysis: analysisText,
      action: actionText,
      due_date: dueDate,
      status: planStatus === 'Terbuka' ? 'open' : planStatus === 'Berjalan' ? 'in_progress' : 'resolved',
    });

    setActionPlans([newPlan, ...actionPlans]);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column (approx 38%) */}
      <div className="lg:col-span-5 space-y-6">
        {/* Top: KPI Perlu Tindak Lanjut */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm">KPI Perlu Tindak Lanjut</h3>
            <span className="text-xs text-slate-400 font-medium">Merah & Kuning</span>
          </div>

          <div className="space-y-2.5">
            {kpiIssues.map((issue) => {
              const isSelected = selectedKpi.id === issue.id;
              return (
                <div
                  key={issue.id}
                  onClick={() => handleSelectIssue(issue)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-astra-600 bg-astra-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      {issue.staff_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{issue.staff_name}</p>
                      <p className="text-[11px] text-slate-500">{issue.indicator}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      issue.status_label === 'Merah'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {issue.score}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: Action Plan Berjalan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Action Plan Berjalan</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-3 font-medium">Staf</th>
                  <th className="pb-3 font-medium">Tindakan</th>
                  <th className="pb-3 font-medium">Batas</th>
                  <th className="pb-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actionPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/60">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">
                      {plan.staff_name.split(' ')[0]} · {plan.indicator_name.split(' ')[0]}
                    </td>
                    <td className="py-3 text-slate-600 font-medium line-clamp-1 max-w-[160px]">
                      {plan.action}
                    </td>
                    <td className="py-3 text-slate-500 whitespace-nowrap">
                      {plan.due_date_formatted}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          plan.status === 'Berjalan'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {plan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Form Detail for Selected KPI (approx 62%) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <h3 className="font-bold text-slate-900 text-base">
              {selectedKpi.staff_name} · {selectedKpi.indicator}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                selectedKpi.status_label === 'Merah'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {selectedKpi.score}% · {selectedKpi.status_label}
            </span>
          </div>

          {savedSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Action Plan berhasil disimpan dan ditugaskan!
            </div>
          )}

          {/* 3 Metric Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-400 font-medium">Target</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{selectedKpi.target}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Realisasi</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{selectedKpi.realisasi}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Deviasi</p>
              <p className="text-2xl font-black text-rose-600 mt-0.5">{selectedKpi.deviasi}</p>
            </div>
          </div>

          {/* Mini Trend Line Chart */}
          <div className="w-full h-32 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedKpi.trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis dataKey="bulan" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis domain={[60, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Capaian']}
                  contentStyle={{
                    backgroundColor: '#0f1e36',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="nilai"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ffffff', stroke: '#ef4444', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Form Action Plan */}
          <form onSubmit={handleSaveActionPlan} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Analisis penyebab
              </label>
              <textarea
                rows={3}
                required
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Rencana tindakan
              </label>
              <textarea
                rows={3}
                required
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none"
              />
            </div>

            {/* 3 Dropdown Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Penanggung jawab
                </label>
                <select
                  value={pic}
                  onChange={(e) => setPic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-astra-600"
                >
                  <option value="Hendra Wijaya">Hendra Wijaya</option>
                  <option value="Rina Marlina">Rina Marlina</option>
                  <option value="Dewi Lestari">Dewi Lestari</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Batas waktu
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-astra-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Status</label>
                <select
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-astra-600"
                >
                  <option value="Terbuka">Terbuka</option>
                  <option value="Berjalan">Berjalan</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>

            {/* Submit buttons */}
            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAnalysisText(selectedKpi.default_analysis);
                  setActionText(selectedKpi.default_action);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-astra-800 hover:bg-astra-900 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Simpan Action Plan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
