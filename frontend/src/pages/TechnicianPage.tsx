import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchJobCards, updateJobCard, type JobCard } from '../lib/jobCards';
import { canUpdateTechnicianNotes, canManageJobCardAssignments } from '../lib/rbac';
import { formatDate } from '../lib/dateUtils';
import { Wrench, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export const TechnicianPage: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canUpdateNotes = canUpdateTechnicianNotes(user?.role);
  const canManageAssignments = canManageJobCardAssignments(user?.role);

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchJobCards();
      setJobs((data ?? []).filter((job) => job.status !== 'WAITING_FOR_COLLECTION' && job.status !== 'COLLECTED'));
    } catch (err: any) {
      setError(err?.message || 'Failed to load technician work queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const getJobAction = (job: JobCard): { label: string; nextStatus: JobCard['status'] } | null => {
    switch (job.status) {
      case 'RECEIVED':
      case 'WAITING_FOR_INSPECTION':
        return { label: 'Start Work', nextStatus: 'IN_PROGRESS' };
      case 'IN_PROGRESS':
        return { label: 'Mark Ready for Collection', nextStatus: 'WAITING_FOR_COLLECTION' };
      default:
        return null;
    }
  };

  const handleStatusAdvance = async (job: JobCard, nextStatus: JobCard['status']) => {
    try {
      await updateJobCard(job.id, {
        status: nextStatus,
        notes: job.notes ?? '',
      });

      setSuccessMessage(`Job card ${job.job_reference} moved to ${nextStatus.replace(/_/g, ' ')}.`);
      await loadJobs();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Unable to update the work item.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Technician Work Queue</h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Technician workflow for status updates, notes, and assignment ownership.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'var(--outline)', background: 'var(--accent-soft)', color: 'var(--text)' }}>
          <ShieldCheck className="w-4 h-4" />
          <span>Role-restricted technician access</span>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-sm font-medium">Loading technician queue...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-base font-semibold text-slate-300">No job cards are currently available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Contact Name</th>
                  <th className="px-6 py-4">Date In</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-100">{job.job_reference}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{job.customer_name}</div>
                      <div className="text-xs text-slate-400">{job.company_name}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{formatDate(job.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold">
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{job.notes || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManageAssignments && getJobAction(job) && (
                          <button
                            onClick={() => handleStatusAdvance(job, getJobAction(job)!.nextStatus)}
                            className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-semibold"
                          >
                            {getJobAction(job)!.label}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
