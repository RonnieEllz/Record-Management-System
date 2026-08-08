export type JobCardStatus =
  | 'RECEIVED'
  | 'WAITING_FOR_INSPECTION'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_COLLECTION'
  | 'COLLECTED';

export const getStatusLabel = (status?: string | null) => {
  if (!status) return '';
  switch (status) {
    case 'RECEIVED':
      return 'Received';
    case 'WAITING_FOR_INSPECTION':
      return 'Waiting for Inspection';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'WAITING_FOR_COLLECTION':
      return 'Ready for Collection';
    case 'COLLECTED':
      return 'Collected';
    default:
      return String(status).replace(/_/g, ' ');
  }
};

export const getStatusBadgeClass = (status?: string | null) => {
  switch (status) {
    case 'RECEIVED':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
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

export const getNextActionLabel = (status?: string | null) => {
  switch (status) {
    case 'RECEIVED':
    case 'WAITING_FOR_INSPECTION':
      return 'Start Work';
    case 'IN_PROGRESS':
      return 'Mark Ready for Collection';
    case 'WAITING_FOR_COLLECTION':
      return 'Confirm Collection';
    default:
      return 'Update Status';
  }
};

export default {
  getStatusLabel,
  getStatusBadgeClass,
  getNextActionLabel,
};
