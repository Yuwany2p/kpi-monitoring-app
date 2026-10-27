import { summarizePeriod, trendByPeriod } from './kpiMetrics';
import { PLAN_STATUS } from './constants';

export const DEFAULT_SECTIONS = {
  ringkasan: true,
  tren: true,
  kpiWarna: true,
  actionPlan: true,
};

/**
 * Susun isi laporan (snapshot) dari data KPI satu periode.
 * Disimpan di reports.content saat dikirim sehingga manajemen melihat
 * persis apa yang dikirim supervisor.
 */
export const buildReportContent = ({
  rows,
  trendPeriods,
  period,
  plans = [],
  teamName,
  authorName,
  notes = '',
  sections = DEFAULT_SECTIONS,
}) => {
  const periodRows = rows.filter((r) => r.period_id === period.id);
  const summary = summarizePeriod(periodRows);
  const periodPlans = plans.filter((p) => p.period_id === period.id);

  return {
    version: 1,
    period_id: period.id,
    period_name: period.name,
    team_name: teamName,
    author_name: authorName,
    generated_at: new Date().toISOString(),
    sections,
    team_score: summary.teamScore,
    counts: summary.counts,
    total: summary.total,
    scored: summary.scored,
    pending: summary.pending,
    indicators: summary.indicatorSummary.map((i) => ({
      code: i.code,
      name: i.name,
      unit: i.unit,
      weight: i.weight,
      avg: i.avg,
      color: i.color,
    })),
    staff: summary.staff.map((s) => ({
      name: s.name,
      score: s.score,
      color: s.color,
      values: Object.fromEntries(
        summary.indicators.map((ind) => [ind.code, s.byIndicator[ind.id]?.achievement_pct ?? null])
      ),
    })),
    trend: trendByPeriod(rows, trendPeriods).map((t) => ({ label: t.label, score: t.score })),
    issues: summary.issues.map((r) => ({
      staff: r.staff_name,
      indicator: r.indicator_name,
      unit: r.unit,
      target: Number(r.target_value),
      actual: Number(r.actual_value),
      pct: Number(r.achievement_pct),
      color: r.status_color,
    })),
    plans: periodPlans.map((p) => ({
      staff: p.staff_name,
      indicator: p.indicator_name,
      analysis: p.analysis,
      action: p.action,
      pic: p.pic_name,
      due_date: p.due_date,
      status: p.status,
    })),
    notes,
  };
};

export const planStatusLabel = (status) => PLAN_STATUS[status]?.label || status;

export const mainIssueText = (content) => {
  const worst = [...(content.indicators || [])]
    .filter((i) => i.avg !== null && i.avg < 100)
    .sort((a, b) => a.avg - b.avg)[0];
  return worst ? `${worst.name.toLowerCase()} ${Math.round(worst.avg)}% dari target.` : 'semua indikator mencapai target.';
};

export const isContentEmpty = (content) => !content || !Array.isArray(content.staff);
