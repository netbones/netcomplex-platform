import { hasPermission } from '@shared/lib';

export function canManageEducation(role: string): boolean {
  return hasPermission(role, 'admin');
}

export function canCreateBursary(role: string): boolean {
  return canManageEducation(role);
}

export function canPublishBursary(role: string): boolean {
  return canManageEducation(role);
}

export function canManageBursaryFields(role: string): boolean {
  return canManageEducation(role);
}
