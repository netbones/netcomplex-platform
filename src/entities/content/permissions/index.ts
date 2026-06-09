import { hasPermission } from '@shared/lib';

/**
 * Checks if the role can manage content (all content).
 */
export function canManageContent(role: string): boolean {
  return hasPermission(role, 'content');
}

/**
 * Checks if the role can manage their own content.
 */
export function canManageOwnContent(role: string): boolean {
  return hasPermission(role, 'contentOwn');
}
