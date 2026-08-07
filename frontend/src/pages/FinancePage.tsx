import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePageNavigation } from '../context/PageNavigationContext';
import { fetchJobCards, fetchAllBatches, type JobCard, type TransactionBatch } from '../lib/jobCards';
import { canManageFinancials } from '../lib/rbac';
import { getNetworkErrorMessage } from '../lib/supabase';
import { formatDate } from '../lib/dateUtils';
import { Briefcase, Loader2, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, X, Clock3 } from 'lucide-react';
import DailyRevenueChart from '../components/DailyRevenueChart';
import BatchRevenueBarChart from '../components/BatchRevenueBarChart';

export const FinancePage: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentPage } = usePageNavigation();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [batches, setBatches] = useState<TransactionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canViewFinancials = canManageFinancials(user?.role);
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString();

  const totalRevenue = jobs.reduce((sum, job) => sum + Number(job.price ?? 0), 0);
  const monthRevenue = jobs
    .filter((job) => job.created_at >= monthStart && job.created_at < nextMonthStart)
    .reduce((sum, job) => sum + Number(job.price ?? 0), 0);
  const todayRevenue = jobs
    .filter((job) => job.created_at.slice(0, 10) === todayString)
    .reduce((sum, job) => sum + Number(job.price ?? 0), 0);

  const batchSummaries = batches.map((batch) => {
    const batchJobs = jobs.filter((job) => job.batch_id === batch.id);
    const revenue = batchJobs.reduce((sum, job) => sum + Number(job.price ?? 0), 0);
    return {
      ...batch,
      revenue,
      jobCount: batchJobs.length,
    };
  });

  const topBatches = [...batchSummaries].sort((a, b) => new Date(b.batch_date).getTime() - new Date(a.batch_date).getTime());

  const formatCurrency = (amount: number) => `K${amount.toFixed(2)}`;

  const loadFinanceData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [jobsData, batchesData] = await Promise.all([fetchJobCards(), fetchAllBatches()]);
      setJobs(jobsData);
      setBatches(batchesData);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to load finance data.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const buildDailyPoints = (days = 30) => {
    const result: { date: string; revenue: number }[] = [];
    const d = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(d);
      day.setDate(d.getDate() - i);
      const dayStr = day.toISOString().slice(0, 10);
      const revenue = jobs
        .filter((j) => j.created_at.slice(0, 10) === dayStr)
        .reduce((s, j) => s + Number(j.price ?? 0), 0);
      result.push({ date: dayStr, revenue });
    }
    return result;
  };

  const dailyPoints = buildDailyPoints(30);

  const [chartRange, setChartRange] = useState<'daily' | 'monthly'>('daily');

  const buildMonthlyPoints = (months = 12) => {
    const result: { date: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
      const revenue = jobs
        .filter((j) => j.created_at >= monthStart && j.created_at < monthEnd)
        .reduce((s, j) => s + Number(j.price ?? 0), 0);
      result.push({ date: d.toISOString().slice(0, 10), revenue });
    }
    return result;
  };

  const monthlyPoints = buildMonthlyPoints(12);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              Finance
            </h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Review revenue metrics and batch financial summaries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentPage('dashboard')}
          className="glass-button rounded-full px-4 py-2 text-sm"
        >
          Back to overview
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-rose-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm font-medium">Loading finance metrics...</p>
        </div>
      ) : !canViewFinancials ? (
        <div className="p-8 rounded-3xl border border-slate-800 bg-slate-950/60 text-slate-400">
          <p className="text-sm">You do not have permission to view finance metrics.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Today's Revenue</p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-100">{formatCurrency(todayRevenue)}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/60 p-3 shadow-inner shadow-slate-950/40">
                  <Briefcase className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <div className="mt-6 border-t border-slate-800 pt-4 text-sm leading-6 text-slate-400">
                Revenue from job cards created today, updated as batches close and jobs are completed.
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-slate-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">This Month</p>
                  <p className="text-3xl font-semibold text-slate-100">{formatCurrency(monthRevenue)}</p>
                </div>
                <Clock3 className="w-6 h-6 text-amber-400" />
              </div>
              <p className="mt-3 text-xs text-slate-500">Revenue from job cards created this month.</p>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-slate-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Total Revenue</p>
                  <p className="text-3xl font-semibold text-slate-100">{formatCurrency(totalRevenue)}</p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-slate-300" />
              </div>
              <p className="mt-3 text-xs text-slate-500">Total revenue across all job cards.</p>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <div className="rounded-lg bg-slate-800/40 px-2 py-1 text-xs inline-flex gap-1">
              <button
                className={`px-3 py-1 rounded-lg ${chartRange === 'daily' ? 'bg-slate-950 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setChartRange('daily')}
              >
                Daily
              </button>
              <button
                className={`px-3 py-1 rounded-lg ${chartRange === 'monthly' ? 'bg-slate-950 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setChartRange('monthly')}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 items-stretch">
            <div className="h-full flex flex-col">
              <DailyRevenueChart data={chartRange === 'daily' ? dailyPoints : monthlyPoints} />
            </div>

            <div className="h-full flex flex-col">
              <BatchRevenueBarChart
                data={chartRange === 'daily' ? topBatches.slice(0, 8).map((b) => ({ name: formatDate(b.batch_date), revenue: b.revenue })) : monthlyPoints.map((p) => ({ name: p.date.slice(0, 7), revenue: p.revenue }))}
              />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Batch Revenue Summary</h3>
                <p className="text-xs text-slate-500">Top batches by date and revenue.</p>
              </div>
              <button
                type="button"
                onClick={loadFinanceData}
                className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-2"
              >
                Refresh
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {topBatches.length === 0 ? (
              <p className="text-sm text-slate-500">No batch revenue information is available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Batch Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Job Count</th>
                      <th className="px-5 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {topBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-900/70 transition-colors">
                        <td className="px-5 py-4 text-slate-100">{formatDate(batch.batch_date)}</td>
                        <td className="px-5 py-4 text-slate-300">{batch.status}</td>
                        <td className="px-5 py-4 text-right text-slate-100">{batch.jobCount}</td>
                        <td className="px-5 py-4 text-right text-slate-100">{formatCurrency(batch.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
