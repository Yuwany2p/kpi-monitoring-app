import React, { useMemo, useState } from 'react';
import { Loader2, ClipboardList, CircleCheck, MousePointerClick } from 'lucide-react';
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
import { formatNumber, formatShortDate, getStatusByColor, getInitials } from '../lib/formatters';
import { ROLES, PLAN_STATUS } from '../lib/constants';
import { Notice, LoadingBlock, EmptyState, ScoreBadge, StatusPill } from '../components/common/Notice';
import { Section } from '../components/common/Section';
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

const DueText = ({ plan, prefix = 'Batas' }) => (
  <span className={isOverdue(plan) ? 'font-medium text-rose-700' : 'text-slate-500'}>
    {prefix} {formatShortDate(plan.due_date)}
    {isOverdue(plan) && ', lewat batas'}
  </span>
);

// ---------------------------------------------------------------------
// Staf: action plan yang ditujukan kepadanya (hanya baca)
// ---------------------------------------------------------------------
const StafActionPlans = () => {
  const { currentUser } = useAuth();
  const { data: plans, loading, error } = useAsyncData(() => getActionPlans({ staffId: currentUser.id }), [currentUser.id], {
    initialData: [],
  });

  return (
    <Section flush title="Action plan untuk Anda" description="Disusun supervisor untuk KPI yang belum mencapai target">
      {error && <Notice type="error" className="m-4 sm:m-5">{error}</Notice>}
      {loading ? (
        <LoadingBlock text="Memuat action plan…" />
      ) : plans.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Belum ada action plan">
          Supervisor membuat action plan jika ada KPI Anda yang belum mencapai target.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {plans.map((p) => (
            <li key={p.id} className="px-4 py-5 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{p.indicator_name}</p>
                  <p className="meta mt-0.5">
                    {p.period_name}: realisasi {formatNumber(p.actual_value)} dari target {formatNumber(p.target_value)} {p.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ScoreBadge value={p.achievement_pct} color={p.status_color} />
                  <StatusPill className={PLAN_STATUS[p.status]?.badge}>{PLAN_STATUS[p.status]?.label}</StatusPill>
                </div>
              </div>
              <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <div className="inset-panel">
                  <dt className="font-medium text-slate-700">Akar penyebab</dt>
                  <dd className="mt-1 text-slate-600">{p.analysis}</dd>
                </div>
                <div className="inset-panel">
                  <dt className="font-medium text-slate-700">Tindakan perbaikan</dt>
                  <dd className="mt-1 text-slate-600">{p.action}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[13px] text-slate-500">
                Penanggung jawab {p.pic_name}. <DueText plan={p} prefix="Selesai paling lambat" />
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
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
  const formDirty = form !== null && form.key === selectedIssue?.target_id;

  const trend = selectedIssue ? indicatorTrend(rows, trendPeriods, selectedIssue.staff_id, selectedIssue.indicator_id) : [];

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
      flash('success', existingPlan ? 'Action plan diperbarui.' : 'Action plan disimpan dan sudah bisa dilihat staf.');
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
  const doneCount = plans.filter((p) => p.status === 'done').length;
  const selectedStatus = selectedIssue ? getStatusByColor(selectedIssue.status_color) : null;
  const deviation = selectedIssue ? Number(selectedIssue.actual_value) - Number(selectedIssue.target_value) : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Daftar masalah */}
        <Section
          flush
          className="lg:col-span-5 lg:self-start"
          title="KPI perlu tindak lanjut"
          description={`Status merah dan kuning di ${selectedPeriod?.name || '-'}, terendah di atas`}
        >
          {issues.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Tidak ada KPI bermasalah">
              Semua KPI yang sudah divalidasi di periode ini mencapai target.
            </EmptyState>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
              {issues.map((issue) => {
                const isSelected = selectedIssue?.target_id === issue.target_id;
                const hasPlan = plans.some((p) => p.score_id === issue.score_id);
                return (
                  <li key={issue.target_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTargetId(issue.target_id)}
                      aria-pressed={isSelected}
                      className={`relative flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:-outline-offset-2 sm:px-5 ${
                        isSelected
                          ? 'bg-astra-50 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-astra-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {getInitials(issue.staff_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{issue.staff_name}</span>
                        <span className="block truncate text-[13px] text-slate-500">{issue.indicator_name}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <ScoreBadge value={issue.achievement_pct} color={issue.status_color} />
                        <span className="text-xs text-slate-500">{hasPlan ? 'Ada action plan' : 'Belum ditangani'}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Ruang kerja analisis */}
        <section className="card lg:col-span-7" aria-labelledby="analisis-title">
          {!selectedIssue ? (
            <EmptyState icon={MousePointerClick} title="Belum ada KPI yang dipilih">
              Pilih KPI di daftar untuk mencatat akar penyebab dan tindakan perbaikan.
            </EmptyState>
          ) : (
            <>
              <div className="card-header">
                <div>
                  <h2 id="analisis-title" className="section-title">
                    {selectedIssue.staff_name}
                  </h2>
                  <p className="section-desc">
                    {selectedIssue.indicator_code} {selectedIssue.indicator_name}
                  </p>
                </div>
                <StatusPill className={selectedStatus?.badge}>
                  {Math.round(selectedIssue.achievement_pct)}% {selectedStatus?.label.toLowerCase()}
                </StatusPill>
              </div>

              <div className="card-body space-y-6">
                {message && (
                  <Notice type={message.type} onDismiss={() => setMessage(null)}>
                    {message.text}
                  </Notice>
                )}

                <div>
                  <h3 className="text-sm font-semibold">Masalah</h3>
                  <dl className="mt-3 grid grid-cols-3 divide-x divide-slate-200 rounded-md border border-slate-200">
                    {[
                      ['Target', formatNumber(selectedIssue.target_value), selectedIssue.unit],
                      ['Realisasi', formatNumber(selectedIssue.actual_value), selectedIssue.unit],
                      ['Selisih', `${deviation > 0 ? '+' : ''}${formatNumber(deviation)}`, selectedIssue.unit],
                    ].map(([label, value, unit]) => (
                      <div key={label} className="px-3 py-3 sm:px-4">
                        <dt className="text-[13px] text-slate-500">{label}</dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">
                          {value} <span className="text-[13px] font-normal text-slate-500">{unit}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-[13px] font-medium text-slate-600">Capaian {trendPeriods.length} bulan terakhir</p>
                  <ScoreTrendChart data={trend} height="h-40" label="Capaian" />
                </div>

                <form onSubmit={handleSave} className="space-y-4 border-t border-slate-200 pt-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold">{existingPlan ? 'Action plan' : 'Buat action plan'}</h3>
                    {existingPlan && <span className="meta">Perubahan akan memperbarui action plan yang ada</span>}
                  </div>
                  <div>
                    <label htmlFor="analysis" className="label">
                      Akar penyebab
                    </label>
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
                    <label htmlFor="action" className="label">
                      Tindakan perbaikan
                    </label>
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <div>
                      <label htmlFor="pic" className="label">
                        Penanggung jawab
                      </label>
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
                      <label htmlFor="due" className="label">
                        Batas waktu
                      </label>
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
                      <label htmlFor="plan-status" className="label">
                        Status
                      </label>
                      <select id="plan-status" value={currentForm.status} onChange={(e) => setField('status', e.target.value)} className="field">
                        {Object.entries(PLAN_STATUS).map(([key, cfg]) => (
                          <option key={key} value={key}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    {formDirty && (
                      <button type="button" onClick={() => setForm(null)} className="btn-ghost">
                        Batalkan perubahan
                      </button>
                    )}
                    <button type="submit" disabled={saving} className="btn-primary">
                      {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      {existingPlan ? 'Simpan perubahan' : 'Simpan action plan'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Pemantauan action plan */}
      <Section
        flush
        title={showDone ? 'Semua action plan' : 'Action plan berjalan'}
        description="Ubah status langsung dari daftar ini"
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
              className="h-4 w-4 rounded border-control text-astra-600 focus:ring-astra-600"
            />
            Tampilkan yang selesai ({doneCount})
          </label>
        }
      >
        {visiblePlans.length === 0 ? (
          <EmptyState compact icon={ClipboardList}>
            {plans.length === 0 ? 'Belum ada action plan.' : 'Semua action plan sudah selesai.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Staf dan KPI</th>
                  <th scope="col">Tindakan perbaikan</th>
                  <th scope="col">Penanggung jawab</th>
                  <th scope="col">Batas</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlans.map((plan) => (
                  <tr key={plan.id} className="row-hover align-top">
                    <td className="min-w-[11rem]">
                      <span className="block font-medium text-slate-900">{plan.staff_name}</span>
                      <span className="block text-[13px] text-slate-500">{plan.indicator_name}</span>
                    </td>
                    <td className="min-w-[16rem] max-w-md">
                      <span className="line-clamp-2 text-slate-600">{plan.action}</span>
                    </td>
                    <td className="whitespace-nowrap text-slate-600">{plan.pic_name}</td>
                    <td className="whitespace-nowrap text-[13px]">
                      <DueText plan={plan} prefix="" />
                    </td>
                    <td>
                      <select
                        aria-label={`Status action plan ${plan.staff_name}, ${plan.indicator_name}`}
                        value={plan.status}
                        disabled={updatingPlanId === plan.id}
                        onChange={(e) => handleStatusChange(plan, e.target.value)}
                        className="field h-8 w-auto py-0 pr-8 text-[13px]"
                      >
                        {Object.entries(PLAN_STATUS).map(([key, cfg]) => (
                          <option key={key} value={key}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
};

export const AnalisisTindakLanjutPage = () => {
  const { role } = useAuth();
  return role === ROLES.STAF ? <StafActionPlans /> : <SupervisorAnalisis />;
};
