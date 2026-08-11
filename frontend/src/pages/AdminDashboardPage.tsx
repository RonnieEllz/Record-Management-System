import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCustomers, type Customer } from '../lib/customers';
import { fetchJobCards, type JobCard } from '../lib/jobCards';
import { getNetworkErrorMessage } from '../lib/supabase';
import { formatDate } from '../lib/dateUtils';
import { canCreateCustomers, canCreateJobCards, canManageFinancials } from '../lib/rbac';
import { Briefcase, Users, Clock3, Loader2, AlertCircle, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { GlassButton } from '../components/GlassButton';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAddCustomer = canCreateCustomers(user?.role);
  const canAddJobCard = canCreateJobCards(user?.role);
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

  const formatCurrency = (amount: number) => `K${amount.toFixed(2)}`;

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [customerData, jobCardData] = await Promise.all([fetchCustomers(''), fetchJobCards()]);
      setCustomers(customerData);
      setJobs(jobCardData);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to load dashboard information.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const waitingJobsByCustomer = new Map<string, typeof jobs[number]>();
  [...jobs]
    .filter((job) => job.status === 'WAITING_FOR_COLLECTION' && job.customer_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .forEach((job) => {
      if (job.customer_id && !waitingJobsByCustomer.has(job.customer_id)) {
        waitingJobsByCustomer.set(job.customer_id, job);
      }
    });

  const recentCustomers = [...customers]
    .filter((customer) => waitingJobsByCustomer.has(customer.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((customer) => ({
      customer,
      job: waitingJobsByCustomer.get(customer.id)!,
    }));

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  const jobsByStatus = jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.status] = (acc[job.status] ?? 0) + 1;
    return acc;
  }, {});

  const handleNavigate = (page: 'customers' | 'jobs') => {
    navigate(`/${page}`);
  };

  return (
    <div className="w-full max-w-7xl min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              Admin Dashboard
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GlassButton
            type="button"
            onClick={() => handleNavigate('customers')}
            icon={<Users className="w-4 h-4" />}
            className="rounded-full px-4 py-2 text-sm"
          >
            Customers
          </GlassButton>
          <GlassButton
            type="button"
            onClick={() => handleNavigate('jobs')}
            icon={<Briefcase className="w-4 h-4" />}
            className="rounded-full px-4 py-2 text-sm"
          >
            Jobs Queue
          </GlassButton>
        </div>
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

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="glass-panel min-w-0 p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Customers</p>
              <p className="text-3xl font-semibold text-slate-100">{customers.length}</p>
            </div>
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Total active customer contacts in the system.</p>
        </div>

        <div className="glass-panel min-w-0 p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Job Cards</p>
              <p className="text-3xl font-semibold text-slate-100">{jobs.length}</p>
            </div>
            <Briefcase className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Total job cards created across all customers.</p>
        </div>

        <div className="glass-panel min-w-0 p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Open Jobs</p>
              <p className="text-3xl font-semibold text-slate-100">{(jobsByStatus.RECEIVED ?? 0) + (jobsByStatus.IN_PROGRESS ?? 0) + (jobsByStatus.WAITING_FOR_COLLECTION ?? 0)}</p>
            </div>
            <Clock3 className="w-6 h-6 text-amber-400" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Jobs currently in active workflow stages.</p>
        </div>

        <div className="glass-panel min-w-0 p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Ready for collection</p>
              <p className="text-3xl font-semibold text-slate-100">{jobsByStatus.WAITING_FOR_COLLECTION ?? 0}</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Jobs waiting to be collected by customers.</p>
        </div>

        <div className="glass-panel min-w-0 p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Today's Revenue</p>
              <p className="text-3xl font-semibold text-slate-100">{formatCurrency(todayRevenue)}</p>
            </div>
            <Briefcase className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Revenue from job cards created today.</p>
        </div>
      </div>

      {/* Financial page remains available via the Finance view; summary revenue shown above */}

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="glass-panel min-w-0 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Collection</h3>
              <p className="text-xs text-slate-500">Customers with jobs in WAITING FOR COLLECTION.</p>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate('customers')}
              className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-2"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-slate-400">
              <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            </div>
          ) : recentCustomers.length === 0 ? (
            <p className="text-sm text-slate-500">No customers available yet.</p>
          ) : (
            <div className="space-y-4">
              {recentCustomers.map(({ customer, job }) => (
                <div key={customer.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div>
                      <p className="font-semibold text-slate-100">{customer.name}</p>
                      <p className="text-xs text-slate-500">{customer.company}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      {formatDate(job.created_at)}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] items-center">
                    <div className="text-xs text-slate-400">{customer.phone}</div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-100">
                      {job.job_reference}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel min-w-0 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Recent Job Cards</h3>
              <p className="text-xs text-slate-500">Most recent jobs created in the queue.</p>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate('jobs')}
              className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-2"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-slate-400">
              <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            </div>
          ) : recentJobs.length === 0 ? (
            <p className="text-sm text-slate-500">No job cards have been created yet.</p>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-100">{job.job_reference}</p>
                      <p className="text-xs text-slate-500">{job.customer_name}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{job.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span>{job.company_name}</span>
                    <span>{formatDate(job.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel min-w-0 p-6 rounded-3xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Actions</p>
            <h3 className="text-xl font-semibold text-slate-100">Admin quick access</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <GlassButton
              type="button"
              onClick={() => handleNavigate('customers')}
              className="rounded-full px-4 py-2 text-sm"
            >
              Customer Directory
            </GlassButton>
            <GlassButton
              type="button"
              onClick={() => handleNavigate('jobs')}
              className="rounded-full px-4 py-2 text-sm"
            >
              Jobs Queue
            </GlassButton>
            {canAddCustomer && (
              <GlassButton
                type="button"
                onClick={() => handleNavigate('customers')}
                className="rounded-full px-4 py-2 text-sm"
              >
                Add Customer
              </GlassButton>
            )}
            {canAddJobCard && (
              <GlassButton
                type="button"
                onClick={() => handleNavigate('customers')}
                className="rounded-full px-4 py-2 text-sm"
              >
                Create Job Card
              </GlassButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
