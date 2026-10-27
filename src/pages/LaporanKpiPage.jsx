import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FileDown, Send, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { initialStaffList } from '../lib/mockData';

export const LaporanKpiPage = () => {
  const { selectedPeriod, selectedTeam } = useFilter();

  const [sections, setSections] = useState({
    ringkasan: true,
    tren: true,
    kpiWarna: true,
    actionPlan: true,
  });

  const [notes, setNotes] = useState('Penurunan tiket dipengaruhi promo akhir bulan.');
  const [sentSuccess, setSentSuccess] = useState(false);

  const trendData = [
    { bulan: 'Mei', skor: 80 },
    { bulan: 'Jun', skor: 83 },
    { bulan: 'Jul', skor: 86 },
    { bulan: 'Agu', skor: 84 },
    { bulan: 'Sep', skor: 87 },
    { bulan: 'Okt', skor: 89 },
  ];

  const handleSendToManagement = () => {
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 4000);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleExportExcel = () => {
    alert('Mengunduh laporan dalam format file spreadsheet Excel (.xlsx)...');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column (approx 40%): Pengaturan Laporan */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 no-print">
        <h2 className="text-base font-bold text-slate-900">Pengaturan Laporan</h2>

        {sentSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Laporan berhasil dikirim ke Manajemen untuk direview!
          </div>
        )}

        {/* Periode */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Periode</label>
          <div className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-slate-50">
            {selectedPeriod}
          </div>
        </div>

        {/* Tim */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tim</label>
          <div className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-slate-50">
            {selectedTeam}
          </div>
        </div>

        {/* Isi Laporan Checkboxes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Isi laporan</label>
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={sections.ringkasan}
                onChange={(e) => setSections({ ...sections, ringkasan: e.target.checked })}
                className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-600 cursor-pointer"
              />
              <span>Ringkasan capaian</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={sections.tren}
                onChange={(e) => setSections({ ...sections, tren: e.target.checked })}
                className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-600 cursor-pointer"
              />
              <span>Grafik tren</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={sections.kpiWarna}
                onChange={(e) => setSections({ ...sections, kpiWarna: e.target.checked })}
                className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-600 cursor-pointer"
              />
              <span>Daftar KPI merah & kuning</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={sections.actionPlan}
                onChange={(e) => setSections({ ...sections, actionPlan: e.target.checked })}
                className="w-4 h-4 rounded text-astra-800 border-slate-300 focus:ring-astra-600 cursor-pointer"
              />
              <span>Action plan</span>
            </label>
          </div>
        </div>

        {/* Catatan Supervisor */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Catatan supervisor
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none"
          />
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500" /> Ekspor PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" /> Ekspor Excel
          </button>
        </div>

        {/* Kirim ke Manajemen Button */}
        <button
          type="button"
          onClick={handleSendToManagement}
          className="w-full py-3 px-4 bg-astra-800 hover:bg-astra-900 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Kirim ke Manajemen
        </button>
      </div>

      {/* Right Column (approx 60%): Pratinjau Laporan */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <h3 className="font-bold text-slate-900 text-sm">Pratinjau Laporan</h3>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
              Draft
            </span>
          </div>

          {/* Document Sheet Preview */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Laporan KPI {selectedTeam}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Periode {selectedPeriod} · Disusun oleh Hendra Wijaya
              </p>
            </div>

            {/* 3 Metrics */}
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs text-slate-400 font-medium">Skor tim</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-0.5">89%</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Merah</p>
                <p className="text-3xl font-extrabold text-rose-600 mt-0.5">4</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Kuning</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-0.5">8</p>
              </div>
            </div>

            {/* Split Grid: Staf Table on Left, Line Chart on Right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Staf Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                      <th className="pb-2.5 font-medium">Staf</th>
                      <th className="pb-2.5 text-center font-medium">Skor</th>
                      <th className="pb-2.5 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {initialStaffList.map((staf) => (
                      <tr key={staf.id}>
                        <td className="py-2.5 font-semibold text-slate-800">{staf.name}</td>
                        <td className="py-2.5 text-center font-bold text-slate-900">
                          {staf.scores.overall}%
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              staf.scores.status === 'Hijau'
                                ? 'bg-emerald-100 text-emerald-800'
                                : staf.scores.status === 'Kuning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {staf.scores.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Line Chart */}
              <div className="w-full h-44">
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

            {/* Masalah utama & Tindak lanjut notes */}
            <div className="pt-4 border-t border-slate-100 space-y-1.5 text-xs">
              <p className="text-slate-800">
                <strong className="font-bold">Masalah utama:</strong> tiket terselesaikan 84% dari
                target.
              </p>
              <p className="text-slate-800">
                <strong className="font-bold">Tindak lanjut:</strong> 2 action plan berjalan.
              </p>
              {notes && (
                <p className="text-slate-600 italic pt-1">
                  Catatan supervisor: "{notes}"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
