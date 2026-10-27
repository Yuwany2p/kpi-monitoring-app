import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, FileText, Send } from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { initialStaffSubmissionHistory } from '../lib/mockData';
import { calculateAchievement, getStatusByScore } from '../lib/formatters';
import { KPI_DIRECTIONS } from '../lib/constants';
import { submitStaffActual } from '../services/supabaseService';

export const InputCapaianStafPage = () => {
  const { selectedPeriod } = useFilter();

  const [realisasi, setRealisasi] = useState({
    tiket: '144',
    respons: '5.3',
    kepuasan: '81',
  });

  const [files, setFiles] = useState({
    tiket: 'bukti.pdf',
    respons: 'bukti.pdf',
    kepuasan: 'bukti.pdf',
  });

  const [note, setNote] = useState('Tiket meningkat setelah promo akhir bulan.');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Targets for Dewi Lestari
  const targets = {
    tiket: 200,
    respons: 5,
    kepuasan: 90,
  };

  // Auto calculate achievement %
  const calcTiket = calculateAchievement(realisasi.tiket, targets.tiket, KPI_DIRECTIONS.HIGHER_BETTER);
  const calcRespons = calculateAchievement(realisasi.respons, targets.respons, KPI_DIRECTIONS.LOWER_BETTER);
  const calcKepuasan = calculateAchievement(realisasi.kepuasan, targets.kepuasan, KPI_DIRECTIONS.HIGHER_BETTER);

  const statusTiket = getStatusByScore(calcTiket);
  const statusRespons = getStatusByScore(calcRespons);
  const statusKepuasan = getStatusByScore(calcKepuasan);

  const handleSaveDraft = () => {
    alert('Draft capaian berhasil disimpan!');
  };

  const handleAjukan = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Kirim data ke Supabase (jika terhubung)
    // UUID target Dewi Lestari di seed data
    await submitStaffActual({
      targetId: '20000000-0000-0000-0000-000000000001',
      actualValue: parseFloat(realisasi.tiket),
      notes: note,
      evidenceUrl: files.tiket,
    });

    setSubmitting(false);
    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  const handleFileChange = (field, e) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({
        ...files,
        [field]: e.target.files[0].name,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Card: Form Capaian · Oktober 2026 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">
            Form Capaian · {selectedPeriod}
          </h2>
          <span className="text-xs text-slate-500 font-medium">Batas input: 31 Okt 2026</span>
        </div>

        {submittedSuccess && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Capaian berhasil diajukan kepada supervisor untuk divalidasi!
          </div>
        )}

        <form onSubmit={handleAjukan} className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-semibold">
                  <th className="pb-3.5 font-medium">Indikator KPI</th>
                  <th className="pb-3.5 font-medium">Target</th>
                  <th className="pb-3.5 font-medium">Realisasi</th>
                  <th className="pb-3.5 font-medium">Satuan</th>
                  <th className="pb-3.5 text-center font-medium">Capaian (otomatis)</th>
                  <th className="pb-3.5 font-medium">Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Tiket Terselesaikan */}
                <tr className="hover:bg-slate-50/60">
                  <td className="py-4 font-bold text-slate-900">Tiket Terselesaikan</td>
                  <td className="py-4 text-slate-600 font-medium">≥ 200 tiket</td>
                  <td className="py-4">
                    <input
                      type="number"
                      required
                      value={realisasi.tiket}
                      onChange={(e) => setRealisasi({ ...realisasi, tiket: e.target.value })}
                      className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs focus:ring-2 focus:ring-astra-600 focus:outline-none"
                    />
                  </td>
                  <td className="py-4 text-slate-500">tiket</td>
                  <td className="py-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusTiket.badge}`}
                    >
                      {calcTiket}%
                    </span>
                  </td>
                  <td className="py-4">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-astra-500 text-slate-600 hover:text-astra-800 text-[11px] cursor-pointer transition-colors">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{files.tiket || 'Lampirkan bukti'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange('tiket', e)}
                      />
                    </label>
                  </td>
                </tr>

                {/* 2. Waktu Respons Rata-rata */}
                <tr className="hover:bg-slate-50/60">
                  <td className="py-4 font-bold text-slate-900">Waktu Respons Rata-rata</td>
                  <td className="py-4 text-slate-600 font-medium">≤ 5 menit</td>
                  <td className="py-4">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={realisasi.respons}
                      onChange={(e) => setRealisasi({ ...realisasi, respons: e.target.value })}
                      className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs focus:ring-2 focus:ring-astra-600 focus:outline-none"
                    />
                  </td>
                  <td className="py-4 text-slate-500">menit</td>
                  <td className="py-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusRespons.badge}`}
                    >
                      {calcRespons}%
                    </span>
                  </td>
                  <td className="py-4">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-astra-500 text-slate-600 hover:text-astra-800 text-[11px] cursor-pointer transition-colors">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{files.respons || 'Lampirkan bukti'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange('respons', e)}
                      />
                    </label>
                  </td>
                </tr>

                {/* 3. Kepuasan Pelanggan */}
                <tr className="hover:bg-slate-50/60">
                  <td className="py-4 font-bold text-slate-900">Kepuasan Pelanggan</td>
                  <td className="py-4 text-slate-600 font-medium">≥ 90 %</td>
                  <td className="py-4">
                    <input
                      type="number"
                      required
                      value={realisasi.kepuasan}
                      onChange={(e) => setRealisasi({ ...realisasi, kepuasan: e.target.value })}
                      className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 font-semibold text-xs focus:ring-2 focus:ring-astra-600 focus:outline-none"
                    />
                  </td>
                  <td className="py-4 text-slate-500">%</td>
                  <td className="py-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusKepuasan.badge}`}
                    >
                      {calcKepuasan}%
                    </span>
                  </td>
                  <td className="py-4">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-astra-500 text-slate-600 hover:text-astra-800 text-[11px] cursor-pointer transition-colors">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{files.kepuasan || 'Lampirkan bukti'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange('kepuasan', e)}
                      />
                    </label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Catatan untuk supervisor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan untuk supervisor (opsional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jelaskan kondisi atau kendala yang dihadapi selama periode ini..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Simpan Draft
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-astra-800 hover:bg-astra-900 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Ajukan ke Supervisor
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Card: Riwayat Pengajuan Terakhir */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4">Riwayat Pengajuan Terakhir</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold">
                <th className="pb-3.5 font-medium">Periode</th>
                <th className="pb-3.5 font-medium">Indikator</th>
                <th className="pb-3.5 font-medium">Status</th>
                <th className="pb-3.5 font-medium">Catatan supervisor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialStaffSubmissionHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 font-medium text-slate-700">{item.period}</td>
                  <td className="py-3.5 font-semibold text-slate-800">{item.indicator}</td>
                  <td className="py-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        item.status === 'Valid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-500 italic">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
