import { hasPermission } from '@shared/lib';

export function canViewAllRequests(role: string | null | undefined): boolean {
  return hasPermission(role, 'requests');
}

export function canAssignRequests(role: string | null | undefined): boolean {
  return hasPermission(role, 'requests') || hasPermission(role, 'admin');
}

export function canResolveRequests(role: string | null | undefined): boolean {
  return hasPermission(role, 'requests') || hasPermission(role, 'admin');
}

export function canDeleteRequests(role: string | null | undefined): boolean {
  return hasPermission(role, 'admin');
}
