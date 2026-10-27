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
import { Notice, LoadingBlock, EmptyBlock, ScoreBadge } from '../components/common/Notice';
import { ScoreTrendChart } from '../components/dashboard/ScoreTrendChart';

const fieldClass =
  'w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-astra-600';

const PlanStatusBadge = ({ status }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${PLAN_STATUS[status]?.badge}`}>
    {PLAN_STATUS[status]?.label}
  </span>
);

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
// Tampilan staf: action plan yang ditujukan kepadanya (read-only)
// ---------------------------------------------------------------------
const StafActionPlans = () => {
  const { currentUser } = useAuth();
  const { data: plans, loading, error } = useAsyncData(() => getActionPlans({ staffId: currentUser.id }), [currentUser.id], {
    initialData: [],
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <h2 className="text-base font-bold text-slate-900">Action Plan untuk Saya</h2>
      {error && <Notice type="error">{error}</Notice>}
      {loading ? (
        <LoadingBlock text="Memuat action plan..." />
      ) : plans.length === 0 ? (
        <EmptyBlock>Belum ada action plan yang ditujukan kepada Anda.</EmptyBlock>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <div key={p.id} className="p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{p.indicator_name}</p>
                  <p className="text-[11px] text-slate-400">
                    {p.period_name} · Target {formatNumber(p.target_value)} {p.unit} · Realisasi{' '}
                    {formatNumber(p.actual_value)} {p.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ScoreBadge value={p.achievement_pct} color={p.status_color} />
                  <PlanStatusBadge status={p.status} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="font-semibold text-slate-700 mb-1">Analisis penyebab</p>
                  <p className="text-slate-600">{p.analysis}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="font-semibold text-slate-700 mb-1">Rencana tindakan</p>
                  <p className="text-slate-600">{p.action}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Penanggung jawab: <strong>{p.pic_name}</strong> · Batas waktu: <strong>{formatDate(p.due_date)}</strong>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Tampilan supervisor
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
    setTimeout(() => setMessage(null), 4000);
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
      flash('success', existingPlan ? 'Action plan diperbarui.' : 'Action plan berhasil disimpan dan ditugaskan.');
    } catch (err) {
      flash('error', `Gagal menyimpan action plan: ${err.message}`);
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
  if (loading || !data) return <LoadingBlock text="Memuat analisis KPI..." />;

  const visiblePlans = plans.filter((p) => showDone || p.status !== 'done');
  const selectedStatus = selectedIssue ? getStatusByColor(selectedIssue.status_color) : null;
  const deviation = selectedIssue ? Number(selectedIssue.actual_value) - Number(selectedIssue.target_value) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm">KPI Perlu Tindak Lanjut</h3>
            <span className="text-xs text-slate-400 font-medium">Merah & Kuning · {selectedPeriod?.name}</span>
          </div>

          {issues.length === 0 ? (
            <EmptyBlock>Tidak ada KPI merah/kuning yang sudah tervalidasi di periode ini.</EmptyBlock>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {issues.map((issue) => {
                const isSelected = selectedIssue?.target_id === issue.target_id;
                const hasPlan = plans.some((p) => p.score_id === issue.score_id);
                return (
                  <div
                    key={issue.target_id}
                    onClick={() => setSelectedTargetId(issue.target_id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected ? 'border-astra-600 bg-astra-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                        {getInitials(issue.staff_name)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{issue.staff_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {issue.indicator_name}
                          {hasPlan && <span className="ml-1.5 text-emerald-600 font-semibold">· ada action plan</span>}
                        </p>
                      </div>
                    </div>
                    <ScoreBadge value={issue.achievement_pct} color={issue.status_color} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Action Plan {showDone ? '' : 'Berjalan'}</h3>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
              Tampilkan selesai
            </label>
          </div>
          {visiblePlans.length === 0 ? (
            <EmptyBlock>Belum ada action plan.</EmptyBlock>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="pb-3 font-medium">Staf</th>
                    <th className="pb-3 font-medium">Tindakan</th>
                    <th className="pb-3 font-medium">Batas</th>
                    <th className="pb-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePlans.map((plan) => {
                    const overdue = isOverdue(plan);
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/60">
                        <td className="py-3 font-bold text-slate-800 whitespace-nowrap">
                          {plan.staff_name.split(' ')[0]} · {plan.indicator_name.split(' ')[0]}
                          <p className="text-[10px] font-medium text-slate-400">{plan.period_name}</p>
                        </td>
                        <td className="py-3 text-slate-600 font-medium max-w-[160px]">
                          <span className="line-clamp-2">{plan.action}</span>
                        </td>
                        <td className={`py-3 whitespace-nowrap ${overdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                          {formatShortDate(plan.due_date)}
                        </td>
                        <td className="py-3 text-center">
                          <select
                            value={plan.status}
                            disabled={updatingPlanId === plan.id}
                            onChange={(e) => handleStatusChange(plan, e.target.value)}
                            className={`rounded-full text-[10px] font-bold px-2 py-0.5 border-0 cursor-pointer ${PLAN_STATUS[plan.status].badge}`}
                          >
                            {Object.entries(PLAN_STATUS).map(([key, cfg]) => (
                              <option key={key} value={key}>
                                {cfg.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        {!selectedIssue ? (
          <EmptyBlock>Pilih KPI di sebelah kiri untuk mencatat analisis dan action plan.</EmptyBlock>
        ) : (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-slate-900 text-base">
                {selectedIssue.staff_name} · {selectedIssue.indicator_name}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedStatus?.badge}`}>
                {Math.round(selectedIssue.achievement_pct)}% · {selectedStatus?.label}
              </span>
            </div>

            {message && <Notice type={message.type} className="mb-4">{message.text}</Notice>}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-400 font-medium">Target</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {formatNumber(selectedIssue.target_value)} <span className="text-xs font-semibold text-slate-400">{selectedIssue.unit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Realisasi</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {formatNumber(selectedIssue.actual_value)} <span className="text-xs font-semibold text-slate-400">{selectedIssue.unit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Deviasi</p>
                <p className={`text-2xl font-black mt-0.5 ${selectedStatus?.text}`}>
                  {deviation > 0 ? '+' : ''}
                  {formatNumber(deviation)}
                </p>
              </div>
            </div>

            <ScoreTrendChart data={trend} height="h-32" color="#ef4444" label="Capaian" showTarget={false} />

            <form onSubmit={handleSave} className="space-y-4 text-xs mt-6">
              {existingPlan && (
                <Notice type="info">Action plan untuk KPI ini sudah ada, perubahan akan memperbarui data tersebut.</Notice>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Analisis penyebab</label>
                <textarea
                  rows={3}
                  required
                  value={currentForm.analysis}
                  onChange={(e) => setField('analysis', e.target.value)}
                  placeholder="Apa penyebab capaian tidak sesuai target?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Rencana tindakan</label>
                <textarea
                  rows={3}
                  required
                  value={currentForm.action}
                  onChange={(e) => setField('action', e.target.value)}
                  placeholder="Contoh: coaching, redistribusi beban kerja, perbaikan proses"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-astra-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Penanggung jawab</label>
                  <select value={currentForm.pic_id} onChange={(e) => setField('pic_id', e.target.value)} className={fieldClass}>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                        {m.role === ROLES.SUPERVISOR ? ' (Supervisor)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Batas waktu</label>
                  <input
                    type="date"
                    required
                    value={currentForm.due_date}
                    onChange={(e) => setField('due_date', e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Status</label>
                  <select value={currentForm.status} onChange={(e) => setField('status', e.target.value)} className={fieldClass}>
                    {Object.entries(PLAN_STATUS).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-astra-800 hover:bg-astra-900 disabled:opacity-60 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {existingPlan ? 'Perbarui Action Plan' : 'Simpan Action Plan'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export const AnalisisTindakLanjutPage = () => {
  const { role } = useAuth();
  return role === ROLES.STAF ? <StafActionPlans /> : <SupervisorAnalisis />;
};
