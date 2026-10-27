import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  getKpiResults,
  getActionPlans,
  createActionPlan,
  updateActionPlan,
  getTeamMembers,
} from '../services/supabaseService';
import { summarizePeriod, indicatorTrend } from '../lib/kpiMetrics';
import { formatNumber, formatDate, formatShortDate, getStatusByColor, getInitials } from '../lib/formatters';
import { ROLES, PLAN_STATUS } from '../lib/constants';
import { Notice, LoadingBlock, EmptyBlock, ScoreBadge, StatusPill } from '../components/common/Notice';
import { ScoreTrendChart } from '../components/dashboard/ScoreTrendChart';

const isOverdue = (plan) => {
  if (plan.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(plan.due_date) < today;
};

const addDays = (dateStr, days) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------
// Staf: action plan yang ditujukan kepadanya (hanya baca)
// ---------------------------------------------------------------------
const StafActionPlans = () => {
  const { currentUser } = useAuth();
  const { data: plans, loading, error } = useAsyncData(() => getActionPlans({ staffId: currentUser.id }), [currentUser.id], {
    initialData: [],
  });

  return (
    <section className="card p-6">
      <h2 className="card-title">Action plan untuk Anda</h2>
      {error && <Notice type="error" className="mt-4">{error}</Notice>}
      {loading ? (
        <LoadingBlock text="Memuat action plan…" />
      ) : plans.length === 0 ? (
        <EmptyBlock>Belum ada action plan. Supervisor membuatnya jika ada KPI yang belum mencapai target.</EmptyBlock>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100">
          {plans.map((p) => (
            <li key={p.id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{p.indicator_name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {p.period_name}: realisasi {formatNumber(p.actual_value)} dari target {formatNumber(p.target_value)} {p.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ScoreBadge value={p.achievement_pct} color={p.status_color} />
                  <StatusPill className={PLAN_STATUS[p.status]?.badge}>{PLAN_STATUS[p.status]?.label}</StatusPill>
                </div>
              </div>
              <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-700">Penyebab</dt>
                  <dd className="mt-1 text-slate-600">{p.analysis}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Rencana tindakan</dt>
                  <dd className="mt-1 text-slate-600">{p.action}</dd>
                </div>
              </dl>
              <p className={`mt-3 text-sm ${isOverdue(p) ? 'text-rose-700' : 'text-slate-500'}`}>
                Penanggung jawab {p.pic_name}, selesai paling lambat {formatDate(p.due_date)}
                {isOverdue(p) && ' (lewat batas)'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------
// Supervisor
// ---------------------------------------------------------------------
const SupervisorAnalisis = () => {
  const { currentUser } = useAuth();
  const { selectedPeriod, trendPeriods } = useFilter();
  const periodIds = useMemo(() => trendPeriods.map((p) => p.id), [trendPeriods]);

  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [updatingPlanId, setUpdatingPlanId] = useState(null);

  const { data, setData, loading, error } = useAsyncData(
    async () => {
      const [rows, plans, members] = await Promise.all([
        getKpiResults({ periodIds, teamId: currentUser.team_id }),
        getActionPlans(),
        getTeamMembers(currentUser.team_id),
      ]);
      return { rows, plans, members };
    },
    [periodIds.join(',')],
    { enabled: periodIds.length > 0 }
  );

  const rows = data?.rows || [];
  const plans = data?.plans || [];
  const members = data?.members || [];
  const periodRows = rows.filter((r) => r.period_id === selectedPeriod?.id);
  const issues = summarizePeriod(periodRows).issues;

  const selectedIssue = issues.find((i) => i.target_id === selectedTargetId) || issues[0] || null;
  const existingPlan = selectedIssue ? plans.find((p) => p.score_id === selectedIssue.score_id) : null;

  const defaultForm = (issue, plan) => ({
    analysis: plan?.analysis || '',
    action: plan?.action || '',
    pic_id: plan?.pic_id || currentUser.id,
    due_date: plan?.due_date || addDays(selectedPeriod?.end_date, 14),
    status: plan?.status || 'open',
    key: issue?.target_id,
  });

  // Form mengikuti KPI yang dipilih
  const currentForm = form && form.key === selectedIssue?.target_id ? form : defaultForm(selectedIssue, existingPlan);
  const setField = (field, value) => setForm({ ...currentForm, [field]: value });

  const trend = selectedIssue
    ? indicatorTrend(rows, trendPeriods, selectedIssue.staff_id, selectedIssue.indicator_id)
    : [];

  const flash = (type, text) => {
    setMessage({ type, text });
    if (type !== 'error') setTimeout(() => setMessage(null), 5000);
  };

  const replacePlan = (plan) =>
    setData((prev) => ({
      ...prev,
      plans: prev.plans.some((p) => p.id === plan.id)
        ? prev.plans.map((p) => (p.id === plan.id ? plan : p))
        : [...prev.plans, plan],
    }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setSaving(true);
    try {
      const payload = {
        analysis: currentForm.analysis.trim(),
        action: currentForm.action.trim(),
        pic_id: currentForm.pic_id || null,
        due_date: currentForm.due_date,
        status: currentForm.status,
      };
      const saved = existingPlan
        ? await updateActionPlan(existingPlan.id, payload)
        : await createActionPlan({
            ...payload,
            score_id: selectedIssue.score_id,
            staff_id: selectedIssue.staff_id,
            supervisor_id: currentUser.id,
          });
      replacePlan(saved);
      setForm(null);
      flash('success', existingPlan ? 'Action plan diperbarui.' : 'Action plan disimpan dan bisa dilihat staf.');
    } catch (err) {
      flash('error', `Action plan belum tersimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (plan, status) => {
    setUpdatingPlanId(plan.id);
    try {
      replacePlan(await updateActionPlan(plan.id, { status }));
    } catch (err) {
      flash('error', err.message);
    } finally {
      setUpdatingPlanId(null);
    }
  };


  if (error) return <Notice type="error">{error}</Notice>;
  if (loading || !data) return <LoadingBlock text="Memuat analisis KPI…" />;

  const visiblePlans = plans.filter((p) => showDone || p.status !== 'done');
  const selectedStatus = selectedIssue ? getStatusByColor(selectedIssue.status_color) : null;
  const deviation = selectedIssue ? Number(selectedIssue.actual_value) - Number(selectedIssue.target_value) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-5">
        <section className="card p-6">
          <h2 className="card-title">KPI perlu tindak lanjut</h2>
          <p className="mt-0.5 text-sm text-slate-500">Status merah dan kuning di {selectedPeriod?.name}</p>

          {issues.length === 0 ? (
            <EmptyBlock>Semua KPI yang sudah divalidasi mencapai target.</EmptyBlock>
          ) : (
            <ul className="mt-4 max-h-[440px] space-y-2 overflow-y-auto">
              {issues.map((issue) => {
                const isSelected = selectedIssue?.target_id === issue.target_id;
                const hasPlan = plans.some((p) => p.score_id === issue.score_id);
                return (
                  <li key={issue.target_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTargetId(issue.target_id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        isSelected ? 'border-astra-600 bg-astra-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {getInitials(issue.staff_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{issue.staff_name}</span>
                        <span className="block truncate text-sm text-slate-500">
                          {issue.indicator_name}
                          {hasPlan && <span className="text-emerald-700">, ada action plan</span>}
                        </span>
                      </span>
                      <ScoreBadge value={issue.achievement_pct} color={issue.status_color} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="card-title">{showDone ? 'Semua action plan' : 'Action plan berjalan'}</h2>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => setShowDone(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-astra-600"
              />
              Tampilkan yang selesai
            </label>
          </div>
          {visiblePlans.length === 0 ? (
            <EmptyBlock>Belum ada action plan.</EmptyBlock>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {visiblePlans.map((plan) => (
                <li key={plan.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {plan.staff_name}, {plan.indicator_name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{plan.action}</p>
                    <p className={`mt-0.5 text-xs ${isOverdue(plan) ? 'font-medium text-rose-700' : 'text-slate-500'}`}>
                      Batas {formatShortDate(plan.due_date)}
                      {isOverdue(plan) && ', lewat batas'}
                    </p>
                  </div>
                  <select
                    aria-label={`Status action plan ${plan.staff_name}`}
                    value={plan.status}
                    disabled={updatingPlanId === plan.id}
                    onChange={(e) => handleStatusChange(plan, e.target.value)}
                    className="field w-auto py-1 text-xs"
                  >
                    {Object.entries(PLAN_STATUS).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-6 lg:col-span-7">
        {!selectedIssue ? (
          <EmptyBlock>Pilih KPI di sebelah kiri untuk mencatat penyebab dan rencana perbaikan.</EmptyBlock>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedIssue.staff_name}</h2>
                <p className="text-sm text-slate-500">{selectedIssue.indicator_name}</p>
              </div>
              <StatusPill className={selectedStatus?.badge}>
                {Math.round(selectedIssue.achievement_pct)}%, {selectedStatus?.label}
              </StatusPill>
            </div>

            {message && <Notice type={message.type} className="mt-4">{message.text}</Notice>}

            <dl className="mt-5 grid grid-cols-3 gap-4">
              <div>
                <dt className="text-sm text-slate-500">Target</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">
                  {formatNumber(selectedIssue.target_value)} <span className="text-sm font-medium text-slate-500">{selectedIssue.unit}</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Realisasi</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">
                  {formatNumber(selectedIssue.actual_value)} <span className="text-sm font-medium text-slate-500">{selectedIssue.unit}</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Deviasi</dt>
                <dd className={`mt-0.5 text-2xl font-bold tabular-nums ${selectedStatus?.text}`}>
                  {deviation > 0 ? '+' : ''}
                  {formatNumber(deviation)}
                </dd>
              </div>
            </dl>

            <p className="mt-6 text-sm font-medium text-slate-700">Capaian {trendPeriods.length} bulan terakhir</p>
            <ScoreTrendChart data={trend} height="h-40" color="#BE123C" label="Capaian" />

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              {existingPlan && (
                <p className="text-sm text-slate-500">
                  KPI ini sudah punya action plan. Perubahan di bawah akan memperbaruinya.
                </p>
              )}
              <div>
                <label htmlFor="analysis" className="label">Analisis penyebab</label>
                <textarea
                  id="analysis"
                  rows={3}
                  required
                  value={currentForm.analysis}
                  onChange={(e) => setField('analysis', e.target.value)}
                  placeholder="Kenapa capaian di bawah target?"
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="action" className="label">Rencana tindakan</label>
                <textarea
                  id="action"
                  rows={3}
                  required
                  value={currentForm.action}
                  onChange={(e) => setField('action', e.target.value)}
                  placeholder="Contoh: coaching, redistribusi beban kerja, perbaikan proses"
                  className="field"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="pic" className="label">Penanggung jawab</label>
                  <select id="pic" value={currentForm.pic_id} onChange={(e) => setField('pic_id', e.target.value)} className="field">
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                        {m.role === ROLES.SUPERVISOR ? ' (supervisor)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="due" className="label">Batas waktu</label>
                  <input
                    id="due"
                    type="date"
                    required
                    value={currentForm.due_date}
                    onChange={(e) => setField('due_date', e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="plan-status" className="label">Status</label>
                  <select
                    id="plan-status"
                    value={currentForm.status}
                    onChange={(e) => setField('status', e.target.value)}
                    className="field"
                  >
                    {Object.entries(PLAN_STATUS).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setForm(null)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {existingPlan ? 'Simpan perubahan' : 'Simpan action plan'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
};

export const AnalisisTindakLanjutPage = () => {
  const { role } = useAuth();
  return role === ROLES.STAF ? <StafActionPlans /> : <SupervisorAnalisis />;
};
