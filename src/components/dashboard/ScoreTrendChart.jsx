import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { chartDomain } from '../../lib/kpiMetrics';

const AXIS_TICK = { fill: '#64748B', fontSize: 12 };

/** Grafik tren capaian (%) dengan garis target 100%, mengikuti mockup dashboard. */
export const ScoreTrendChart = ({ data, height = 'h-56', color = '#1D4ED8', label = 'Skor', showTarget = true }) => {
  const hasData = data.some((d) => d.score !== null && d.score !== undefined);
  if (!hasData) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-500 ${height}`}
      >
        Grafik muncul setelah ada data yang divalidasi.
      </div>
    );
  }
  const { domain, ticks } = chartDomain(data);
  const gradientId = `fill-${color.replace('#', '')}`;
  const summary = data
    .filter((d) => d.score !== null && d.score !== undefined)
    .map((d) => `${d.label} ${Math.round(d.score)}%`)
    .join(', ');

  return (
    <figure className={`w-full ${height}`}>
      <figcaption className="sr-only">
        {label}: {summary}
      </figcaption>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.1} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            domain={domain}
            ticks={ticks}
            interval={0}
            allowDataOverflow={false}
            tickFormatter={(v) => `${v}%`}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(val) => [`${val}%`, label]}
            contentStyle={{ borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 13 }}
          />
          {showTarget && (
            <ReferenceLine
              y={100}
              stroke="#64748B"
              strokeDasharray="4 4"
              label={{ value: 'Target 100%', fill: '#475569', fontSize: 12, position: 'insideTopRight' }}
            />
          )}
          <Area
            type="linear"
            dataKey="score"
            connectNulls
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ fill: '#fff', stroke: color, strokeWidth: 2, r: 3.5 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
};
