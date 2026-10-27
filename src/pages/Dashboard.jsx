import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleCheck, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { ROLES, ACTUAL_STATUS } from '../lib/constants';
import { getKpiResults, getActionPlans, countReportsToReview } from '../services/supabaseService';
import { useAsyncData } from '../hooks/useAsyncData';
import { summarizePeriod, trendByPeriod } from '../lib/kpiMetrics';
import {
  formatDate,
  formatNumber,
  formatPercent,
  getStatusByColor,
  getStatusByScore,
  directionSymbol,
  shortIndicatorName,
} from '../lib/formatters';
import { Notice, LoadingBlock, EmptyBlock, ScoreBadge, StatusPill } from '../components/common/Notice';
import { ScoreTrendChart } from '../components/dashboard/ScoreTrendChart';

const StatCard = ({ label, value, valueClass = 'text-slate-900', footer }) => (
  <div className="card p-4 sm:p-5">
    <p className="text-sm text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${valueClass}`}>{value}</p>
    {footer && <div className="mt-1 text-sm text-slate-500">{footer}</div>}
  </div>
);

const ProgressRow = ({ label, right, pct, color }) => {
  const status = getStatusByColor(color);
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-3 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className={`font-semibold tabular-nums ${status ? 'text-slate-900' : 'text-slate-400'}`}>{right}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${status ? status.bar : 'bg-slate-300'}`}
          style={{ width: `${Math.min(100, Math.max(0, Number(pct) || 0))}%` }}
        />
      </div>
    </div>
  );
};

const Legend = () => (
  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Hijau ≥ 100%
    </span>
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-amber-500" /> Kuning 80–99%
    </span>
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-rose-500" /> Merah &lt; 80%
    </span>
  </div>
);

const ActionBanner = ({ tone = 'amber', icon: Icon, children, actionLabel, onAction }) => {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    blue: 'border-astra-100 bg-astra-50 text-astra-900',
  };
  return (
    <div className={`flex flex-col gap-3 rounded-xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${tones[tone]}`}>
      <p className="flex items-center gap-3 text-sm sm:text-base">
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{children}</span>
      </p>
      <button onClick={onAction} className="btn-primary shrink-0">
        {actionLabel}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------
// Dashboard staf
// ---------------------------------------------------------------------
const StafDashboard = ({ rows, plans, trendPeriods, selectedPeriod }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const periodRows = rows.filter((r) => r.period_id === selectedPeriod?.id);
  const summary = summarizePeriod(periodRows);
  const myScore = summary.staff[0]?.score ?? null;
  const myStatus = myScore !== null ? getStatusByScore(myScore) : null;
  const trend = trendByPeriod(rows, trendPeriods);
  const openPlans = plans.filter((p) => p.status !== 'done');
  const needInput = summary.notSubmitted + summary.rejected;
  const isOpen = selectedPeriod?.status === 'open';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-astra-100 bg-astra-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-astra-900">Halo, {currentUser?.full_name}</p>
          <p className="mt-0.5 text-sm text-astra-800">
            {isOpen
              ? needInput > 0
                ? `${needInput} indikator perlu diisi atau diperbaiki sebelum ${formatDate(selectedPeriod.end_date)}.`
                : `Semua capaian ${selectedPeriod.name} sudah diajukan.`
              : `Periode ${selectedPeriod?.name || '-'} sudah ditutup.`}
          </p>
        </div>
        {isOpen && needInput > 0 && (
          <button onClick={() => navigate('/input-capaian')} className="btn-primary shrink-0">
            Isi capaian
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Skor capaian saya"
          value={formatPercent(myScore)}
          valueClass={myStatus ? myStatus.text : 'text-slate-900'}
          footer={myStatus ? `${myStatus.label} (${myStatus.description})` : 'Belum ada data yang divalidasi'}
        />
        <StatCard
          label="Menunggu validasi"
          value={summary.pending}
          footer={
            summary.rejected > 0
              ? `${summary.rejected} dikembalikan, perlu diperbaiki`
              : `${summary.scored} dari ${summary.total} indikator sudah valid`
          }
        />
        <StatCard
          label="Action plan aktif"
          value={openPlans.length}
          footer={openPlans[0] ? `Batas terdekat ${formatDate(openPlans[0].due_date)}` : 'Tidak ada action plan aktif'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="card p-6 lg:col-span-7">
          <h2 className="card-title">Capaian per indikator</h2>
          {periodRows.length === 0 ? (
            <EmptyBlock>Supervisor belum menetapkan target untuk Anda di periode ini.</EmptyBlock>
          ) : (
            <div className="mt-5 space-y-5">
              {periodRows.map((r) => (
                <div key={r.target_id}>
                  <ProgressRow
                    label={r.indicator_name}
                    right={
                      r.achievement_pct !== null
                        ? formatPercent(r.achievement_pct)
                        : r.actual_status
                          ? ACTUAL_STATUS[r.actual_status].label
                          : 'Belum diisi'
                    }
                    pct={r.achievement_pct}
                    color={r.status_color}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Target {directionSymbol(r.direction)} {formatNumber(r.target_value)} {r.unit}
                    {r.actual_value !== null && `, realisasi ${formatNumber(r.actual_value)} ${r.unit}`}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <Legend />
          </div>
        </section>

        <section className="card p-6 lg:col-span-5">
          <div className="flex items-baseline justify-between">
            <h2 className="card-title">Tren skor saya</h2>
            <span className="text-sm text-slate-500">{trendPeriods.length} bulan terakhir</span>
          </div>
          <div className="mt-4">
            <ScoreTrendChart data={trend} label="Skor saya" />
          </div>
        </section>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// Dashboard supervisor & manajemen
// ---------------------------------------------------------------------
const TeamDashboard = ({ rows, trendPeriods, selectedPeriod, previousPeriod, role, reportsWaiting }) => {
  const navigate = useNavigate();
  const periodRows = rows.filter((r) => r.period_id === selectedPeriod?.id);
  const summary = summarizePeriod(periodRows);
  const trend = trendByPeriod(rows, trendPeriods);
  const prevScore = previousPeriod ? trend.find((t) => t.periodId === previousPeriod.id)?.score : null;
  const delta =
    summary.teamScore !== null && prevScore !== null && prevScore !== undefined
      ? Math.round((summary.teamScore - prevScore) * 10) / 10
      : null;
  const multiTeam = new Set(summary.staff.map((s) => s.team_name)).size > 1;

  return (
    <div className="space-y-6">
      {role === ROLES.SUPERVISOR && summary.pending > 0 && (
        <ActionBanner icon={CircleCheck} actionLabel="Validasi sekarang" onAction={() => navigate('/validasi')}>
          <strong className="font-semibold">{summary.pending} data capaian</strong> menunggu validasi Anda untuk
          periode ini.
        </ActionBanner>
      )}
      {role === ROLES.MANAJEMEN && reportsWaiting > 0 && (
        <ActionBanner tone="blue" icon={FileText} actionLabel="Review sekarang" onAction={() => navigate('/review-laporan')}>
          <strong className="font-semibold">{reportsWaiting} laporan KPI</strong> menunggu review Anda.
        </ActionBanner>
      )}

      <div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Skor KPI tim"
            value={formatPercent(summary.teamScore)}
            footer={
              delta === null
                ? 'Belum ada pembanding bulan lalu'
                : `${delta >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(delta))} poin dari bulan lalu`
            }
          />
          <StatCard
            label="KPI tercapai (hijau)"
            value={summary.counts.green}
            valueClass="text-emerald-700"
            footer={`dari ${summary.total} indikator-staf`}
          />
          <StatCard
            label="Perlu perhatian (kuning)"
            value={summary.counts.yellow}
            valueClass="text-amber-700"
            footer={`dari ${summary.total} indikator-staf`}
          />
          <StatCard
            label="Kritis (merah)"
            value={summary.counts.red}
            valueClass="text-rose-700"
            footer={
              role === ROLES.SUPERVISOR && summary.counts.red > 0 ? (
                <Link to="/analisis-tindak-lanjut" className="font-medium text-astra-600 hover:underline">
                  Buat tindak lanjut
                </Link>
              ) : (
                'butuh tindak lanjut'
              )
            }
          />
        </div>
        {summary.scored < summary.total && summary.total > 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Skor dihitung dari {summary.scored} dari {summary.total} data yang sudah divalidasi. Sisanya{' '}
            {[
              summary.pending && `${summary.pending} menunggu validasi`,
              summary.rejected && `${summary.rejected} dikembalikan ke staf`,
              summary.notSubmitted && `${summary.notSubmitted} belum diisi`,
            ]
              .filter(Boolean)
              .join(', ')}
            .
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="card p-6 xl:col-span-6">
          <div className="flex items-baseline justify-between">
            <h2 className="card-title">Tren skor KPI tim</h2>
            <span className="text-sm text-slate-500">{trendPeriods.length} bulan terakhir</span>
          </div>
          <div className="mt-4">
            <ScoreTrendChart data={trend} label="Skor tim" />
          </div>

          <h3 className="mt-6 text-base font-semibold text-slate-900">Capaian per indikator</h3>
          {summary.indicatorSummary.length === 0 ? (
            <EmptyBlock>Belum ada target di periode ini.</EmptyBlock>
          ) : (
            <div className="mt-4 space-y-4">
              {summary.indicatorSummary.map((ind) => (
                <ProgressRow key={ind.id} label={ind.name} right={formatPercent(ind.avg)} pct={ind.avg} color={ind.color} />
              ))}
            </div>
          )}
        </section>

        <section className="card flex flex-col p-6 xl:col-span-6">
          <div className="flex items-baseline justify-between">
            <h2 className="card-title">Capaian per staf</h2>
            <span className="text-sm text-slate-500">{selectedPeriod?.name}</span>
          </div>

          {summary.staff.length === 0 ? (
            <EmptyBlock>Belum ada target staf di periode ini. Atur di menu Kelola KPI & Target.</EmptyBlock>
          ) : (
            <div className="-mx-2 mt-4 flex-1 overflow-x-auto px-2">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Staf</th>
                    {summary.indicators.map((ind) => (
                      <th key={ind.id} className="text-center" title={ind.name}>
                        {shortIndicatorName(ind.name)}
                      </th>
                    ))}
                    <th className="text-right">Skor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.staff.map((s) => {
                    const status = s.color ? getStatusByColor(s.color) : null;
                    return (
                      <tr key={s.staff_id}>
                        <td>
                          <p className="whitespace-nowrap font-semibold text-slate-900">{s.name}</p>
                          {multiTeam && <p className="text-xs text-slate-500">{s.team_name}</p>}
                        </td>
                        {summary.indicators.map((ind) => {
                          const r = s.byIndicator[ind.id];
                          return (
                            <td key={ind.id} className="text-center">
                              {r?.achievement_pct !== null && r?.achievement_pct !== undefined ? (
                                <ScoreBadge value={r.achievement_pct} color={r.status_color} />
                              ) : (
                                <span className="text-xs text-slate-400">
                                  {r?.actual_status ? ACTUAL_STATUS[r.actual_status].label : '–'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-right font-semibold tabular-nums">{formatPercent(s.score)}</td>
                        <td>
                          {status ? (
                            <StatusPill className={status.badge}>{status.label}</StatusPill>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <Legend />
          </div>
        </section>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { role, currentUser } = useAuth();
  const { trendPeriods, selectedPeriod, previousPeriod, selectedTeamId, loading: filterLoading, error: filterError } =
    useFilter();
  const periodIds = useMemo(() => trendPeriods.map((p) => p.id), [trendPeriods]);
  const isStaf = role === ROLES.STAF;

  const { data, loading, error } = useAsyncData(
    async () => {
      const [rows, plans, reportsWaiting] = await Promise.all([
        getKpiResults({ periodIds, teamId: isStaf ? null : selectedTeamId, staffId: isStaf ? currentUser.id : null }),
        isStaf ? getActionPlans({ staffId: currentUser.id }) : Promise.resolve([]),
        role === ROLES.MANAJEMEN ? countReportsToReview() : Promise.resolve(0),
      ]);
      return { rows, plans, reportsWaiting };
    },
    [periodIds.join(','), selectedTeamId, role],
    { enabled: periodIds.length > 0 }
  );

  if (filterError) return <Notice type="error">Periode tidak bisa dimuat: {filterError}</Notice>;
  if (!filterLoading && periodIds.length === 0) {
    return <Notice>Belum ada periode KPI. Tambahkan periode di tabel periods.</Notice>;
  }
  if (error) return <Notice type="error">Dashboard tidak bisa dimuat: {error}</Notice>;
  if (loading || filterLoading || !data) return <LoadingBlock text="Memuat dashboard…" />;

  return isStaf ? (
    <StafDashboard rows={data.rows} plans={data.plans} trendPeriods={trendPeriods} selectedPeriod={selectedPeriod} />
  ) : (
    <TeamDashboard
      rows={data.rows}
      trendPeriods={trendPeriods}
      selectedPeriod={selectedPeriod}
      previousPeriod={previousPeriod}
      role={role}
      reportsWaiting={data.reportsWaiting}
    />
  );
};
