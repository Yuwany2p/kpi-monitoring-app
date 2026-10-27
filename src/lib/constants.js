export const ROLES = {
  SUPERVISOR: 'supervisor',
  STAF: 'staf',
  MANAJEMEN: 'manajemen',
};

export const DEMO_USERS = [
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    full_name: 'Hendra Wijaya',
    email: 'hendra@perusahaan.co.id',
    role: 'supervisor',
    team_name: 'Tim Customer Service',
    initials: 'HW',
  },
  {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    full_name: 'Dewi Lestari',
    email: 'dewi@perusahaan.co.id',
    role: 'staf',
    team_name: 'Tim Customer Service',
    initials: 'DL',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    full_name: 'Maya Anggraini',
    email: 'maya@perusahaan.co.id',
    role: 'manajemen',
    team_name: 'Manajemen Eksekutif',
    initials: 'MA',
  },
];

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
    dot: 'bg-emerald-500',
    hex: '#10b981',
  },
  YELLOW: {
    key: 'yellow',
    label: 'Kuning',
    description: '80–99%',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    hex: '#f59e0b',
  },
  RED: {
    key: 'red',
    label: 'Merah',
    description: '< 80%',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    hex: '#ef4444',
  },
};

export const PERIODS = [
  { id: '99999999-9999-9999-9999-999999999999', name: 'Oktober 2026', status: 'active' },
  { id: '88888888-8888-8888-8888-888888888888', name: 'September 2026', status: 'closed' },
  { id: '77777777-7777-7777-7777-777777777777', name: 'Agustus 2026', status: 'closed' },
];

export const TEAMS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Tim Customer Service' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Tim Sales' },
];
