import React from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';

const STYLES = {
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-900', Icon: CheckCircle2, icon: 'text-emerald-600' },
  error: { box: 'bg-rose-50 border-rose-200 text-rose-900', Icon: AlertTriangle, icon: 'text-rose-600' },
  warning: { box: 'bg-amber-50 border-amber-200 text-amber-900', Icon: AlertTriangle, icon: 'text-amber-600' },
  info: { box: 'bg-astra-50 border-astra-100 text-astra-900', Icon: Info, icon: 'text-astra-600' },
};

/** Pesan singkat (hasil aksi, peringatan, error). */
export const Notice = ({ type = 'info', children, action, onDismiss, className = '' }) => {
  if (!children) return null;
  const { box, Icon, icon } = STYLES[type] || STYLES.info;
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${box} ${className}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="-m-1 rounded p-1 opacity-60 hover:opacity-100" aria-label="Tutup pesan">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export const LoadingBlock = ({ text = 'Memuat data…' }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
    <Loader2 className="h-4 w-4 animate-spin text-astra-600" aria-hidden="true" />
    {text}
  </div>
);

/** Kerangka abu-abu untuk tabel yang sedang dimuat. */
export const TableSkeleton = ({ rows = 4, cols = 4, label = 'Memuat data…' }) => (
  <div role="status" aria-label={label} className="divide-y divide-slate-100">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-6 px-4 py-3.5 sm:px-5">
        {Array.from({ length: cols }).map((__, c) => (
          <span key={c} className={`skeleton h-3.5 ${c === 0 ? 'w-40' : 'w-16'} ${c > 2 ? 'hidden sm:block' : ''}`} />
        ))}
      </div>
    ))}
    <span className="sr-only">{label}</span>
  </div>
);

/**
 * Keadaan kosong: satu kalimat yang menjelaskan kenapa kosong
 * dan (opsional) aksi untuk mengisinya.
 */
export const EmptyState = ({ icon: Icon, title, children, action, compact = false }) => (
  <div className={`flex flex-col items-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-12'}`}>
    {Icon && (
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    )}
    {title && <p className="font-medium text-slate-900">{title}</p>}
    {children && <p className={`max-w-sm text-sm text-slate-500 ${title ? 'mt-1' : ''}`}>{children}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/** Versi ringkas EmptyState tanpa ikon (dipakai di dalam kartu kecil). */
export const EmptyBlock = ({ children, action }) => (
  <EmptyState compact action={action}>
    {children}
  </EmptyState>
);

const SCORE_STYLES = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  yellow: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
};

/** Persentase capaian berwarna sesuai status (hijau/kuning/merah). */
export const ScoreBadge = ({ value, color }) => {
  if (value === null || value === undefined) return <span className="text-slate-300">–</span>;
  return (
    <span className={`score-badge ${SCORE_STYLES[color] || 'bg-slate-100 text-slate-600'}`}>
      {Math.round(Number(value))}%
    </span>
  );
};

/** Label status (Hijau/Kuning/Merah, Valid, Ditolak, dst). */
export const StatusPill = ({ className = '', children }) => (
  <span className={`pill ${className}`}>{children}</span>
);

/** Keterangan warna status capaian. */
export const StatusLegend = ({ className = '' }) => (
  <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500 ${className}`}>
    <li className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" /> Hijau ≥ 100%
    </li>
    <li className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> Kuning 80–99%
    </li>
    <li className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" /> Merah &lt; 80%
    </li>
  </ul>
);
