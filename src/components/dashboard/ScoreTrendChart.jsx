import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { chartDomain } from '../../lib/kpiMetrics';

/** Grafik tren skor (%) dengan garis target 100%. */
export const ScoreTrendChart = ({
  data,
  height = 'h-48',
  color = '#1d4ed8',
  label = 'Skor',
  showTarget = true,
}) => {
  const hasData = data.some((d) => d.score !== null && d.score !== undefined);
  if (!hasData) {
    return (
      <div className={`w-full ${height} flex items-center justify-center text-xs text-slate-400`}>
        Belum ada data tervalidasi untuk grafik tren.
      </div>
    );
  }
  return (
    <div className={`w-full ${height}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis domain={chartDomain(data)} tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip
            formatter={(val) => [`${val}%`, label]}
            contentStyle={{
              backgroundColor: '#0f1e36',
              borderRadius: '0.75rem',
              color: '#fff',
              fontSize: '11px',
            }}
          />
          {showTarget && (
            <ReferenceLine
              y={100}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{ value: 'Target 100%', fill: '#10b981', fontSize: 10, position: 'top' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="score"
            connectNulls
            stroke={color}
            strokeWidth={2.5}
            dot={{ fill: '#ffffff', stroke: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
