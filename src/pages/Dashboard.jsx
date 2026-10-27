import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
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
import { Notice, LoadingBlock, EmptyBlock, ScoreBadge } from '../components/common/Notice';
import { ScoreTrendChart } from '../components/dashboard/ScoreTrendChart';

const StatCard = ({ label, value, valueClass = 'text-slate-900', footer }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <div className="mt-2 text-3xl font-extrabold">
      <span className={valueClass}>{value}</span>
    </div>
    {footer && <div className="text-xs text-slate-500 mt-2 font-medium">{footer}</div>}
  </div>
);

const ProgressRow = ({ label, right, pct, color }) => {
  const status = getStatusByColor(color);
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs font-semibold mb-1">
        <span className="text-slate-700">{label}</span>
        <span className={status ? status.text : 'text-slate-400'}>{right}</span>
      </div>
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div
          className={`${status ? status.bar : 'bg-slate-300'} h-full rounded-full`}
          style={{ width: `${Math.min(100, Math.max(0, Number(pct) || 0))}%` }}
        />
      </div>
    </div>
  );
};

const Legend = () => (
  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-500 font-medium flex-wrap">
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
);

// ---------------------------------------------------------------------
// Dashboard Staf
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
  const nextDue = openPlans[0]?.due_date;
  const needInput = summary.notSubmitted + summary.rejected;

  return (
    <div className="space-y-6">
      <div className="bg-astra-50 border border-astra-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-astra-900">Halo, {currentUser?.full_name}!</h2>
          <p className="text-xs text-astra-700 mt-0.5">
            {selectedPeriod?.status === 'open'
              ? `Batas pengisian capaian KPI periode ${selectedPeriod.name} adalah ${formatDate(selectedPeriod.end_date)}.`
              : `Periode ${selectedPeriod?.name || '-'} sudah ditutup.`}
            {needInput > 0 && selectedPeriod?.status === 'open' && ` ${needInput} indikator perlu diisi/diperbaiki.`}
          </p>
        </div>
        {selectedPeriod?.status === 'open' && (
          <button
            onClick={() => navigate('/input-capaian')}
            className="px-4 py-2 bg-astra-800 hover:bg-astra-900 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 cursor-pointer"
          >
            Input Capaian Sekarang
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Skor Capaian Saya"
          value={formatPercent(myScore)}
          footer={
            myStatus ? (
              <span className={`inline-block px-2.5 py-0.5 rounded-full font-semibold ${myStatus.badge}`}>
                {myStatus.label} ({myStatus.description})
              </span>
            ) : (
              'Belum ada data tervalidasi'
            )
          }
        />
        <StatCard
          label="Status Validasi"
          value={`${summary.pending} Menunggu`}
          valueClass="text-amber-600"
          footer={
            summary.rejected > 0
              ? `${summary.rejected} ditolak, perlu diperbaiki`
              : `${summary.scored} dari ${summary.total} indikator sudah valid`
          }
        />
        <StatCard
          label="Action Plan Ditugaskan"
          value={`${openPlans.length} Terbuka`}
          valueClass="text-astra-800"
          footer={nextDue ? `Batas terdekat: ${formatDate(nextDue)}` : 'Tidak ada action plan aktif'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">Rincian Capaian Indikator Saya</h3>
          {periodRows.length === 0 ? (
            <EmptyBlock>Belum ada target KPI untuk Anda di periode ini.</EmptyBlock>
          ) : (
            <div className="space-y-4">
              {periodRows.map((r) => (
                <ProgressRow
                  key={r.target_id}
                  label={`${r.indicator_name} (Target: ${directionSymbol(r.direction)} ${formatNumber(r.target_value)} ${r.unit})`}
                  right={
                    r.achievement_pct !== null
                      ? `${formatNumber(r.actual_value)} ${r.unit} (${formatPercent(r.achievement_pct)} · ${getStatusByColor(r.status_color)?.label})`
                      : r.actual_status
                        ? ACTUAL_STATUS[r.actual_status].label
                        : 'Belum diisi'
                  }
                  pct={r.achievement_pct}
                  color={r.status_color}
                />
              ))}
            </div>
          )}
          <Legend />
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Tren Skor Saya</h3>
            <span className="text-xs text-slate-400">{trendPeriods.length} periode terakhir</span>
          </div>
          <ScoreTrendChart data={trend} label="Skor saya" />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// Dashboard Supervisor & Manajemen
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
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-800 shrink-0" />
            <p className="text-xs sm:text-sm text-amber-900 font-medium">
              <strong className="font-bold text-amber-950">{summary.pending} data capaian</strong> menunggu
              validasi Anda untuk periode ini.
            </p>
          </div>
          <button
            onClick={() => navigate('/validasi')}
            className="px-4 py-2 bg-astra-800 hover:bg-astra-900 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 transition-colors cursor-pointer"
          >
            Validasi sekarang
          </button>
        </div>
      )}

      {role === ROLES.MANAJEMEN && reportsWaiting > 0 && (
        <div className="bg-astra-50 border border-astra-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-astra-800 shrink-0" />
            <p className="text-xs sm:text-sm text-astra-900 font-medium">
              <strong className="font-bold">{reportsWaiting} laporan KPI</strong> menunggu review Anda.
            </p>
          </div>
          <button
            onClick={() => navigate('/review-laporan')}
            className="px-4 py-2 bg-astra-800 hover:bg-astra-900 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 cursor-pointer"
          >
            Review sekarang
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Skor KPI Tim"
          value={formatPercent(summary.teamScore)}
          footer={
            delta === null ? (
              'Belum ada pembanding periode lalu'
            ) : (
              <span className={delta >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} poin dari periode lalu
              </span>
            )
          }
        />
        <StatCard
          label="KPI Tercapai (Hijau)"
          value={summary.counts.green}
          valueClass="text-emerald-600"
          footer={`dari ${summary.total} indikator-staf`}
        />
        <StatCard
          label="Perlu Perhatian (Kuning)"
          value={summary.counts.yellow}
          valueClass="text-amber-600"
          footer={`dari ${summary.total} indikator-staf`}
        />
        <StatCard
          label="Kritis (Merah)"
          value={summary.counts.red}
          valueClass="text-rose-600"
          footer="butuh tindak lanjut"
        />
      </div>

      {summary.scored < summary.total && summary.total > 0 && (
        <Notice type="info">
          {summary.total - summary.scored} dari {summary.total} data belum tervalidasi (menunggu:{' '}
          {summary.pending}, ditolak: {summary.rejected}, belum diisi: {summary.notSubmitted}). Skor
          dihitung dari data yang sudah valid saja.
        </Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Tren Skor KPI Tim</h3>
              <span className="text-xs text-slate-400">{trendPeriods.length} periode terakhir</span>
            </div>
            <ScoreTrendChart data={trend} label="Skor tim" />
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs mb-3.5">Capaian per Indikator</h4>
            {summary.indicatorSummary.length === 0 ? (
              <EmptyBlock>Belum ada target di periode ini.</EmptyBlock>
            ) : (
              <div className="space-y-3.5">
                {summary.indicatorSummary.map((ind) => (
                  <ProgressRow
                    key={ind.id}
                    label={ind.name}
                    right={formatPercent(ind.avg)}
                    pct={ind.avg}
                    color={ind.color}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Capaian per Staf</h3>
              <span className="text-xs text-slate-400">{selectedPeriod?.name}</span>
            </div>

            {summary.staff.length === 0 ? (
              <EmptyBlock>Belum ada data capaian staf di periode ini.</EmptyBlock>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                      <th className="pb-3 font-medium">Staf</th>
                      {summary.indicators.map((ind) => (
                        <th key={ind.id} className="pb-3 text-center font-medium" title={ind.name}>
                          {ind.name.split(' ')[0]}
                        </th>
                      ))}
                      <th className="pb-3 text-center font-medium">Skor</th>
                      <th className="pb-3 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.staff.map((s) => {
                      const status = s.color ? getStatusByColor(s.color) : null;
                      return (
                        <tr key={s.staff_id} className="hover:bg-slate-50/60">
                          <td className="py-3">
                            <p className="font-bold text-slate-800">{s.name}</p>
                            {multiTeam && <p className="text-[10px] text-slate-400">{s.team_name}</p>}
                          </td>
                          {summary.indicators.map((ind) => {
                            const r = s.byIndicator[ind.id];
                            return (
                              <td key={ind.id} className="py-3 text-center">
                                {r?.achievement_pct !== null && r?.achievement_pct !== undefined ? (
                                  <ScoreBadge value={r.achievement_pct} color={r.status_color} />
                                ) : (
                                  <span className="text-[10px] text-slate-400" title="Belum tervalidasi">
                                    {r?.actual_status ? ACTUAL_STATUS[r.actual_status].label : '–'}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-3 text-center font-bold text-slate-900">{formatPercent(s.score)}</td>
                          <td className="py-3 text-center">
                            {status ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${status.badge}`}>
                                {status.label}
                              </span>
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
          </div>
          <Legend />
        </div>
      </div>

      {summary.counts.red > 0 && role === ROLES.SUPERVISOR && (
        <Notice type="warning">
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Ada {summary.counts.red} KPI berstatus merah.
          </span>{' '}
          <button onClick={() => navigate('/analisis-tindak-lanjut')} className="underline cursor-pointer">
            Buat analisis & action plan
          </button>
        </Notice>
      )}
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

  if (filterError) return <Notice type="error">Gagal memuat periode: {filterError}</Notice>;
  if (!filterLoading && periodIds.length === 0) {
    return <Notice type="info">Belum ada periode KPI. Tambahkan periode di database terlebih dahulu.</Notice>;
  }
  if (error) return <Notice type="error">Gagal memuat dashboard: {error}</Notice>;
  if (loading || filterLoading || !data) return <LoadingBlock text="Memuat dashboard..." />;

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
