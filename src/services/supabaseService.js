import { supabase } from '../lib/supabaseClient';

/**
 * Service layer: semua akses data ke Supabase ada di sini.
 * Setiap fungsi melempar Error jika gagal supaya halaman bisa
 * menampilkan pesan yang jelas (bukan diam-diam mengembalikan []).
 * Hak akses per role dijaga oleh Row Level Security di database.
 */

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// --------------------------------------------------------------------
// Profil, tim, periode
// --------------------------------------------------------------------
export const getProfile = async (userId) =>
  unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, email, role, team_id, is_active, teams:team_id (id, name)')
      .eq('id', userId)
      .single()
  );

export const getTeams = async () =>
  unwrap(await supabase.from('teams').select('id, name, supervisor_id').order('name'));

export const getPeriods = async () =>
  unwrap(
    await supabase
      .from('periods')
      .select('id, name, start_date, end_date, status')
      .order('start_date', { ascending: true })
  );

/** Staf aktif dalam satu tim (atau semua tim jika teamId kosong). */
export const getStaff = async (teamId) => {
  let query = supabase
    .from('profiles')
    .select('id, full_name, team_id, teams:team_id (name)')
    .eq('role', 'staf')
    .eq('is_active', true)
    .order('full_name');
  if (teamId) query = query.eq('team_id', teamId);
  return unwrap(await query);
};

/** Anggota tim + supervisornya (untuk pilihan penanggung jawab). */
export const getTeamMembers = async (teamId) => {
  let query = supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('is_active', true)
    .in('role', ['staf', 'supervisor'])
    .order('full_name');
  if (teamId) query = query.eq('team_id', teamId);
  return unwrap(await query);
};

// --------------------------------------------------------------------
// Master indikator KPI
// --------------------------------------------------------------------
export const getKpiIndicators = async ({ includeInactive = false } = {}) => {
  let query = supabase.from('kpi_indicators').select('*').order('code');
  if (!includeInactive) query = query.eq('is_active', true);
  return unwrap(await query);
};

export const createKpiIndicator = async (indicator) =>
  unwrap(await supabase.from('kpi_indicators').insert([indicator]).select().single());

export const updateKpiIndicator = async (id, updates) =>
  unwrap(await supabase.from('kpi_indicators').update(updates).eq('id', id).select().single());

export const setKpiIndicatorActive = async (id, isActive) =>
  updateKpiIndicator(id, { is_active: isActive });

// --------------------------------------------------------------------
// Target per staf
// --------------------------------------------------------------------
export const getKpiTargets = async (periodId) =>
  unwrap(
    await supabase
      .from('kpi_targets')
      .select('id, indicator_id, staff_id, period_id, target_value')
      .eq('period_id', periodId)
  );

/** rows: [{ indicator_id, staff_id, period_id, target_value, created_by }] */
export const upsertKpiTargets = async (rows) => {
  if (!rows.length) return [];
  return unwrap(
    await supabase
      .from('kpi_targets')
      .upsert(rows, { onConflict: 'indicator_id,staff_id,period_id' })
      .select()
  );
};

// --------------------------------------------------------------------
// Hasil KPI (view v_kpi_results — sudah difilter RLS sesuai role)
// --------------------------------------------------------------------
export const getKpiResults = async ({ periodId, periodIds, teamId, staffId } = {}) => {
  let query = supabase.from('v_kpi_results').select('*');
  if (periodId) query = query.eq('period_id', periodId);
  if (periodIds?.length) query = query.in('period_id', periodIds);
  if (teamId) query = query.eq('team_id', teamId);
  if (staffId) query = query.eq('staff_id', staffId);
  return unwrap(await query.order('indicator_code'));
};

// --------------------------------------------------------------------
// Realisasi (input staf & validasi supervisor)
// --------------------------------------------------------------------
export const saveActual = async ({ actualId, targetId, actualValue, notes, evidenceUrl, status }) => {
  const payload = {
    actual_value: actualValue,
    notes: notes || null,
    evidence_url: evidenceUrl || null,
    status,
  };
  if (actualId) {
    return unwrap(
      await supabase.from('kpi_actuals').update(payload).eq('id', actualId).select().single()
    );
  }
  return unwrap(
    await supabase
      .from('kpi_actuals')
      .insert([{ ...payload, target_id: targetId }])
      .select()
      .single()
  );
};

export const validateActual = async (actualId, status, validationNote) =>
  unwrap(
    await supabase
      .from('kpi_actuals')
      .update({ status, validation_note: validationNote || null })
      .eq('id', actualId)
      .select()
      .single()
  );

export const countPendingValidation = async (periodId) => {
  let query = supabase
    .from('v_kpi_results')
    .select('target_id', { count: 'exact', head: true })
    .eq('actual_status', 'submitted');
  if (periodId) query = query.eq('period_id', periodId);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count || 0;
};

// --------------------------------------------------------------------
// Storage
// --------------------------------------------------------------------
const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]+/g, '_');

