import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchJobCards, updateJobCard, type JobCard } from '../lib/jobCards';
import { getNetworkErrorMessage } from '../lib/supabase';
import { canUpdateTechnicianNotes, canManageJobCardAssignments } from '../lib/rbac';
import { Modal } from '../components/Modal';
import { formatDate } from '../lib/dateUtils';
import SearchInput from '../components/SearchInput';
import { JobDetailModal } from '../components/JobDetailModal';
import { Wrench, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getStatusBadgeClass, getStatusLabel } from '../lib/status';

type PendingStatusChange = {
  job: JobCard;
  nextStatus: JobCard['status'];
};

export const TechnicianPage: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);

  const canUpdateNotes = canUpdateTechnicianNotes(user?.role);
  const canManageAssignments = canManageJobCardAssignments(user?.role);

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchJobCards();
      setJobs((data ?? []).filter((job) => job.status !== 'WAITING_FOR_COLLECTION' && job.status !== 'COLLECTED'));
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Failed to load technician work queue.'));
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

  const performStatusAdvance = async (job: JobCard, nextStatus: JobCard['status']) => {
    try {
      await updateJobCard(job.id, {
        status: nextStatus,
        notes: job.notes ?? '',
      });

      setSuccessMessage(`Job card ${job.job_reference} moved to ${nextStatus.replace(/_/g, ' ')}.`);
      await loadJobs();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to update the work item.'));
    }
  };

  const handleStatusAdvance = (job: JobCard, nextStatus: JobCard['status']) => {
    if (nextStatus === 'IN_PROGRESS' || nextStatus === 'WAITING_FOR_COLLECTION') {
      setPendingStatusChange({ job, nextStatus });
      return;
    }

    void performStatusAdvance(job, nextStatus);
  };

  const getConfirmationActionLabel = (nextStatus: JobCard['status']) => {
    if (nextStatus === 'IN_PROGRESS') return 'Start work';
    if (nextStatus === 'WAITING_FOR_COLLECTION') return 'Mark ready for collection';
    return 'Confirm';
  };

  const confirmPendingStatusChange = async () => {
    if (!pendingStatusChange) return;

    const { job, nextStatus } = pendingStatusChange;
    setPendingStatusChange(null);
    await performStatusAdvance(job, nextStatus);
  };

  const handleOpenJobDetail = (job: JobCard) => {
    setSelectedJob(job);
  };

  const handleCloseJobDetail = () => {
    setSelectedJob(null);
  };

  const filteredJobs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return jobs;
    }

    return jobs.filter((job) =>
      job.job_reference.toLowerCase().includes(query) ||
      job.customer_name.toLowerCase().includes(query),
    );
  }, [jobs, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Technician Work Queue</h2>
          </div>
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search reference or contact name"
          ariaLabel="Search technician job queue"
          className="w-full lg:w-80"
        />
        {searchTerm ? (
          <div className="text-sm text-slate-400">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </div>
        ) : null}
      </div>

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
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[860px] text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Contact Name</th>
                  <th className="px-6 py-4">Date In</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td
                      className="px-6 py-4 font-semibold text-slate-100 cursor-pointer"
                      onClick={() => handleOpenJobDetail(job)}
                    >
                      {job.job_reference}
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => handleOpenJobDetail(job)}
                    >
                      <div className="font-medium text-slate-200">{job.customer_name}</div>
                      <div className="text-xs text-slate-400">{job.company_name}</div>
                    </td>
                    <td
                      className="px-6 py-4 text-xs text-slate-400 cursor-pointer"
                      onClick={() => handleOpenJobDetail(job)}
                    >
                      {formatDate(job.created_at)}
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => handleOpenJobDetail(job)}
                    >
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${getStatusBadgeClass(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-slate-400 max-w-xs truncate cursor-pointer"
                      onClick={() => handleOpenJobDetail(job)}
                    >
                      {job.notes || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManageAssignments && getJobAction(job) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusAdvance(job, getJobAction(job)!.nextStatus);
                            }}
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
      <Modal
        isOpen={Boolean(pendingStatusChange)}
        onClose={() => setPendingStatusChange(null)}
        title={pendingStatusChange?.nextStatus === 'IN_PROGRESS' ? 'Confirm Start Work' : 'Confirm Ready for Collection'}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            {getConfirmationActionLabel(pendingStatusChange?.nextStatus ?? 'IN_PROGRESS')} for job{' '}
            <strong className="text-white">{pendingStatusChange?.job.job_reference}</strong>?
          </p>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPendingStatusChange(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmPendingStatusChange}
              className="glass-button text-sm"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      <JobDetailModal
        isOpen={Boolean(selectedJob)}
        onClose={handleCloseJobDetail}
        job={selectedJob}
        userRole={user?.role}
        onJobUpdated={loadJobs}
      />
    </div>
  );
};
