import React from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';

const STYLES = {
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-800', Icon: CheckCircle2, icon: 'text-emerald-600' },
  error: { box: 'bg-rose-50 border-rose-200 text-rose-800', Icon: AlertTriangle, icon: 'text-rose-600' },
  warning: { box: 'bg-amber-50 border-amber-200 text-amber-900', Icon: AlertTriangle, icon: 'text-amber-700' },
  info: { box: 'bg-astra-50 border-astra-200 text-astra-900', Icon: Info, icon: 'text-astra-700' },
};

/** Kotak pesan sukses / error / info. */
export const Notice = ({ type = 'info', children, className = '' }) => {
  if (!children) return null;
  const { box, Icon, icon } = STYLES[type] || STYLES.info;
  return (
    <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2 ${box} ${className}`}>
      <Icon className={`w-4 h-4 shrink-0 mt-px ${icon}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
};

export const LoadingBlock = ({ text = 'Memuat data...' }) => (
  <div className="py-10 text-center text-slate-400 text-xs">
    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-astra-700" />
    {text}
  </div>
);

export const EmptyBlock = ({ children }) => (
  <div className="py-10 text-center text-slate-400 text-xs">{children}</div>
);

/** Badge persentase berwarna sesuai status capaian. */
export const ScoreBadge = ({ value, color, size = 'sm' }) => {
  if (value === null || value === undefined) {
    return <span className="text-slate-300 text-[11px] font-semibold">–</span>;
  }
  const map = {
    green: 'bg-emerald-100 text-emerald-800',
    yellow: 'bg-amber-100 text-amber-800',
    red: 'bg-rose-100 text-rose-700',
  };
  const pad = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]';
  return (
    <span className={`inline-block rounded-full font-bold ${pad} ${map[color] || 'bg-slate-100 text-slate-600'}`}>
      {Math.round(Number(value))}%
    </span>
  );
};