export const uploadEvidence = async (userId, file) => {
  const path = `${userId}/${Date.now()}-${safeName(file.name)}`;
  unwrap(await supabase.storage.from('evidence').upload(path, file, { upsert: false }));
  return path;
};

export const getSignedUrl = async (bucket, path, expiresIn = 300) => {
  const data = unwrap(await supabase.storage.from(bucket).createSignedUrl(path, expiresIn));
  return data.signedUrl;
};

export const uploadReportFile = async (userId, reportId, blob) => {
  const path = `${userId}/${reportId}.pdf`;
  unwrap(
    await supabase.storage
      .from('reports')
      .upload(path, blob, { upsert: true, contentType: 'application/pdf' })
  );
  return path;
};

// --------------------------------------------------------------------
// Action plan
// --------------------------------------------------------------------
const ACTION_PLAN_SELECT = `
  id, score_id, staff_id, supervisor_id, pic_id, analysis, action, due_date, status, created_at, updated_at,
  staff:staff_id (id, full_name),
  pic:pic_id (id, full_name),
  supervisor:supervisor_id (id, full_name),
  kpi_scores:score_id (
    achievement_pct, status_color,
    kpi_actuals:actual_id (
      actual_value,
      kpi_targets:target_id (
        target_value, period_id,
        periods:period_id (name),
        kpi_indicators:indicator_id (code, name, unit)
      )
    )
  )
`;

/** Ratakan relasi bersarang agar mudah dipakai di UI. */
const flattenPlan = (plan) => {
  const score = plan.kpi_scores;
  const actual = score?.kpi_actuals;
  const target = actual?.kpi_targets;
  return {
    ...plan,
    staff_name: plan.staff?.full_name || '-',
    pic_name: plan.pic?.full_name || plan.supervisor?.full_name || '-',
    achievement_pct: score?.achievement_pct ?? null,
    status_color: score?.status_color ?? null,
    actual_value: actual?.actual_value ?? null,
    target_value: target?.target_value ?? null,
    period_id: target?.period_id ?? null,
    period_name: target?.periods?.name ?? '-',
    indicator_name: target?.kpi_indicators?.name ?? '-',
    indicator_code: target?.kpi_indicators?.code ?? '',
    unit: target?.kpi_indicators?.unit ?? '',
  };
};

export const getActionPlans = async ({ staffId } = {}) => {
  let query = supabase
    .from('action_plans')
    .select(ACTION_PLAN_SELECT)
    .order('due_date', { ascending: true });
  if (staffId) query = query.or(`staff_id.eq.${staffId},pic_id.eq.${staffId}`);
  return (unwrap(await query) || []).map(flattenPlan);
};

export const createActionPlan = async (plan) =>
  flattenPlan(
    unwrap(await supabase.from('action_plans').insert([plan]).select(ACTION_PLAN_SELECT).single())
  );

export const updateActionPlan = async (id, updates) =>
  flattenPlan(
    unwrap(
      await supabase
        .from('action_plans')
        .update(updates)
        .eq('id', id)
        .select(ACTION_PLAN_SELECT)
        .single()
    )
  );

// --------------------------------------------------------------------
// Laporan & review manajemen
// --------------------------------------------------------------------
const REPORT_SELECT = `
  id, period_id, created_by, title, summary, content, file_url, status, submitted_at, created_at,
  periods:period_id (id, name, start_date),
  author:created_by (id, full_name, team_id, teams:team_id (name)),
  report_reviews (id, decision, feedback, reviewed_at, reviewer:reviewer_id (full_name))
`;

const sortReviews = (report) =>
  report
    ? {
        ...report,
        report_reviews: [...(report.report_reviews || [])].sort(
          (a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at)
        ),
      }
    : report;

export const getMyReport = async (periodId, userId) =>
  sortReviews(
    unwrap(
      await supabase
        .from('reports')
        .select(REPORT_SELECT)
        .eq('period_id', periodId)
        .eq('created_by', userId)
        .maybeSingle()
    )
  );

export const getReportsForReview = async () =>
  (
    unwrap(
      await supabase
        .from('reports')
        .select(REPORT_SELECT)
        .neq('status', 'draft')
        .order('submitted_at', { ascending: false })
    ) || []
  ).map(sortReviews);

export const countReportsToReview = async () => {
  const { count, error } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'submitted');
  if (error) throw new Error(error.message);
  return count || 0;
};

/** Buat atau perbarui laporan milik supervisor untuk satu periode. */
export const saveReport = async ({ id, ...fields }) => {
  if (id) {
    return sortReviews(
      unwrap(await supabase.from('reports').update(fields).eq('id', id).select(REPORT_SELECT).single())
    );
  }
  return sortReviews(
    unwrap(await supabase.from('reports').insert([fields]).select(REPORT_SELECT).single())
  );
};

export const submitReportReview = async ({ reportId, decision, feedback, reviewerId }) =>
  unwrap(
    await supabase
      .from('report_reviews')
      .insert([{ report_id: reportId, reviewer_id: reviewerId, decision, feedback }])
      .select()
      .single()
  );
