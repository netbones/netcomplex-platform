import { hasPermission } from '@entities/tenant/api/permissions';

/**
 * Checks if the role can manage events.
 */
export function canManageEvents(role: string): boolean {
  return hasPermission(role, 'events');
}
