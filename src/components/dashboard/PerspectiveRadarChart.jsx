import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export const PerspectiveRadarChart = ({ data = [] }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="perspektif"
            tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 120]}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, 'Capaian Rata-rata']}
            contentStyle={{
              backgroundColor: '#1e293b',
              borderRadius: '0.75rem',
              color: '#fff',
              border: 'none',
              fontSize: '12px',
            }}
          />
          <Radar
            name="Capaian (%)"
            dataKey="capaian"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.45}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
