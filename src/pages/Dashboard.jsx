import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleCheck, FileText, PencilLine, Target, CalendarX } from 'lucide-react';
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
} from '../lib/formatters';
import { Notice, LoadingBlock, EmptyState, ScoreBadge, StatusPill, StatusLegend } from '../components/common/Notice';
import { Section } from '../components/common/Section';
import { ScoreTrendChart } from '../components/dashboard/ScoreTrendChart';

/** Kartu angka utama. `share` = bagian dari total (bar tipis di bawah angka). */
const StatCard = ({ label, value, footer, dot, share, emphasis = false }) => (
  <div className={`card flex flex-col p-4 sm:p-5 ${emphasis ? 'border-astra-200 bg-astra-50/40' : ''}`}>
    <p className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />}
      {label}
    </p>
    <p className={`mt-2 font-semibold tabular-nums tracking-tight text-slate-900 ${emphasis ? 'text-3xl sm:text-[2rem]' : 'text-2xl sm:text-[1.75rem]'}`}>
      {value}
    </p>
    {share !== undefined && (
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className={`h-full rounded-full ${dot}`} style={{ width: `${Math.min(100, share * 100)}%` }} />
      </div>
    )}
    {footer && <div className="mt-2 text-[13px] text-slate-500">{footer}</div>}
  </div>
);

