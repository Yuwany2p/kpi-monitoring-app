import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const DepartmentComparison = ({ data = [] }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="nama"
            interval={0}
            angle={-15}
            textAnchor="end"
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <YAxis domain={[0, 120]} tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`${value}%`, 'Rata-rata Capaian']}
            contentStyle={{
              backgroundColor: '#1e293b',
              borderRadius: '0.75rem',
              color: '#fff',
              border: 'none',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="capaian" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.capaian >= 100 ? '#10b981' : entry.capaian >= 80 ? '#f59e0b' : '#f43f5e'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
