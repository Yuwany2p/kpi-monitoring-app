import React from 'react';
import { ScoreTrendChart } from '../dashboard/ScoreTrendChart';
import { ScoreBadge, StatusPill } from '../common/Notice';
import { formatNumber, formatShortDate, getStatusByColor } from '../../lib/formatters';
import { mainIssueText, planStatusLabel } from '../../lib/reportContent';

const Metric = ({ label, value, dot }) => (
  <div>
    <dt className="flex items-center gap-1.5 text-[13px] text-slate-500">
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />}
      {label}
    </dt>
    <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{value}</dd>
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
          <h3 className="text-xl font-semibold tracking-tight">Laporan KPI {content.team_name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Periode {content.period_name}, disusun oleh {content.author_name}
          </p>
        </header>
      )}

      {sections.ringkasan !== false && (
        <div>
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            <Metric label="Skor tim" value={content.team_score === null ? '–' : `${Math.round(content.team_score)}%`} />
            <Metric label="Merah" value={content.counts?.red ?? 0} dot="bg-rose-500" />
            <Metric label="Kuning" value={content.counts?.yellow ?? 0} dot="bg-amber-500" />
            <Metric label="Action plan" value={(content.plans || []).length} />
          </dl>
          {content.scored < content.total && (
            <p className="meta mt-3">
              {content.total - content.scored} dari {content.total} data belum divalidasi saat laporan disusun.
            </p>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-8 ${sideBySide ? 'md:grid-cols-2' : ''}`}>
        {sections.ringkasan !== false && (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Staf</th>
                  {!compact &&
                    (content.indicators || []).map((i) => (
                      <th key={i.code} scope="col" className="text-center">
                        <abbr title={i.name} className="no-underline">
                          {i.code}
                        </abbr>
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
            <h4 className="mb-2 text-sm font-semibold">Tren skor tim</h4>
            <ScoreTrendChart data={content.trend || []} height="h-48" label="Skor tim" />
          </div>
        )}
      </div>

      {sections.kpiWarna !== false && (
        <div>
          <h4 className="text-sm font-semibold">KPI merah dan kuning</h4>
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
          <h4 className="text-sm font-semibold">Action plan</h4>
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

      <div className="inset-panel space-y-1.5 text-sm text-slate-800">
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
