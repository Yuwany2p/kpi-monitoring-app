import React from 'react';
import { ScoreTrendChart } from '../dashboard/ScoreTrendChart';
import { ScoreBadge, StatusPill } from '../common/Notice';
import { formatNumber, formatShortDate, getStatusByColor, shortIndicatorName } from '../../lib/formatters';
import { mainIssueText, planStatusLabel } from '../../lib/reportContent';

const Metric = ({ label, value, className = 'text-slate-900' }) => (
  <div>
    <dt className="text-sm text-slate-500">{label}</dt>
    <dd className={`mt-0.5 text-3xl font-bold tabular-nums ${className}`}>{value}</dd>
  </div>
);

/** Isi laporan KPI, dipakai di halaman Laporan (supervisor) dan Review (manajemen). */
export const ReportPreview = ({ content, compact = false }) => {
  const sections = content.sections || {};
  const indicatorCodes = (content.indicators || []).map((i) => i.code);
  const openPlans = (content.plans || []).filter((p) => p.status !== 'done').length;
  const sideBySide = compact && sections.ringkasan !== false && sections.tren !== false;

  return (
    <div className="space-y-8">
      {!compact && (
        <header>
          <h3 className="text-2xl font-bold text-slate-900">Laporan KPI {content.team_name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Periode {content.period_name}, disusun oleh {content.author_name}
          </p>
        </header>
      )}

      {sections.ringkasan !== false && (
        <div>
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            <Metric label="Skor tim" value={content.team_score === null ? '–' : `${Math.round(content.team_score)}%`} />
            <Metric label="Merah" value={content.counts?.red ?? 0} className="text-rose-700" />
            <Metric label="Kuning" value={content.counts?.yellow ?? 0} className="text-amber-700" />
            <Metric label="Action plan" value={(content.plans || []).length} />
          </dl>
          {content.scored < content.total && (
            <p className="mt-3 text-sm text-amber-800">
              {content.total - content.scored} dari {content.total} data belum divalidasi saat laporan disusun.
            </p>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-8 ${sideBySide ? 'md:grid-cols-2' : ''}`}>
        {sections.ringkasan !== false && (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Staf</th>
                  {!compact &&
                    (content.indicators || []).map((i) => (
                      <th key={i.code} className="text-center" title={i.name}>
                        {shortIndicatorName(i.name)}
                      </th>
                    ))}
                  <th className="text-right">Skor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(content.staff || []).map((s) => {
                  const status = getStatusByColor(s.color);
                  return (
                    <tr key={s.name}>
                      <td className="whitespace-nowrap font-medium text-slate-900">{s.name}</td>
                      {!compact &&
                        indicatorCodes.map((c) => (
                          <td key={c} className="text-center tabular-nums text-slate-600">
                            {s.values?.[c] === null || s.values?.[c] === undefined ? '–' : `${Math.round(s.values[c])}%`}
                          </td>
                        ))}
                      <td className="text-right font-semibold tabular-nums">
                        {s.score === null ? '–' : `${Math.round(s.score)}%`}
                      </td>
                      <td>{status ? <StatusPill className={status.badge}>{status.label}</StatusPill> : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sections.tren !== false && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Tren skor tim</p>
            <ScoreTrendChart data={content.trend || []} height="h-48" label="Skor tim" />
          </div>
        )}
      </div>

      {sections.kpiWarna !== false && (
        <div>
          <h4 className="text-base font-semibold text-slate-900">KPI merah & kuning</h4>
          {(content.issues || []).length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Tidak ada KPI di bawah target.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {content.issues.map((r) => (
                <li key={`${r.staff}-${r.indicator}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-700">
                    <span className="font-medium text-slate-900">{r.staff}</span>, {r.indicator.toLowerCase()}{' '}
                    <span className="text-slate-500">
                      ({formatNumber(r.actual)} dari {formatNumber(r.target)} {r.unit})
                    </span>
                  </span>
                  <ScoreBadge value={r.pct} color={r.color} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sections.actionPlan !== false && (
        <div>
          <h4 className="text-base font-semibold text-slate-900">Action plan</h4>
          {(content.plans || []).length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Belum ada action plan.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {content.plans.map((p, idx) => (
                <li key={idx} className="flex justify-between gap-4 py-2 text-sm">
                  <span className="text-slate-700">
                    <span className="font-medium text-slate-900">{p.staff}</span>: {p.action}
                  </span>
                  <span className="whitespace-nowrap text-slate-500">
                    {formatShortDate(p.due_date)}, {planStatusLabel(p.status).toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-1.5 border-t border-slate-100 pt-5 text-sm text-slate-800">
        <p>
          <strong className="font-semibold">Masalah utama:</strong> {mainIssueText(content)}
        </p>
        <p>
          <strong className="font-semibold">Tindak lanjut:</strong> {openPlans} action plan berjalan.
        </p>
        {content.notes && (
          <p className="pt-2 text-slate-600">
            <strong className="font-semibold text-slate-800">Catatan supervisor:</strong> {content.notes}
          </p>
        )}
      </div>
    </div>
  );
};
