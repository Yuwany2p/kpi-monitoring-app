import React from 'react';
import { getMonthName, formatNumber, formatDate } from '../../lib/formatters';
import { PERSPEKTIF_AMS } from '../../lib/constants';

export const ManagementReportView = ({
  tahun,
  bulan,
  departemenName = 'Semua Departemen',
  kpiList = [],
  realisasiList = [],
  tindakanList = [],
}) => {
  // Aggregate per perspektif
  const perspektifSummary = PERSPEKTIF_AMS.map((p) => {
    const kpisInP = kpiList.filter((k) => k.perspektif === p);
    const relatedRealisasi = realisasiList.filter((r) =>
      kpisInP.some((k) => k.id === r.id_kpi || k.id === r.kpi?.id)
    );

    const avg =
      relatedRealisasi.length > 0
        ? relatedRealisasi.reduce((acc, curr) => acc + Number(curr.persen_capaian || 0), 0) /
          relatedRealisasi.length
        : 0;

    return {
      perspektif: p,
      totalKpi: kpisInP.length,
      rataCapaian: avg.toFixed(1),
      status: avg >= 100 ? 'Memenuhi Standar' : avg >= 80 ? 'Perlu Perhatian' : 'Kritis (CAPA Diperlukan)',
    };
  });

  const overallAvg =
    realisasiList.length > 0
      ? (
          realisasiList.reduce((acc, c) => acc + Number(c.persen_capaian || 0), 0) /
          realisasiList.length
        ).toFixed(1)
      : 0;

  return (
    <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 print:border-none print:p-0 text-slate-800 space-y-8">
      {/* 1. Header Laporan Resmi */}
      <div className="border-b-2 border-slate-800 pb-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-900">
              Laporan Berkala Capaian Kinerja Unit Kerja
            </h1>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              Penerapan Empat Perspektif Activity Monitoring System (AMS) & Tindakan Korektif
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-bold text-slate-800">DOKUMEN MANAJEMEN</p>
            <p>Form: SUP-KPI-05</p>
            <p>Rev: 01 / {tahun}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Periode Pelaporan:</span>
            <span className="font-bold text-slate-800 text-sm">
              {getMonthName(bulan)} {tahun}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Unit Kerja / Divisi:</span>
            <span className="font-bold text-slate-800 text-sm">{departemenName}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Rata-rata Capaian Tim:</span>
            <span
              className={`font-black text-sm ${
                overallAvg >= 100
                  ? 'text-emerald-600'
                  : overallAvg >= 80
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {overallAvg}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Tanggal Diterbitkan:</span>
            <span className="font-bold text-slate-800 text-sm">
              {new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Ringkasan Capaian Berdasarkan 4 Perspektif AMS */}
      <section>
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
          I. Ringkasan Eksekutif: 4 Perspektif AMS (Activity Monitoring System)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 font-bold text-slate-800 uppercase">
              <tr>
                <th className="p-3">Perspektif AMS</th>
                <th className="p-3 text-center">Jumlah KPI</th>
                <th className="p-3 text-center">Rata-rata Capaian</th>
                <th className="p-3">Status Kinerja Supervisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {perspektifSummary.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{item.perspektif}</td>
                  <td className="p-3 text-center">{item.totalKpi} Indikator</td>
                  <td className="p-3 text-center font-bold text-slate-900">{item.rataCapaian}%</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        Number(item.rataCapaian) >= 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : Number(item.rataCapaian) >= 80
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Detail Capaian KPI Tim */}
      <section>
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
          II. Matriks Detail Realisasi Target vs Aktual Lapangan
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 font-bold text-slate-800 uppercase">
              <tr>
                <th className="p-2.5">Kode & Nama KPI</th>
                <th className="p-2.5">Perspektif</th>
                <th className="p-2.5 text-right">Target</th>
                <th className="p-2.5 text-right">Aktual</th>
                <th className="p-2.5 text-center">% Capaian</th>
                <th className="p-2.5">Catatan Lapangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {realisasiList.map((r) => {
                const kpi = r.kpi || {};
                const pct = Number(r.persen_capaian || 0);
                return (
                  <tr key={r.id}>
                    <td className="p-2.5">
                      <span className="font-bold text-slate-900">{kpi.kode_kpi}</span> - {kpi.nama_kpi}
                    </td>
                    <td className="p-2.5">{kpi.perspektif}</td>
                    <td className="p-2.5 text-right">
                      {formatNumber(r.target_periode)} {kpi.satuan}
                    </td>
                    <td className="p-2.5 text-right font-semibold">
                      {formatNumber(r.aktual)} {kpi.satuan}
                    </td>
                    <td className="p-2.5 text-center font-bold">
                      <span
                        className={
                          pct >= 100
                            ? 'text-emerald-700'
                            : pct >= 80
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }
                      >
                        {pct}%
                      </span>
                    </td>
                    <td className="p-2.5 italic text-slate-500">{r.catatan || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Analisis Masalah & Tindakan Korektif (CAPA) */}
      <section className="page-break">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          III. Pelaporan Masalah & Tindakan Korektif (Corrective Action Plan / CAPA)
        </h2>
        {tindakanList.length === 0 ? (
          <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded border border-slate-200">
            Tidak ada deviasi kritis yang memerlukan tindakan korektif mendesak pada periode ini.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 font-bold text-slate-800 uppercase">
                <tr>
                  <th className="p-2.5 w-1/4">Masalah (Gap Kinerja)</th>
                  <th className="p-2.5 w-1/4">Akar Penyebab (Root Cause)</th>
                  <th className="p-2.5 w-1/4">Tindakan Perbaikan Disepakati</th>
                  <th className="p-2.5 text-center">Tenggat</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 align-top">
                {tindakanList.map((t) => (
                  <tr key={t.id}>
                    <td className="p-2.5 font-semibold text-slate-900">{t.masalah}</td>
                    <td className="p-2.5 bg-slate-50 font-mono text-[11px]">{t.akar_penyebab}</td>
                    <td className="p-2.5">{t.tindakan_perbaikan}</td>
                    <td className="p-2.5 text-center whitespace-nowrap">
                      {formatDate(t.tenggat_waktu)}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Lembar Pengesahan Supervisi */}
      <section className="pt-8 border-t border-slate-200">
        <p className="text-xs text-slate-500 mb-6 italic text-center">
          Laporan ini disusun sebagai bentuk akuntabilitas supervisi operasional dan dilaporkan kepada Manajemen Puncak.
        </p>
        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <p className="text-slate-500 mb-16">Disusun Oleh (Supervisor Unit Kerja),</p>
            <p className="font-bold text-slate-900 underline text-sm">Budi Santoso, S.T.</p>
            <p className="text-slate-500">Supervisor Operasional Lapangan</p>
          </div>
          <div>
            <p className="text-slate-500 mb-16">Disetujui Oleh (Manajer Departemen),</p>
            <p className="font-bold text-slate-900 underline text-sm">Siti Rahmawati, S.E.</p>
            <p className="text-slate-500">Head of Department / Management</p>
          </div>
        </div>
      </section>
    </div>
  );
};
