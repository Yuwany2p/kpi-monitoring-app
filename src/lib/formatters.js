import { STATUS_COLORS, KPI_DIRECTIONS } from './constants';

export const calculateAchievement = (actual, target, direction = KPI_DIRECTIONS.HIGHER_BETTER) => {
  const a = Number(actual);
  const t = Number(target);

  if (!t || isNaN(t) || isNaN(a) || a === 0) return 0;

  let pct = 0;
  if (direction === KPI_DIRECTIONS.LOWER_BETTER) {
    // Arah semakin rendah semakin baik (e.g. Waktu respons)
    pct = (t / a) * 100;
  } else {
    // Arah semakin tinggi semakin baik (e.g. Tiket terselesaikan, Kepuasan)
    pct = (a / t) * 100;
  }

  return Math.round(pct);
};

export const getStatusByScore = (achievementPct) => {
  const val = Number(achievementPct);
  if (val >= 100) return STATUS_COLORS.GREEN;
  if (val >= 80) return STATUS_COLORS.YELLOW;
  return STATUS_COLORS.RED;
};

export const formatNumber = (num, decimals = 1) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

export const formatPercent = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0%';
  return `${Math.round(Number(num))}%`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};
