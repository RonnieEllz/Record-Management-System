import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchJobCards,
  fetchJobCardsForBatch,
  fetchJobCardsForCurrentMonth,
  fetchTodayBatch,
  createTransactionBatch,
  closeTransactionBatch,
  reopenTransactionBatch,
  type JobCard,
  type TransactionBatch,
} from '../lib/jobCards';
import { getNetworkErrorMessage, supabase } from '../lib/supabase';
import { JobDetailModal } from '../components/JobDetailModal';
import { Modal } from '../components/Modal';
import { formatDate } from '../lib/dateUtils';
import { canViewAllTransactions, canCloseTransactionBatches, canReopenTransactionBatches } from '../lib/rbac';
import { Briefcase, Loader2, AlertCircle, CheckCircle2, X, Filter, Clock3 } from 'lucide-react';
import SearchInput from '../components/SearchInput';
import { getStatusBadgeClass, getStatusLabel } from '../lib/status';

export const JobsQueuePage: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  const [todayBatch, setTodayBatch] = useState<TransactionBatch | null>(null);
  const [viewMode, setViewMode] = useState<'TODAY' | 'MONTH' | 'ALL'>('TODAY');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningBatch, setIsOpeningBatch] = useState(false);
  const [isOpenBatchConfirmOpen, setIsOpenBatchConfirmOpen] = useState(false);
  const [openBatchPassword, setOpenBatchPassword] = useState('');
  const [openBatchPasswordError, setOpenBatchPasswordError] = useState<string | null>(null);
  const [isClosingBatch, setIsClosingBatch] = useState(false);
  const [isCloseBatchConfirmOpen, setIsCloseBatchConfirmOpen] = useState(false);
  const [closeBatchPassword, setCloseBatchPassword] = useState('');
  const [closeBatchPasswordError, setCloseBatchPasswordError] = useState<string | null>(null);
  const [isReopeningBatch, setIsReopeningBatch] = useState(false);
  const [isReopenBatchConfirmOpen, setIsReopenBatchConfirmOpen] = useState(false);
  const [reopenBatchPassword, setReopenBatchPassword] = useState('');
  const [reopenBatchPasswordError, setReopenBatchPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobCard['status'] | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const loadBatchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [batch, monthJobs] = await Promise.all([fetchTodayBatch(), fetchJobCardsForCurrentMonth()]);
      setTodayBatch(batch);

      const loadAll = canViewAllTransactions(user?.role);
      if (viewMode === 'ALL' && loadAll) {
        const allJobs = await fetchJobCards();
        setJobs(allJobs);
      } else if (viewMode === 'MONTH') {
        setJobs(monthJobs);
      } else {
        setJobs(batch ? await fetchJobCardsForBatch(batch.id) : []);
      }
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Failed to load job queue.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatchData();
  }, [viewMode, user?.role]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleOpenDetail = (job: JobCard) => {
    setSelectedJob(job);
    setIsDetailModalOpen(true);
  };

  const handleJobUpdated = () => {
    loadBatchData();
  };

  const canCloseBatch = canCloseTransactionBatches(user?.role);
  const canReopenBatch = canReopenTransactionBatches(user?.role);
  const canSeeAllTransactions = canViewAllTransactions(user?.role);

  const openBatchConfirm = () => {
    setOpenBatchPassword('');
    setOpenBatchPasswordError(null);
    setIsOpenBatchConfirmOpen(true);
  };

  const openCloseBatchConfirm = () => {
    setCloseBatchPassword('');
    setCloseBatchPasswordError(null);
    setIsCloseBatchConfirmOpen(true);
  };

  const openReopenBatchConfirm = () => {
    setReopenBatchPassword('');
    setReopenBatchPasswordError(null);
    setIsReopenBatchConfirmOpen(true);
  };

  const handleConfirmOpenBatch = async () => {
    if (!user?.email || !user?.id) return;

    setOpenBatchPasswordError(null);
    if (!openBatchPassword.trim()) {
      setOpenBatchPasswordError('Please enter your password to confirm.');
      return;
    }

    setIsOpeningBatch(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: openBatchPassword,
    });

    if (authError) {
      setIsOpeningBatch(false);
      setOpenBatchPasswordError('Password is incorrect. Please try again.');
      return;
    }

    try {
      await createTransactionBatch(user.id);
      setSuccessMessage("Today's batch was opened successfully.");
      await loadBatchData();
      setIsOpenBatchConfirmOpen(false);
      setOpenBatchPassword('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, "Unable to open today's batch."));
    } finally {
      setIsOpeningBatch(false);
    }
  };

  const handleConfirmCloseBatch = async () => {
    if (!todayBatch || !user?.email) return;

    setCloseBatchPasswordError(null);
    if (!closeBatchPassword.trim()) {
      setCloseBatchPasswordError('Please enter your password to confirm.');
      return;
    }

    setIsClosingBatch(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: closeBatchPassword,
    });

    if (authError) {
      setIsClosingBatch(false);
      setCloseBatchPasswordError('Password is incorrect. Please try again.');
      return;
    }

    try {
      await closeTransactionBatch(todayBatch.id, user.id);
      setSuccessMessage('Today\'s batch was closed successfully.');
      await loadBatchData();
      setViewMode('MONTH');
      setIsCloseBatchConfirmOpen(false);
      setCloseBatchPassword('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to close today\'s batch.'));
    } finally {
      setIsClosingBatch(false);
    }
  };

  const handleConfirmReopenBatch = async () => {
    if (!todayBatch || !user?.email) return;

    setReopenBatchPasswordError(null);
    if (!reopenBatchPassword.trim()) {
      setReopenBatchPasswordError('Please enter your password to confirm.');
      return;
    }

    setIsClosingBatch(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: reopenBatchPassword,
    });

    if (authError) {
      setIsClosingBatch(false);
      setReopenBatchPasswordError('Password is incorrect. Please try again.');
      return;
    }

    try {
      await reopenTransactionBatch(todayBatch.id, user.id);
      setSuccessMessage('Today\'s batch was reopened successfully.');
      await loadBatchData();
      setViewMode('TODAY');
      setIsReopenBatchConfirmOpen(false);
      setReopenBatchPassword('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to reopen today\'s batch.'));
    } finally {
      setIsReopeningBatch(false);
    }
  };


  // Filter jobs by status and search term
  const filteredJobs = (statusFilter === 'ALL' ? jobs : jobs.filter((j) => j.status === statusFilter)).filter((job) => {
    const query = debouncedSearch.toLowerCase();
    if (!query) {
      return true;
    }

    return [
      job.customer_name,
      job.company_name,
      job.phone_number,
      job.job_reference,
      job.status,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  // Use shared status helpers from lib/status.ts

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              Jobs Queue
            </h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage and track job card lifecycle
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('TODAY')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'TODAY' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setViewMode('MONTH')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'MONTH' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            This Month
          </button>
          {canSeeAllTransactions && (
            <button
              type="button"
              onClick={() => setViewMode('ALL')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'ALL' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              All History
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel p-4 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3">
            <Clock3 className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current View</p>
              <p className="text-sm text-slate-200">{viewMode === 'TODAY' ? 'Today' : viewMode === 'MONTH' ? 'This Month' : 'All History'}</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Today&apos;s Batch</p>
            <p className="text-sm text-slate-200">{todayBatch ? todayBatch.status : 'No batch yet'}</p>
            {todayBatch?.closed_at && (
              <p className="text-xs text-slate-400 mt-1">Closed: {formatDate(todayBatch.closed_at)}</p>
            )}
            {todayBatch?.reopened_at && (
              <p className="text-xs text-slate-400 mt-1">Reopened: {formatDate(todayBatch.reopened_at)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!todayBatch && canCloseBatch && (
              <button
                type="button"
                onClick={openBatchConfirm}
                disabled={isOpeningBatch}
                className="glass-button text-sm"
              >
                {isOpeningBatch ? 'Opening...' : 'Open Today'}
              </button>
            )}
            {canCloseBatch && todayBatch?.status === 'OPEN' && (
              <button
                type="button"
                onClick={openCloseBatchConfirm}
                disabled={isClosingBatch}
                className="glass-button text-sm"
              >
                {isClosingBatch ? 'Closing...' : 'Close Today'}
              </button>
            )}
            {canReopenBatch && todayBatch?.status === 'CLOSED' && (
              <button
                type="button"
                onClick={openReopenBatchConfirm}
                disabled={isReopeningBatch}
                className="glass-button text-sm"
              >
                {isReopeningBatch ? 'Reopening...' : 'Reopen Batch'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-emerald-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
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

      <Modal
        isOpen={isCloseBatchConfirmOpen}
        onClose={() => {
          setIsCloseBatchConfirmOpen(false);
          setCloseBatchPassword('');
          setCloseBatchPasswordError(null);
        }}
        title="Confirm Close Batch"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            To close today's batch, please confirm your identity by entering your account password.
          </p>
          <div className="space-y-2">
            <label htmlFor="close-batch-password" className="block text-sm font-medium text-slate-400">
              Password
            </label>
            <input
              id="close-batch-password"
              type="password"
              value={closeBatchPassword}
              onChange={(e) => setCloseBatchPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
              placeholder="Enter your password"
            />
            {closeBatchPasswordError && <p className="text-sm text-rose-400">{closeBatchPasswordError}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsCloseBatchConfirmOpen(false);
                setCloseBatchPassword('');
                setCloseBatchPasswordError(null);
              }}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmCloseBatch}
              disabled={isClosingBatch}
              className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {isClosingBatch ? 'Closing...' : 'Confirm Close'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isOpenBatchConfirmOpen}
        onClose={() => {
          setIsOpenBatchConfirmOpen(false);
          setOpenBatchPassword('');
          setOpenBatchPasswordError(null);
        }}
        title="Confirm Open Batch"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Opening today's batch will allow job cards to be created for today. Please confirm your identity by entering your password.
          </p>
          <div className="space-y-2">
            <label htmlFor="open-batch-password" className="block text-sm font-medium text-slate-400">
              Password
            </label>
            <input
              id="open-batch-password"
              type="password"
              value={openBatchPassword}
              onChange={(e) => setOpenBatchPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
              placeholder="Enter your password"
            />
            {openBatchPasswordError && <p className="text-sm text-rose-400">{openBatchPasswordError}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsOpenBatchConfirmOpen(false);
                setOpenBatchPassword('');
                setOpenBatchPasswordError(null);
              }}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmOpenBatch}
              disabled={isOpeningBatch}
              className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {isOpeningBatch ? 'Opening...' : 'Confirm Open'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReopenBatchConfirmOpen}
        onClose={() => {
          setIsReopenBatchConfirmOpen(false);
          setReopenBatchPassword('');
          setReopenBatchPasswordError(null);
        }}
        title="Confirm Reopen Batch"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Reopening this batch will mark it as open again. Please confirm your identity by entering your password.
          </p>
          <div className="space-y-2">
            <label htmlFor="reopen-batch-password" className="block text-sm font-medium text-slate-400">
              Password
            </label>
            <input
              id="reopen-batch-password"
              type="password"
              value={reopenBatchPassword}
              onChange={(e) => setReopenBatchPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
              placeholder="Enter your password"
            />
            {reopenBatchPasswordError && <p className="text-sm text-rose-400">{reopenBatchPasswordError}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsReopenBatchConfirmOpen(false);
                setReopenBatchPassword('');
                setReopenBatchPasswordError(null);
              }}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReopenBatch}
              disabled={isReopeningBatch}
              className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {isReopeningBatch ? 'Reopening...' : 'Confirm Reopen'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase text-slate-400">Filter by Status:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'RECEIVED', 'IN_PROGRESS', 'WAITING_FOR_COLLECTION', 'COLLECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as JobCard['status'] | 'ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0 max-w-sm">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => setSearchTerm('')}
            placeholder="Search by reference, contact, company or phone"
            ariaLabel="Search jobs"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium sm:ml-auto">
          {filteredJobs.length} of {jobs.length} jobs
        </div>
      </div>

      {/* Jobs Table */}
      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm font-medium">Loading job queue...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-base font-semibold text-slate-300">No jobs found</p>
            <p className="text-sm text-slate-500 mt-1">
              {statusFilter !== 'ALL'
                ? `No jobs with status "${statusFilter.replace(/_/g, ' ')}"`
                : 'No jobs are currently in the queue'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain">
            <table className="w-full min-w-[900px] text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-4 font-semibold sm:px-6">Date In</th>
                  <th className="px-3 py-4 font-semibold sm:px-6">Contact Name</th>
                  <th className="px-3 py-4 font-semibold sm:px-6">Reference</th>
                  <th className="px-3 py-4 font-semibold sm:px-6">Status</th>
                  <th className="px-3 py-4 font-semibold text-right sm:px-6">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => handleOpenDetail(job)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-xs text-slate-400">{formatDate(job.created_at)}</td>
                    <td className="px-6 py-4 text-slate-300">{job.customer_name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-100">
                      <span className="hover:text-indigo-400">{job.job_reference}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${getStatusBadgeClass(
                          job.status,
                        )}`}
                      >
                        {getStatusLabel(job.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-100">
                      {job.price != null ? `K${job.price.toFixed(2)}` : 'K0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <JobDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedJob(null);
        }}
        job={selectedJob}
        userRole={user?.role}
        onJobUpdated={handleJobUpdated}
      />
    </div>
  );
};
