import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchJobCards, type JobCard } from '../lib/jobCards';
import { JobDetailModal } from '../components/JobDetailModal';
import { formatDate } from '../lib/dateUtils';
import { Briefcase, Loader2, AlertCircle, CheckCircle2, X, Filter } from 'lucide-react';
import SearchInput from '../components/SearchInput';

export const JobsQueuePage: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobCard['status'] | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchJobCards();
      setJobs(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load job queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

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
    loadJobs();
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

  // Get status badge color
  const getStatusColor = (status: JobCard['status']) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      case 'IN_PROGRESS':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      case 'WAITING_FOR_COLLECTION':
        return 'bg-orange-500/10 text-orange-300 border-orange-500/20';
      case 'COLLECTED':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    }
  };

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
        <div className="ml-auto text-xs text-slate-400 font-medium">
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
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full min-w-[900px] text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date In</th>
                  <th className="px-6 py-4 font-semibold">Contact Name</th>
                  <th className="px-6 py-4 font-semibold">Reference</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Price</th>
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
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${getStatusColor(
                          job.status,
                        )}`}
                      >
                        {job.status.replace(/_/g, ' ')}
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