const ProgressRow = ({ label, sub, right, pct, color }) => {
  const status = getStatusByColor(color);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className={`shrink-0 font-semibold tabular-nums ${status ? status.text : 'text-slate-500'}`}>{right}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${status ? status.bar : 'bg-slate-300'}`}
          style={{ width: `${Math.min(100, Math.max(0, Number(pct) || 0))}%` }}
        />
      </div>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
};

/** Banner aksi di atas dashboard (mockup): satu kalimat + satu tombol. */
const ActionBanner = ({ icon: Icon, children, actionLabel, onAction }) => (
  <div className="flex flex-col gap-3 rounded-lg border border-astra-200 bg-astra-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div className="flex items-start gap-3 text-sm text-astra-900 sm:items-center">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-astra-600 sm:mt-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
    {actionLabel && (
      <button onClick={onAction} className="btn-primary shrink-0 self-start sm:self-auto">
        {actionLabel}
      </button>
    )}
  </div>
);

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
  const firstName = currentUser?.full_name?.split(' ')[0];

  return (
    <div className="space-y-6">
      <ActionBanner
        icon={isOpen ? PencilLine : CalendarX}
        actionLabel={isOpen && needInput > 0 ? 'Isi capaian' : null}
        onAction={() => navigate('/input-capaian')}
      >
        <p className="font-semibold">Halo, {firstName}</p>
        <p className="mt-0.5 text-astra-800">
          {isOpen
            ? needInput > 0
              ? `${needInput} indikator perlu diisi atau diperbaiki sebelum ${formatDate(selectedPeriod.end_date)}.`
              : `Semua capaian ${selectedPeriod.name} sudah diajukan.`
            : `Periode ${selectedPeriod?.name || '-'} sudah ditutup.`}
        </p>
      </ActionBanner>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          emphasis
          label="Skor capaian saya"
          value={formatPercent(myScore)}
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
        <Section className="lg:col-span-7" title="Capaian per indikator" description={selectedPeriod?.name}>
          {periodRows.length === 0 ? (
            <EmptyState compact icon={Target} title="Belum ada target">
              Supervisor belum menetapkan target untuk Anda di periode ini.
            </EmptyState>
          ) : (
            <div className="space-y-5">
              {periodRows.map((r) => (
                <ProgressRow
                  key={r.target_id}
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
                  sub={`Target ${directionSymbol(r.direction)} ${formatNumber(r.target_value)} ${r.unit}${
                    r.actual_value !== null ? `, realisasi ${formatNumber(r.actual_value)} ${r.unit}` : ''
                  }`}
                />
              ))}
            </div>
          )}
          <StatusLegend className="mt-6 border-t border-slate-100 pt-4" />
        </Section>

        <Section className="lg:col-span-5" title="Tren skor saya" description={`${trendPeriods.length} bulan terakhir`}>
          <ScoreTrendChart data={trend} label="Skor saya" />
        </Section>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// Dashboard supervisor & manajemen
// ---------------------------------------------------------------------
const StaffScoreTable = ({ summary, multiTeam }) => (
  <>
    <div className="table-wrap">
      <table className="table-base">
        <caption className="sr-only">Capaian per staf per indikator</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky-col">
              Staf
            </th>
            {summary.indicators.map((ind) => (
              <th key={ind.id} scope="col" className="text-center">
                <abbr title={ind.name} className="no-underline">
                  {ind.code}
                </abbr>
              </th>
            ))}
            <th scope="col" className="text-right">
              Skor
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {summary.staff.map((s) => {
            const status = s.color ? getStatusByColor(s.color) : null;
            return (
              <tr key={s.staff_id} className="row-hover">
                <th scope="row" className="sticky-col">
                  <span className="block whitespace-nowrap font-medium text-slate-900">{s.name}</span>
                  {multiTeam && <span className="block text-xs text-slate-500">{s.team_name}</span>}
                </th>
                {summary.indicators.map((ind) => {
                  const r = s.byIndicator[ind.id];
                  return (
                    <td key={ind.id} className="text-center">
                      {r?.achievement_pct !== null && r?.achievement_pct !== undefined ? (
                        <ScoreBadge value={r.achievement_pct} color={r.status_color} />
                      ) : (
                        <span className="whitespace-nowrap text-xs text-slate-500">
                          {r?.actual_status ? ACTUAL_STATUS[r.actual_status].label : '–'}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="text-right font-semibold tabular-nums text-slate-900">{formatPercent(s.score)}</td>
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
    <div className="space-y-3 border-t border-slate-200 px-4 py-4 sm:px-5">
      <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
        {summary.indicators.map((ind) => (
          <div key={ind.id} className="flex gap-2">
            <dt className="shrink-0 font-medium text-slate-700">{ind.code}</dt>
            <dd className="text-slate-500">{ind.name}</dd>
          </div>
        ))}
      </dl>
      <StatusLegend />
    </div>
  </>
);

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
  const share = (n) => (summary.total ? n / summary.total : 0);

  return (
    <div className="space-y-6">
      {role === ROLES.SUPERVISOR && summary.pending > 0 && (
        <ActionBanner icon={CircleCheck} actionLabel="Validasi sekarang" onAction={() => navigate('/validasi')}>
          <strong className="font-semibold">{summary.pending} data capaian</strong> menunggu validasi Anda di periode ini.
        </ActionBanner>
      )}
      {role === ROLES.MANAJEMEN && reportsWaiting > 0 && (
        <ActionBanner icon={FileText} actionLabel="Review laporan" onAction={() => navigate('/review-laporan')}>
          <strong className="font-semibold">{reportsWaiting} laporan KPI</strong> menunggu review Anda.
        </ActionBanner>
      )}

      <div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            emphasis
            label="Skor KPI tim"
            value={formatPercent(summary.teamScore)}
            footer={
              delta === null ? (
                'Belum ada pembanding bulan lalu'
              ) : (
                <>
                  <span className="font-medium text-slate-700">
                    <span aria-hidden="true">{delta >= 0 ? '▲' : '▼'}</span>
                    <span className="sr-only">{delta >= 0 ? 'Naik' : 'Turun'}</span> {formatNumber(Math.abs(delta))} poin
                  </span>{' '}
                  dari bulan lalu
                </>
              )
            }
          />
          <StatCard
            label="Tercapai"
            dot="bg-emerald-500"
            value={summary.counts.green}
            share={share(summary.counts.green)}
            footer={`dari ${summary.total} target staf`}
          />
          <StatCard
            label="Perlu perhatian"
            dot="bg-amber-500"
            value={summary.counts.yellow}
            share={share(summary.counts.yellow)}
            footer={`dari ${summary.total} target staf`}
          />
          <StatCard
            label="Kritis"
            dot="bg-rose-500"
            value={summary.counts.red}
            share={share(summary.counts.red)}
            footer={
              role === ROLES.SUPERVISOR && summary.counts.red > 0 ? (
                <Link to="/analisis-tindak-lanjut" className="link">
                  Buat tindak lanjut
                </Link>
              ) : (
                `dari ${summary.total} target staf`
              )
            }
          />
        </div>
        {summary.scored < summary.total && summary.total > 0 && (
          <p className="meta mt-3">
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
        <Section className="xl:col-span-5" title="Tren skor KPI tim" description={`${trendPeriods.length} bulan terakhir`}>
          <ScoreTrendChart data={trend} label="Skor tim" />

          <h3 className="mt-8 text-sm font-semibold">Capaian per indikator</h3>
          {summary.indicatorSummary.length === 0 ? (
            <EmptyState compact>Belum ada target di periode ini.</EmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {summary.indicatorSummary.map((ind) => (
                <ProgressRow key={ind.id} label={ind.name} right={formatPercent(ind.avg)} pct={ind.avg} color={ind.color} />
              ))}
            </div>
          )}
        </Section>

        <Section
          className="xl:col-span-7"
          title="Capaian per staf"
          description={selectedPeriod?.name}
          flush
        >
          {summary.staff.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Belum ada target staf"
              action={
                <Link to="/kelola-kpi?tab=target" className="btn-secondary">
                  Atur target
                </Link>
              }
            >
              Target staf untuk periode ini belum ditetapkan.
            </EmptyState>
          ) : (
            <StaffScoreTable summary={summary} multiTeam={multiTeam} />
          )}
        </Section>
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
    return (
      <div className="card">
        <EmptyState icon={CalendarX} title="Belum ada periode KPI">
          Tambahkan periode di tabel periods agar dashboard bisa menampilkan capaian.
        </EmptyState>
      </div>
    );
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
