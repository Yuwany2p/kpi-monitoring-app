import { BULAN_LIST } from './constants';

export const formatNumber = (num, decimals = 1) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

export const formatPercent = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0%';
  return `${Number(num).toFixed(1)}%`;
};

export const getMonthName = (monthNumber) => {
  const found = BULAN_LIST.find((m) => m.value === Number(monthNumber));
  return found ? found.label : `Bulan ${monthNumber}`;
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

export const getKpiStatus = (persenCapaian) => {
  const val = Number(persenCapaian);
  if (val >= 100) return 'HIJAU';
  if (val >= 80) return 'KUNING';
  return 'MERAH';
};
