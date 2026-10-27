export const ROLES = {
  SUPERVISOR: 'supervisor',
  STAF: 'staf',
  MANAJEMEN: 'manajemen',
};

export const ROLE_LABELS = {
  supervisor: 'Supervisor',
  staf: 'Staf',
  manajemen: 'Manajemen',
};

// Akun dari supabase/seed.sql. Hanya ditampilkan di halaman login jika
// VITE_SHOW_DEMO_ACCOUNTS=true (untuk demo / pengujian).
export const DEMO_ACCOUNTS = [
  { email: 'hendra@perusahaan.co.id', label: 'Supervisor', name: 'Hendra Wijaya' },
  { email: 'dewi@perusahaan.co.id', label: 'Staf', name: 'Dewi Lestari' },
  { email: 'maya@perusahaan.co.id', label: 'Manajemen', name: 'Maya Anggraini' },
];
export const DEMO_PASSWORD = 'password123';

export const KPI_DIRECTIONS = {
  HIGHER_BETTER: 'higher_better',
  LOWER_BETTER: 'lower_better',
};

export const STATUS_COLORS = {
  GREEN: {
    key: 'green',
    label: 'Hijau',
    description: '≥ 100%',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    soft: 'bg-emerald-50 text-emerald-700',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    hex: '#10b981',
  },
  YELLOW: {
    key: 'yellow',
    label: 'Kuning',
    description: '80–99%',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    soft: 'bg-amber-50 text-amber-700',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    hex: '#f59e0b',
  },
  RED: {
    key: 'red',
    label: 'Merah',
    description: '< 80%',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    soft: 'bg-rose-50 text-rose-700',
    text: 'text-rose-600',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    hex: '#ef4444',
  },
};

export const ACTUAL_STATUS = {
  draft: { label: 'Draft', badge: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'Menunggu', badge: 'bg-blue-100 text-astra-800' },
  approved: { label: 'Valid', badge: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Ditolak', badge: 'bg-rose-100 text-rose-800' },
};

export const PLAN_STATUS = {
  open: { label: 'Terbuka', badge: 'bg-indigo-50 text-indigo-700' },
  in_progress: { label: 'Berjalan', badge: 'bg-sky-100 text-sky-800' },
  done: { label: 'Selesai', badge: 'bg-emerald-100 text-emerald-800' },
};

export const REPORT_STATUS = {
  draft: { label: 'Draft', badge: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Menunggu review', badge: 'bg-blue-100 text-astra-800' },
  approved: { label: 'Disetujui', badge: 'bg-emerald-100 text-emerald-800' },
  revision: { label: 'Revisi', badge: 'bg-rose-100 text-rose-800' },
  special_action: { label: 'Tindak lanjut khusus', badge: 'bg-amber-100 text-amber-800' },
};

export const REVIEW_DECISIONS = {
  approved: 'Disetujui',
  revision: 'Minta revisi laporan',
  special_action: 'Tindak lanjut khusus (sumber daya / revisi target)',
};
