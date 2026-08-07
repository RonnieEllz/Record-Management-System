import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

type Item = { name: string; revenue: number };

export const BatchRevenueBarChart: React.FC<{ data: Item[] }> = ({ data }) => {
  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 h-full flex flex-col">
      <h4 className="text-sm text-slate-400 mb-3">Top Batches by Revenue</h4>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 24, bottom: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
            <XAxis type="number" tickFormatter={(v: any) => `K${Number(v ?? 0).toFixed(0)}`} />
            <YAxis type="category" dataKey="name" width={140} />
            <Tooltip formatter={(v: any) => (typeof v === 'number' ? `K${v.toFixed(2)}` : '')} />
            <Bar dataKey="revenue" fill="#7C3AED" radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BatchRevenueBarChart;
