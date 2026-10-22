import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  unit = '',
  description,
  trend,
  trendType = 'up', // 'up' | 'down' | 'neutral'
  icon: Icon,
  colorScheme = 'indigo',
}) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50/70',
      iconBg: 'bg-indigo-500 text-white',
      border: 'border-indigo-100',
    },
    emerald: {
      bg: 'bg-emerald-50/70',
      iconBg: 'bg-emerald-500 text-white',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50/70',
      iconBg: 'bg-amber-500 text-white',
      border: 'border-amber-100',
    },
    rose: {
      bg: 'bg-rose-50/70',
      iconBg: 'bg-rose-500 text-white',
      border: 'border-rose-100',
    },
    sky: {
      bg: 'bg-sky-50/70',
      iconBg: 'bg-sky-500 text-white',
      border: 'border-sky-100',
    },
  };

  const scheme = colorMap[colorScheme] || colorMap.indigo;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-extrabold text-slate-900">{value}</span>
        {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </div>

      {(trend || description) && (
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
          {description && <span className="text-slate-500">{description}</span>}
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                trendType === 'up'
                  ? 'text-emerald-600'
                  : trendType === 'down'
                  ? 'text-rose-600'
                  : 'text-slate-500'
              }`}
            >
              {trendType === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {trendType === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
              {trendType === 'neutral' && <Minus className="w-3.5 h-3.5" />}
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
