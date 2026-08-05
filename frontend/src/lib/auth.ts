export type Role = 'ADMINISTRATOR' | 'RECEPTIONIST' | 'TECHNICIAN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const normalizeRole = (role?: string): Role => {
  const normalized = role?.trim().toUpperCase();

  switch (normalized) {
    case 'ADMIN':
    case 'ADMINISTRATOR':
      return 'ADMINISTRATOR';
    case 'RECEPTION':
    case 'RECEPTIONIST':
      return 'RECEPTIONIST';
    case 'TECH':
    case 'TECHNICIAN':
    case 'ENGINEER':
    case 'ENGINEERING_TECHNICIAN':
      return 'TECHNICIAN';
    default:
      return 'RECEPTIONIST';
  }
};

export const resolveSessionUser = (sessionLike: any): User => {
  const metadata = sessionLike?.user?.user_metadata ?? {};
  const appMetadata = sessionLike?.user?.app_metadata ?? {};
  const roleSource = metadata?.role ?? metadata?.user_role ?? appMetadata?.role ?? appMetadata?.user_role ?? sessionLike?.user?.role;

  return {
    id: sessionLike?.user?.id ?? '',
    email: sessionLike?.user?.email ?? '',
    name: metadata?.full_name ?? metadata?.name ?? sessionLike?.user?.email ?? '',
    role: normalizeRole(roleSource),
  };
};
