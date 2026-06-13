import { hasPermission } from '@shared/lib';

/**
 * Checks if the role can manage events.
 */
export function canManageEvents(role: string): boolean {
  return hasPermission(role, 'events');
}
