import React, { useState } from 'react';
import { Modal } from './Modal';
import { JobTimeline } from './JobTimeline';
import { deleteJobCard, updateJobCard, type JobCard } from '../lib/jobCards';
import { getNetworkErrorMessage } from '../lib/supabase';
import type { Role } from '../lib/auth';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { getStatusBadgeClass, getStatusLabel } from '../lib/status';

interface JobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobCard | null;
  userRole: Role | null | undefined;
  onJobUpdated?: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  isOpen,
  onClose,
  job,
  userRole,
  onJobUpdated,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartWorkConfirm, setShowStartWorkConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [efdReceiptNum, setEfdReceiptNum] = useState(job?.efd_receipt_num ?? '');

  React.useEffect(() => {
    setEfdReceiptNum(job?.efd_receipt_num ?? '');
  }, [job]);

  if (!job) return null;

  // Determine next valid status based on current status and user role
  const getNextStatus = (): JobCard['status'] | null => {
    if (!userRole) return null;

    switch (job.status) {
      case 'RECEIVED':
      case 'WAITING_FOR_INSPECTION':
        return userRole === 'TECHNICIAN' || userRole === 'ADMINISTRATOR' ? 'IN_PROGRESS' : null;
      case 'IN_PROGRESS':
        return userRole === 'TECHNICIAN' || userRole === 'ADMINISTRATOR' ? 'WAITING_FOR_COLLECTION' : null;
      case 'WAITING_FOR_COLLECTION':
        return userRole === 'RECEPTIONIST' || userRole === 'ADMINISTRATOR' ? 'COLLECTED' : null;
      case 'COLLECTED':
        return null;
      default:
        return null;
    }
  };

  const getActionLabel = (): string => {
    switch (job.status) {
      case 'RECEIVED':
      case 'WAITING_FOR_INSPECTION':
        return 'Start Work';
      case 'IN_PROGRESS':
        return 'Mark Ready for Collection';
      case 'WAITING_FOR_COLLECTION':
        return 'Confirm Collection';
      case 'COLLECTED':
        return 'Completed';
      default:
        return 'Update Status';
    }
  };

  const performStatusTransition = async (nextStatus: JobCard['status']) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: Partial<Pick<JobCard, 'status' | 'notes' | 'assigned_to_id' | 'efd_receipt_num'>> = {
        status: nextStatus,
        notes: job.notes ?? '',
      };

      if (nextStatus === 'COLLECTED') {
        payload.efd_receipt_num = efdReceiptNum.trim() || null;
      }

      await updateJobCard(job.id, payload);

      setTimeout(() => {
        onJobUpdated?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to update job status'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusTransition = () => {
    const nextStatus = getNextStatus();
    if (!nextStatus) return;

    if (nextStatus === 'IN_PROGRESS') {
      setShowStartWorkConfirm(true);
      return;
    }

    if (nextStatus === 'COLLECTED' && !efdReceiptNum.trim()) {
      setError('EFD receipt number is required to confirm collection.');
      return;
    }

    void performStatusTransition(nextStatus);
  };

  const confirmStartWork = async () => {
    setShowStartWorkConfirm(false);
    await performStatusTransition('IN_PROGRESS');
  };

  const handleDeleteJobCard = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await deleteJobCard(job.id);
      setShowDeleteConfirm(false);
      setTimeout(() => {
        onJobUpdated?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to delete job card'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStatus = getNextStatus();
  const isCompleted = job.status === 'COLLECTED';
  const isTechnician = userRole === 'TECHNICIAN';
  const showFullDetails = !isTechnician;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Job Card: ${job.job_reference}`}
      >
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Contact Name</div>
                <div className="text-sm font-semibold text-slate-100">{job.customer_name}</div>
                {showFullDetails && (
                  <div className="text-xs text-slate-400 mt-1">{job.company_name}</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Job Reference</div>
                <div className="text-sm font-semibold text-slate-100">{job.job_reference}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-slate-800 text-xs text-slate-400">
              <div>
                <div className="font-semibold text-slate-200">Created</div>
                <div>{new Date(job.created_at).toLocaleString()}</div>
              </div>
                <div className="flex items-center justify-start gap-2">
                <div className="font-semibold text-slate-200">Status</div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${getStatusBadgeClass(job.status)}`}>
                  {getStatusLabel(job.status)}
                </span>
              </div>
            </div>

            {showFullDetails && (
              <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-slate-800 text-xs text-slate-400">
                <div>
                  <div className="font-semibold text-slate-200">Phone</div>
                  <div>{job.phone_number || '—'}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Company</div>
                  <div>{job.company_name || '—'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons above progression */}
          {job.status === 'WAITING_FOR_COLLECTION' && (userRole === 'RECEPTIONIST' || userRole === 'ADMINISTRATOR') && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 mb-4">
              <div className="text-xs font-semibold uppercase text-slate-400 mb-3">Collection details</div>
              <label htmlFor="efd-receipt-num" className="block text-sm font-medium text-slate-300 mb-2">
                EFD Receipt Number
              </label>
              <input
                id="efd-receipt-num"
                type="text"
                value={efdReceiptNum}
                onChange={(e) => setEfdReceiptNum(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
                placeholder="Enter EFD receipt number"
              />
              <p className="text-xs text-slate-500 mt-2">This is required before confirming collection.</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              {userRole === 'ADMINISTRATOR' && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/20 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  Delete Job Card
                </button>
              )}

              {nextStatus && !isCompleted && (
                <button
                  onClick={handleStatusTransition}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : getActionLabel()}
                </button>
              )}
            </div>
          </div>

          {showFullDetails && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <JobTimeline currentStatus={job.status} createdAt={job.created_at} updatedAt={job.updated_at} />
            </div>
          )}

          {/* Description */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs font-semibold uppercase text-slate-400 mb-2">Description</div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap">{job.notes || 'No description provided.'}</div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showStartWorkConfirm}
        onClose={() => setShowStartWorkConfirm(false)}
        title="Confirm Start Work"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Start work on job <strong className="text-white">{job.job_reference}</strong>?
          </p>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowStartWorkConfirm(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmStartWork}
              className="glass-button text-sm"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Job Card Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Delete job card <strong className="text-white">{job.job_reference}</strong>? This cannot be undone.
          </p>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteJobCard}
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Job Card'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
