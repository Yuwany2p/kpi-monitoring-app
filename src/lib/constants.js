export const PERSPEKTIF_AMS = [
  'Keuangan',
  'Pelanggan',
  'Proses Bisnis Internal',
  'Pembelajaran & Pertumbuhan'
];

export const PRIORITAS_SASARAN = [
  'Prioritas Utama',
  'Penting',
  'Rutin'
];

export const STATUS_TINDAKAN = [
  'Open',
  'In Progress',
  'Resolved',
  'Closed'
];

export const PERSPEKTIF_COLORS = {
  'Keuangan': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    chart: '#10b981'
  },
  'Pelanggan': {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    badge: 'bg-sky-100 text-sky-800',
    chart: '#0ea5e9'
  },
  'Proses Bisnis Internal': {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-800',
    chart: '#6366f1'
  },
  'Pembelajaran & Pertumbuhan': {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-800',
    chart: '#a855f7'
  }
};

export const STATUS_KPI_COLORS = {
  HIJAU: {
    label: 'Tercapai',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500'
  },
  KUNING: {
    label: 'Perhatian',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    dot: 'bg-amber-500'
  },
  MERAH: {
    label: 'Kritis / Under-target',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    dot: 'bg-rose-500'
  }
};

export const BULAN_LIST = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];
