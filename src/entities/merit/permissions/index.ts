/**
 * Permission helpers for the merits system.
 * Maps to the existing hasPermission authorization framework.
 */

/**
 * Check if the current user/role can manage behavior records.
 * Admins, managers, and board members with 'users' permission can manage merits.
 */
export function canManageMerits(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'BOARD' || role === 'MANAGER';
}

/**
 * Check if the current user/role can resolve disputes.
 * Same as canManageMerits — admin-gated operation.
 */
export function canResolveDisputes(role: string | undefined): boolean {
  return canManageMerits(role);
}
