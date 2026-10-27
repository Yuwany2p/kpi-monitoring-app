import { STATUS_COLORS, KPI_DIRECTIONS } from './constants';

/**
 * Capaian (%) = Realisasi ÷ Target × 100%
 * Arah "semakin rendah semakin baik": Target ÷ Realisasi × 100%
 * Rumus yang sama dipakai di database (public.calc_achievement).
 */
export const calculateAchievement = (actual, target, direction = KPI_DIRECTIONS.HIGHER_BETTER) => {
  const a = Number(actual);
  const t = Number(target);
  if (actual === '' || actual === null || actual === undefined) return null;
  if (!t || Number.isNaN(t) || Number.isNaN(a)) return null;

  if (direction === KPI_DIRECTIONS.LOWER_BETTER) {
    if (a === 0) return null;
    return Math.round((t / a) * 10000) / 100;
  }
  return Math.round((a / t) * 10000) / 100;
};

export const getStatusByScore = (achievementPct) => {
  const val = Number(achievementPct);
  if (val >= 100) return STATUS_COLORS.GREEN;
  if (val >= 80) return STATUS_COLORS.YELLOW;
  return STATUS_COLORS.RED;
};

export const getStatusByColor = (color) => {
  if (color === 'green') return STATUS_COLORS.GREEN;
  if (color === 'yellow') return STATUS_COLORS.YELLOW;
  if (color === 'red') return STATUS_COLORS.RED;
  return null;
};

export const directionSymbol = (direction) =>
  direction === KPI_DIRECTIONS.LOWER_BETTER ? '≤' : '≥';

export const formatNumber = (num, decimals = 1) => {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return '-';
  return Number(num).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

export const formatPercent = (num) => {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return '-';
  return `${Math.round(Number(num))}%`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

export const formatShortDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(
      new Date(dateString)
    );
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

export const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

export const fileNameFromPath = (path) => {
  if (!path) return '';
  const last = path.split('/').pop() || path;
  // format penyimpanan: <timestamp>-<nama asli>
  return last.replace(/^\d+-/, '');
};
