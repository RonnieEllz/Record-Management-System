import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

type Point = { date: string; revenue: number };

export const DailyRevenueChart: React.FC<{ data: Point[] }> = ({ data }) => {
  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 h-full flex flex-col">
      <h4 className="text-sm text-slate-400 mb-3">Daily Revenue (last {data.length} days)</h4>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tickFormatter={(d: any) => format(new Date(String(d)), 'MM/dd')} />
            <YAxis tickFormatter={(v: any) => `K${Number(v ?? 0).toFixed(0)}`} />
            <Tooltip
              formatter={(v: any) => (typeof v === 'number' ? `K${v.toFixed(2)}` : '')}
              labelFormatter={(d: any) => (d ? format(new Date(String(d)), 'PPP') : '')}
            />
            <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DailyRevenueChart;
