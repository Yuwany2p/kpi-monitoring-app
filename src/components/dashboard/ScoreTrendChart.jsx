import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { chartDomain } from '../../lib/kpiMetrics';

/** Grafik tren capaian (%) dengan garis target 100%, mengikuti mockup dashboard. */
export const ScoreTrendChart = ({
  data,
  height = 'h-56',
  color = '#1D4ED8',
  label = 'Skor',
  showTarget = true,
}) => {
  const hasData = data.some((d) => d.score !== null && d.score !== undefined);
  if (!hasData) {
    return (
      <div className={`flex w-full items-center justify-center text-sm text-slate-500 ${height}`}>
        Grafik muncul setelah ada data yang divalidasi.
      </div>
    );
  }
  const gradientId = `fill-${color.replace('#', '')}`;
  return (
    <div className={`w-full ${height}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.12} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={chartDomain(data)}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: '#64748B', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(val) => [`${val}%`, label]}
            contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
          />
          {showTarget && (
            <ReferenceLine
              y={100}
              stroke="#16A34A"
              strokeDasharray="5 4"
              label={{ value: 'Target 100%', fill: '#16A34A', fontSize: 12, position: 'insideTopRight' }}
            />
          )}
          <Area
            type="linear"
            dataKey="score"
            connectNulls
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={{ fill: '#fff', stroke: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
