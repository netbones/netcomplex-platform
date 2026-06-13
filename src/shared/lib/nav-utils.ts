import { getPermissions, type Permission } from '@/shared/lib';
import { PlatformPageFlags } from '@entities/tenant';
import { NavItem } from './navigation';

/**
 * Checks if a navigation item is visible based on flags and user permissions.
 */
export function isNavItemVisible(
  item: NavItem,
  flags: PlatformPageFlags | null,
  role: string | null | undefined
): boolean {
  // Public items are always visible (unless explicitly flagged)
  if (item.isPublic && !item.flag) return true;

  // Check flag gating (if applicable)
  if (item.flag && flags) {
    const flagValue = flags[item.flag];
    // Special handling for conservation tri-state flag
    if (item.id === 'conservation' && flagValue === 'external') return false;
    if (flagValue === false) return false;
  }

  // Check RBAC permission gating (if applicable)
  if (item.permission) {
    const permissions = getPermissions(role);
    if (!permissions[item.permission as keyof Permission]) return false;
  }

  return true;
}
