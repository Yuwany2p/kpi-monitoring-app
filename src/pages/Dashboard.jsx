import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { ROLES } from '../lib/constants';
import { getProfiles } from '../services/supabaseService';

export const Dashboard = () => {
  const { role, currentUser } = useAuth();
  const { selectedPeriod, selectedTeam } = useFilter();
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStaff = async () => {
      setLoadingStaff(true);
      const data = await getProfiles();
      setStaffList(data || []);
      setLoadingStaff(false);
    };
    loadStaff();
  }, []);

  // Data tren 6 bulan terakhir matching mockup image24.png
  const trendData = [
    { bulan: 'Mei', skor: 80 },
    { bulan: 'Jun', skor: 83 },
    { bulan: 'Jul', skor: 86 },
    { bulan: 'Agu', skor: 84 },
    { bulan: 'Sep', skor: 87 },
    { bulan: 'Okt', skor: 89 },
  ];

  // If role is Staf, render Staf Personal Dashboard
  if (role === ROLES.STAF) {
    return (
      <div className="space-y-6">
        {/* Banner Staf */}
        <div className="bg-astra-50 border border-astra-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-astra-900">
              Halo, {currentUser?.full_name}!
            </h2>
            <p className="text-xs text-astra-700 mt-0.5">
              Batas pengisian capaian KPI periode {selectedPeriod} adalah tanggal 31 Okt 2026.
            </p>
          </div>
          <button
            onClick={() => navigate('/input-capaian')}
            className="px-4 py-2 bg-astra-800 hover:bg-astra-900 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 cursor-pointer"
          >
            Input Capaian Sekarang
          </button>
        </div>

        {/* 3 Stat Cards for Staff */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Skor Capaian Saya</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">84%</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              Kuning (80–99%)
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Status Validasi</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-2">3 Pending</p>
            <p className="text-xs text-slate-400 mt-2">Menunggu review supervisor</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Action Plan Ditugaskan</p>
            <p className="text-3xl font-extrabold text-astra-800 mt-2">1 Terbuka</p>
            <p className="text-xs text-slate-400 mt-2">Due: 05 November 2026</p>
          </div>
        </div>

        {/* Capaian per Indikator Staf */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">Rincian Capaian Indikator Saya</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Tiket Terselesaikan (Target: 200)</span>
                <span className="text-rose-600">144 tiket (72% · Merah)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '72%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Waktu Respons Rata-rata (Target: ≤ 5 menit)</span>
                <span className="text-amber-600">5.3 menit (95% · Kuning)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '95%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Kepuasan Pelanggan (Target: ≥ 90%)</span>
                <span className="text-amber-600">81% (90% · Kuning)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '90%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Supervisor & Manajemen View matching mockup image24.png
  return (
    <div className="space-y-6">
      {/* 1. Amber Alert Banner (Exact text from mockup) */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-amber-800 shrink-0" />
          <p className="text-xs sm:text-sm text-amber-900 font-medium">
            <strong className="font-bold text-amber-950">5 data capaian</strong> menunggu validasi
            Anda untuk periode ini.
          </p>
        </div>
        <button
          onClick={() => navigate('/validasi')}
          className="px-4 py-2 bg-astra-800 hover:bg-astra-900 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 transition-colors cursor-pointer"
        >
          Validasi sekarang
        </button>
      </div>

      {/* 2. Four Stat Cards (Exact numbers from mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Skor KPI Tim */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Skor KPI Tim</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">89%</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 font-medium">
            <span className="text-slate-700">▲</span> 3 poin dari bulan lalu
          </p>
        </div>

        {/* KPI Tercapai (Hijau) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">KPI Tercapai (Hijau)</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">3</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">dari 15 indikator-staf</p>
        </div>

        {/* Perlu Perhatian (Kuning) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Perlu Perhatian (Kuning)</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">8</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">dari 15 indikator-staf</p>
        </div>

        {/* Kritis (Merah) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Kritis (Merah)</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">4</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">butuh tindak lanjut</p>
        </div>
      </div>

      {/* 3. Two Main Grid Cards: Left = Trend & Indicators, Right = Staff Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (approx 52%) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Tren Skor KPI Tim</h3>
              </div>
              <span className="text-xs text-slate-400">6 bulan terakhir</span>
            </div>

            {/* Target 100% reference & chart */}
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="bulan" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis domain={[70, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`${val}%`, 'Skor Tim']}
                    contentStyle={{
                      backgroundColor: '#0f1e36',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <ReferenceLine
                    y={100}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    label={{ value: 'Target 100%', fill: '#10b981', fontSize: 10, position: 'top' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="skor"
                    stroke="#1d4ed8"
                    strokeWidth={2.5}
                    dot={{ fill: '#ffffff', stroke: '#1d4ed8', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Capaian per Indikator */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs mb-3.5">Capaian per Indikator</h4>
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Tiket Terselesaikan</span>
                  <span className="text-slate-900 font-bold">84%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '84%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Waktu Respons Rata-rata</span>
                  <span className="text-slate-900 font-bold">94%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '94%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Kepuasan Pelanggan</span>
                  <span className="text-slate-900 font-bold">89%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '89%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Capaian per Staf (approx 48%) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Capaian per Staf</h3>
              <span className="text-xs text-slate-400">Okt 2026</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="pb-3 font-medium">Staf</th>
                    <th className="pb-3 text-center font-medium">Tiket</th>
                    <th className="pb-3 text-center font-medium">Respons</th>
                    <th className="pb-3 text-center font-medium">Kepuasan</th>
                    <th className="pb-3 text-center font-medium">Skor</th>
                    <th className="pb-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingStaff ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-astra-700" />
                        Memuat data capaian staf dari database...
                      </td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada data staf di database.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((staf) => {
                      const scores = staf.scores || { tiket: 100, respons: 100, kepuasan: 100, overall: 100, status: 'Hijau' };
                      return (
                        <tr key={staf.id} className="hover:bg-slate-50/60">
                          <td className="py-3 font-bold text-slate-800">{staf.full_name || staf.name}</td>

                          <td className="py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                scores.tiket >= 100
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : scores.tiket >= 80
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {scores.tiket}%
                            </span>
                          </td>

                          <td className="py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                scores.respons >= 100
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : scores.respons >= 80
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {scores.respons}%
                            </span>
                          </td>

                          <td className="py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                scores.kepuasan >= 100
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : scores.kepuasan >= 80
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {scores.kepuasan}%
                            </span>
                          </td>

                          <td className="py-3 text-center font-bold text-slate-900">
                            {scores.overall}%
                          </td>

                          <td className="py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                scores.status === 'Hijau' || scores.overall >= 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : scores.status === 'Kuning' || scores.overall >= 80
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {scores.status || (scores.overall >= 100 ? 'Hijau' : scores.overall >= 80 ? 'Kuning' : 'Merah')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend Footer matching mockup */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-start gap-4 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hijau ≥ 100%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Kuning 80–99%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Merah &lt; 80%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
