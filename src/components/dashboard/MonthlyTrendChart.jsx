import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const MonthlyTrendChart = ({ data = [] }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCapaian" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="bulan" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis domain={[50, 110]} tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`${value}%`, 'Capaian']}
            contentStyle={{
              backgroundColor: '#1e293b',
              borderRadius: '0.75rem',
              color: '#fff',
              border: 'none',
              fontSize: '12px',
            }}
          />
          <Area
            type="monotone"
            dataKey="capaian"
            stroke="#16a34a"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorCapaian)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
