import React from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';

const STYLES = {
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-900', Icon: CheckCircle2, icon: 'text-emerald-600' },
  error: { box: 'bg-rose-50 border-rose-200 text-rose-900', Icon: AlertTriangle, icon: 'text-rose-600' },
  warning: { box: 'bg-amber-50 border-amber-200 text-amber-900', Icon: AlertTriangle, icon: 'text-amber-600' },
  info: { box: 'bg-astra-50 border-astra-100 text-astra-900', Icon: Info, icon: 'text-astra-600' },
};

export const Notice = ({ type = 'info', children, action, className = '' }) => {
  if (!children) return null;
  const { box, Icon, icon } = STYLES[type] || STYLES.info;
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${box} ${className}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
};

export const LoadingBlock = ({ text = 'Memuat data…' }) => (
  <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
    <Loader2 className="h-4 w-4 animate-spin text-astra-600" aria-hidden="true" />
    {text}
  </div>
);

export const EmptyBlock = ({ children }) => (
  <div className="py-10 text-center text-sm text-slate-500">{children}</div>
);

const SCORE_STYLES = {
  green: 'bg-emerald-50 text-emerald-700',
  yellow: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700',
};

/** Persentase capaian berwarna sesuai status (hijau/kuning/merah). */
export const ScoreBadge = ({ value, color }) => {
  if (value === null || value === undefined) return <span className="text-slate-300">–</span>;
  return (
    <span
      className={`inline-block min-w-[3.25rem] rounded-md px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${
        SCORE_STYLES[color] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {Math.round(Number(value))}%
    </span>
  );
};

/** Label status (Hijau/Kuning/Merah, Valid, Ditolak, dst). */
export const StatusPill = ({ className = '', children }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
    {children}
  </span>
);
