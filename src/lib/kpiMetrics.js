import { getStatusByScore } from './formatters';

/**
 * Perhitungan agregat dari baris v_kpi_results (satu baris = target
 * indikator x staf x periode). Hanya data yang sudah divalidasi
 * (punya score) yang dihitung, sesuai alur di dokumen.
 */

const round1 = (n) => Math.round(n * 10) / 10;

/** Skor tertimbang: Σ(capaian × bobot) ÷ Σ bobot indikator yang sudah valid */
export const weightedScore = (rows) => {
  const scored = rows.filter((r) => r.achievement_pct !== null && r.achievement_pct !== undefined);
  const totalWeight = scored.reduce((acc, r) => acc + Number(r.weight || 0), 0);
  if (scored.length === 0) return null;
  if (totalWeight === 0) {
    return round1(scored.reduce((acc, r) => acc + Number(r.achievement_pct), 0) / scored.length);
  }
  return round1(
    scored.reduce((acc, r) => acc + Number(r.achievement_pct) * Number(r.weight || 0), 0) /
      totalWeight
  );
};

const groupBy = (rows, key) =>
  rows.reduce((map, row) => {
    const k = row[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
    return map;
  }, new Map());

/** Ringkasan satu periode untuk dashboard & laporan. */
export const summarizePeriod = (rows = []) => {
  const indicatorMap = new Map();
  rows.forEach((r) => {
    if (!indicatorMap.has(r.indicator_id)) {
      indicatorMap.set(r.indicator_id, {
        id: r.indicator_id,
        code: r.indicator_code,
        name: r.indicator_name,
        unit: r.unit,
        direction: r.direction,
        weight: Number(r.weight || 0),
      });
    }
  });
  const indicators = [...indicatorMap.values()].sort((a, b) => a.code.localeCompare(b.code));

  const staff = [...groupBy(rows, 'staff_id').entries()]
    .map(([staffId, staffRows]) => {
      const score = weightedScore(staffRows);
      const byIndicator = {};
      staffRows.forEach((r) => {
        byIndicator[r.indicator_id] = r;
      });
      return {
        staff_id: staffId,
        name: staffRows[0].staff_name,
        team_name: staffRows[0].team_name,
        score,
        color: score === null ? null : getStatusByScore(score).key,
        byIndicator,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const indicatorSummary = indicators.map((ind) => {
    const indRows = rows.filter(
      (r) => r.indicator_id === ind.id && r.achievement_pct !== null && r.achievement_pct !== undefined
    );
    const avg = indRows.length
      ? round1(indRows.reduce((acc, r) => acc + Number(r.achievement_pct), 0) / indRows.length)
      : null;
    return { ...ind, avg, color: avg === null ? null : getStatusByScore(avg).key };
  });

  const scoredStaff = staff.filter((s) => s.score !== null);
  const teamScore = scoredStaff.length
    ? round1(scoredStaff.reduce((acc, s) => acc + s.score, 0) / scoredStaff.length)
    : null;

  const counts = { green: 0, yellow: 0, red: 0 };
  rows.forEach((r) => {
    if (r.status_color) counts[r.status_color] += 1;
  });

  return {
    indicators,
    indicatorSummary,
    staff,
    teamScore,
    counts,
    total: rows.length,
    scored: rows.filter((r) => r.status_color).length,
    pending: rows.filter((r) => r.actual_status === 'submitted').length,
    rejected: rows.filter((r) => r.actual_status === 'rejected').length,
    notSubmitted: rows.filter((r) => !r.actual_status || r.actual_status === 'draft').length,
    issues: rows
      .filter((r) => r.status_color === 'red' || r.status_color === 'yellow')
      .sort((a, b) => Number(a.achievement_pct) - Number(b.achievement_pct)),
  };
};

/**
 * Tren skor per periode. `periods` sudah urut naik (lama -> baru).
 * Mengembalikan [{ label, periodId, score }]
 */
export const trendByPeriod = (rows = [], periods = [], filterFn = () => true) =>
  periods.map((p) => {
    const periodRows = rows.filter((r) => r.period_id === p.id && filterFn(r));
    const staffScores = [...groupBy(periodRows, 'staff_id').values()]
      .map((staffRows) => weightedScore(staffRows))
      .filter((s) => s !== null);
    return {
      periodId: p.id,
      label: shortPeriodLabel(p),
      score: staffScores.length
        ? round1(staffScores.reduce((a, b) => a + b, 0) / staffScores.length)
        : null,
    };
  });

/** Tren capaian satu indikator milik satu staf. */
export const indicatorTrend = (rows = [], periods = [], staffId, indicatorId) =>
  periods.map((p) => {
    const row = rows.find(
      (r) => r.period_id === p.id && r.staff_id === staffId && r.indicator_id === indicatorId
    );
    return {
      periodId: p.id,
      label: shortPeriodLabel(p),
      score: row?.achievement_pct !== null && row?.achievement_pct !== undefined
        ? Number(row.achievement_pct)
        : null,
    };
  });

export const shortPeriodLabel = (period) => {
  if (!period?.start_date) return period?.name || '';
  return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(period.start_date));
};

/** Domain sumbu Y yang nyaman dibaca untuk grafik capaian (%). */
export const chartDomain = (points, key = 'score') => {
  const values = points.map((p) => p[key]).filter((v) => v !== null && v !== undefined);
  if (!values.length) return [0, 120];
  const min = Math.min(...values, 100);
  const max = Math.max(...values, 100);
  return [Math.max(0, Math.floor((min - 10) / 10) * 10), Math.ceil((max + 5) / 10) * 10];
};
