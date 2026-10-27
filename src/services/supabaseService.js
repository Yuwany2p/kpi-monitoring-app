import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { calculateAchievement, getStatusByScore } from '../lib/formatters';

/**
 * Service Layer untuk menghubungkan Frontend langsung dengan Database Supabase.
 * Mengembalikan data murni dari database tanpa mencampurkan data dummy.
 */

// 1. PROFILES & TEAMS
export const getProfiles = async () => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, teams(id, name)')
      .eq('is_active', true);

    if (error) {
      console.error('Error getProfiles:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error getProfiles:', err);
    return [];
  }
};

// 2. MASTER INDIKATOR KPI
export const getKpiIndicators = async () => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('kpi_indicators')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.error('Error getKpiIndicators:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error getKpiIndicators:', err);
    return [];
  }
};

export const createKpiIndicator = async (indicator) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase belum dikonfigurasi' };
  }
  try {
    const { data, error } = await supabase
      .from('kpi_indicators')
      .insert([indicator])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error createKpiIndicator:', err);
    return { success: false, error: err.message };
  }
};

export const updateKpiIndicator = async (id, updates) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase belum dikonfigurasi' };
  }
  try {
    const { data, error } = await supabase
      .from('kpi_indicators')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error updateKpiIndicator:', err);
    return { success: false, error: err.message };
  }
};

export const deleteKpiIndicator = async (id) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase belum dikonfigurasi' };
  }
  try {
    const { error } = await supabase
      .from('kpi_indicators')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error deleteKpiIndicator:', err);
    return { success: false, error: err.message };
  }
};

// 3. TARGET KPI MATRIX
export const getKpiTargets = async (periodId) => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    let query = supabase
      .from('kpi_targets')
      .select(`
        id,
        target_value,
        staff_id,
        indicator_id,
        period_id,
        profiles (id, full_name),
        kpi_indicators (id, code, name, unit, direction)
      `);

    if (periodId) {
      query = query.eq('period_id', periodId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Error getKpiTargets:', err);
    return [];
  }
};

export const upsertKpiTarget = async (targetData) => {
  if (!isSupabaseConfigured || !supabase) return { success: false };
  try {
    const { data, error } = await supabase
      .from('kpi_targets')
      .upsert(targetData, { onConflict: 'indicator_id,staff_id,period_id' })
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error upsertKpiTarget:', err);
    return { success: false, error: err.message };
  }
};

// 4. REALISASI & VALIDASI DATA
export const getActualsForValidation = async (statusFilter = null) => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    let query = supabase
      .from('kpi_actuals')
      .select(`
        id,
        actual_value,
        notes,
        evidence_url,
        status,
        submitted_at,
        kpi_targets (
          id,
          target_value,
          profiles (id, full_name),
          kpi_indicators (id, code, name, unit, direction)
        ),
        kpi_scores (
          achievement_pct,
          status_color
        )
      `)
      .order('submitted_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('Error getActualsForValidation:', error?.message);
      return [];
    }

    // Format data murni dari database
    return data.map((item) => {
      const target = item.kpi_targets;
      const indicator = target?.kpi_indicators;
      const staff = target?.profiles;
      const score = item.kpi_scores?.[0] || item.kpi_scores;

      const achievement = score?.achievement_pct ?? (
        indicator && target?.target_value && item.actual_value
          ? calculateAchievement(item.actual_value, target.target_value, indicator.direction)
          : 0
      );

      const statusColor = score?.status_color ?? getStatusByScore(achievement).color;

      return {
        id: item.id,
        staff_name: staff?.full_name || 'Staf',
        indicator_name: indicator?.name || 'Indikator',
        unit: indicator?.unit || '',
        target: target?.target_value || 0,
        actual: item.actual_value || 0,
        achievement: Math.round(Number(achievement)),
        status_color: statusColor,
        is_large_deviation: Number(achievement) < 80,
        evidence_file: item.evidence_url || 'bukti.pdf',
        status: item.status,
      };
    });
  } catch (err) {
    console.error('Error getActualsForValidation:', err);
    return [];
  }
};

export const updateActualValidation = async (actualId, status, validationNote, validatorId) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false };
  }
  try {
    const { data, error } = await supabase
      .from('kpi_actuals')
      .update({
        status,
        validation_note: validationNote,
        validated_by: validatorId || null,
        validated_at: new Date().toISOString(),
      })
      .eq('id', actualId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error updateActualValidation:', err);
    return { success: false, error: err.message };
  }
};

// 5. INPUT CAPAIAN STAF
export const submitStaffActual = async ({ targetId, actualValue, notes, evidenceUrl }) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase belum dikonfigurasi' };
  }
  try {
    const { data: actualData, error: actualErr } = await supabase
      .from('kpi_actuals')
      .insert([
        {
          target_id: targetId,
          actual_value: actualValue,
          notes,
          evidence_url: evidenceUrl,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (actualErr) throw actualErr;

    const { data: targetDetail } = await supabase
      .from('kpi_targets')
      .select('target_value, kpi_indicators(direction, weight)')
      .eq('id', targetId)
      .single();

    if (targetDetail) {
      const dir = targetDetail.kpi_indicators?.direction || 'higher_better';
      const weight = Number(targetDetail.kpi_indicators?.weight || 0);
      const achievement = calculateAchievement(actualValue, targetDetail.target_value, dir);
      const weightedScore = (achievement * weight) / 100;
      const statusObj = getStatusByScore(achievement);

      await supabase.from('kpi_scores').insert([
        {
          actual_id: actualData.id,
          achievement_pct: achievement,
          weighted_score: weightedScore,
          status_color: statusObj.color,
        },
      ]);
    }

    return { success: true, data: actualData };
  } catch (err) {
    console.error('Error submitStaffActual:', err);
    return { success: false, error: err.message };
  }
};

// 6. ACTION PLANS (CAPA)
export const getActionPlans = async () => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('action_plans')
      .select(`
        id,
        analysis,
        action,
        due_date,
        status,
        profiles:staff_id (id, full_name),
        kpi_scores (
          achievement_pct,
          status_color,
          kpi_actuals (
            actual_value,
            kpi_targets (
              target_value,
              kpi_indicators (name, unit)
            )
          )
        )
      `);

    if (error) {
      console.error('Error getActionPlans:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error getActionPlans:', err);
    return [];
  }
};

export const createActionPlan = async (plan) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase belum dikonfigurasi' };
  }
  try {
    const { data, error } = await supabase
      .from('action_plans')
      .insert([plan])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error createActionPlan:', err);
    return { success: false, error: err.message };
  }
};

// 7. LAPORAN & REVIEW MANAJEMEN
export const getManagementReports = async () => {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        title,
        summary,
        file_url,
        status,
        submitted_at,
        periods (name),
        profiles (full_name),
        report_reviews (*)
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error getManagementReports:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error getManagementReports:', err);
    return [];
  }
};

export const submitReportReview = async ({ reportId, decision, feedback, reviewerId }) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false };
  }
  try {
    const { data, error } = await supabase
      .from('report_reviews')
      .insert([
        {
          report_id: reportId,
          reviewer_id: reviewerId,
          decision,
          feedback,
          reviewed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const newReportStatus = decision === 'approved' ? 'approved' : 'revision';
    await supabase.from('reports').update({ status: newReportStatus }).eq('id', reportId);

    return { success: true, data };
  } catch (err) {
    console.error('Error submitReportReview:', err);
    return { success: false, error: err.message };
  }
};
