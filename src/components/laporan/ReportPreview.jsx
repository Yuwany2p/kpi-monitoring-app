import React from 'react';
import { ScoreTrendChart } from '../dashboard/ScoreTrendChart';
import { ScoreBadge } from '../common/Notice';
import { formatNumber, formatShortDate, getStatusByColor } from '../../lib/formatters';
import { mainIssueText, planStatusLabel } from '../../lib/reportContent';

/** Tampilan isi laporan KPI (dipakai di halaman Laporan & Review). */
export const ReportPreview = ({ content, compact = false }) => {
  const sections = content.sections || {};
  const indicatorCodes = (content.indicators || []).map((i) => i.code);
  const openPlans = (content.plans || []).filter((p) => p.status !== 'done').length;

  return (
    <div className="space-y-6">
      {!compact && (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Laporan KPI {content.team_name}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Periode {content.period_name} · Disusun oleh {content.author_name}
          </p>
        </div>
      )}

      {sections.ringkasan !== false && (
        <>
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-xs text-slate-400 font-medium">Skor tim</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-0.5">
                {content.team_score === null ? '-' : `${Math.round(content.team_score)}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Merah</p>
              <p className="text-3xl font-extrabold text-rose-600 mt-0.5">{content.counts?.red ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Kuning</p>
              <p className="text-3xl font-extrabold text-amber-600 mt-0.5">{content.counts?.yellow ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Action plan</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-0.5">{(content.plans || []).length}</p>
            </div>
          </div>
          {content.scored < content.total && (
            <p className="text-[11px] text-amber-700">
              {content.total - content.scored} dari {content.total} data belum tervalidasi saat laporan disusun.
            </p>
          )}
        </>
      )}

      <div
        className={`grid grid-cols-1 ${compact && sections.ringkasan !== false && sections.tren !== false ? 'md:grid-cols-2' : ''} gap-6`}
      >
        {sections.ringkasan !== false && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2.5 font-medium">Staf</th>
                  {!compact &&
                    (content.indicators || []).map((i) => (
                      <th key={i.code} className="pb-2.5 text-center font-medium" title={i.name}>
                        {i.name.split(' ')[0]}
                      </th>
                    ))}
                  <th className="pb-2.5 text-center font-medium">Skor</th>
                  <th className="pb-2.5 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(content.staff || []).map((s) => {
                  const status = getStatusByColor(s.color);
                  return (
                    <tr key={s.name}>
                      <td className="py-2.5 font-semibold text-slate-800">{s.name}</td>
                      {!compact &&
                        indicatorCodes.map((c) => (
                          <td key={c} className="py-2.5 text-center text-slate-600">
                            {s.values?.[c] === null || s.values?.[c] === undefined ? '–' : `${Math.round(s.values[c])}%`}
                          </td>
                        ))}
                      <td className="py-2.5 text-center font-bold text-slate-900">
                        {s.score === null ? '-' : `${Math.round(s.score)}%`}
                      </td>
                      <td className="py-2.5 text-center">
                        {status ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${status.badge}`}>
                            {status.label}
                          </span>
                        ) : (
                          '–'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sections.tren !== false && (
          <ScoreTrendChart data={content.trend || []} height="h-44" label="Skor tim" />
        )}
      </div>

      {sections.kpiWarna !== false && (
        <div>
          <h4 className="font-bold text-slate-900 text-xs mb-2">KPI Merah & Kuning</h4>
          {(content.issues || []).length === 0 ? (
            <p className="text-xs text-slate-400">Tidak ada KPI merah/kuning.</p>
          ) : (
            <div className="space-y-1.5">
              {content.issues.map((r) => (
                <div key={`${r.staff}-${r.indicator}`} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">
                    <strong>{r.staff}</strong> · {r.indicator} ({formatNumber(r.actual)} / {formatNumber(r.target)} {r.unit})
                  </span>
                  <ScoreBadge value={r.pct} color={r.color} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sections.actionPlan !== false && (
        <div>
          <h4 className="font-bold text-slate-900 text-xs mb-2">Action Plan</h4>
          {(content.plans || []).length === 0 ? (
            <p className="text-xs text-slate-400">Belum ada action plan.</p>
          ) : (
            <div className="space-y-1.5">
              {content.plans.map((p, idx) => (
                <div key={idx} className="text-xs text-slate-700 flex justify-between gap-3">
                  <span>
                    <strong>{p.staff}</strong> · {p.action}
                  </span>
                  <span className="text-slate-400 whitespace-nowrap">
                    {formatShortDate(p.due_date)} · {planStatusLabel(p.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-slate-100 space-y-1.5 text-xs">
        <p className="text-slate-800">
          <strong className="font-bold">Masalah utama:</strong> {mainIssueText(content)}
        </p>
        <p className="text-slate-800">
          <strong className="font-bold">Tindak lanjut:</strong> {openPlans} action plan berjalan.
        </p>
        {content.notes && <p className="text-slate-600 italic pt-1">Catatan supervisor: “{content.notes}”</p>}
      </div>
    </div>
  );
};
