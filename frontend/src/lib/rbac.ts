import type { Role } from './auth';

export type AccessAction =
  | 'readCustomers'
  | 'createCustomers'
  | 'updateCustomers'
  | 'deleteCustomers'
  | 'readServices'
  | 'manageServices'
  | 'readJobCards'
  | 'createJobCards'
  | 'updateJobCards'
  | 'manageJobCardAssignments'
  | 'manageFinancials'
  | 'manageReceipts'
  | 'updateTechnicianNotes';

const rolePermissions: Record<Role, AccessAction[]> = {
  ADMINISTRATOR: [
    'readCustomers',
    'createCustomers',
    'updateCustomers',
    'deleteCustomers',
    'readServices',
    'manageServices',
    'readJobCards',
    'createJobCards',
    'updateJobCards',
    'manageJobCardAssignments',
    'manageFinancials',
    'manageReceipts',
    'updateTechnicianNotes',
  ],
  RECEPTIONIST: [
    'readCustomers',
    'createCustomers',
    'updateCustomers',
    'readServices',
    'readJobCards',
    'createJobCards',
    'updateJobCards',
    'manageFinancials',
    'manageReceipts',
  ],
  TECHNICIAN: [
    'readCustomers',
    'readServices',
    'readJobCards',
    'updateJobCards',
    'manageJobCardAssignments',
    'updateTechnicianNotes',
  ],
};

export const canAccess = (role: Role | null | undefined, action: AccessAction): boolean => {
  if (!role) return false;
  return rolePermissions[role].includes(action);
};

export const canCreateCustomers = (role: Role | null | undefined): boolean => canAccess(role, 'createCustomers');
export const canUpdateCustomers = (role: Role | null | undefined): boolean => canAccess(role, 'updateCustomers');
export const canDeleteCustomers = (role: Role | null | undefined): boolean => canAccess(role, 'deleteCustomers');
export const canReadServices = (role: Role | null | undefined): boolean => canAccess(role, 'readServices');
export const canManageServices = (role: Role | null | undefined): boolean => canAccess(role, 'manageServices');
export const canCreateJobCards = (role: Role | null | undefined): boolean => canAccess(role, 'createJobCards');
export const canManageFinancials = (role: Role | null | undefined): boolean => canAccess(role, 'manageFinancials');
export const canUpdateTechnicianNotes = (role: Role | null | undefined): boolean => canAccess(role, 'updateTechnicianNotes');
export const canManageJobCardAssignments = (role: Role | null | undefined): boolean => canAccess(role, 'manageJobCardAssignments');
export const canMarkJobCollected = (role: Role | null | undefined): boolean => canAccess(role, 'manageReceipts');
