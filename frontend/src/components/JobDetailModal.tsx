import React, { useState } from 'react';
import { Modal } from './Modal';
import { JobTimeline } from './JobTimeline';
import { updateJobCard, type JobCard } from '../lib/jobCards';
import type { Role } from '../lib/auth';
import { X, Loader2, AlertCircle, CheckCircle2, Phone } from 'lucide-react';

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
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleStatusTransition = async () => {
    const nextStatus = getNextStatus();
    if (!nextStatus) return;

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await updateJobCard(job.id, {
        status: nextStatus,
        notes: job.notes ?? '',
      });

      setSuccess(`Job moved to ${nextStatus.replace(/_/g, ' ')}`);
      setTimeout(() => {
        onJobUpdated?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Unable to update job status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStatus = getNextStatus();
  const isCompleted = job.status === 'COLLECTED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Job Card: ${job.job_reference}`}
    >
      <div className="space-y-6">
        {/* Contact Info */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Contact Name</div>
            <div className="text-sm font-semibold text-slate-100">{job.customer_name}</div>
            <div className="text-xs text-slate-400 mt-1">{job.company_name}</div>
          </div>

          <div className="flex gap-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{job.phone_number}</span>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Action buttons at top */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>

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

        {/* Timeline */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <JobTimeline
            currentStatus={job.status}
            createdAt={job.created_at}
            updatedAt={job.updated_at}
          />
        </div>

        {/* Notes */}
        {job.notes && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs font-semibold uppercase text-slate-400 mb-2">Notes</div>
            <div className="text-sm text-slate-300">{job.notes}</div>
          </div>
        )}
      </div>
    </Modal>
  );
};
