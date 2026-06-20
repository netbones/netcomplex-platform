import { revalidatePath } from 'next/cache';

// Note: Using revalidatePath for on-demand cache invalidation
// This immediately invalidates ISR caches for specific paths

/**
 * On-Demand Revalidation utilities for ISR pages
 * Invalidates cached content immediately when data changes
 */

// Cache tags for different types of content
export const CACHE_TAGS = {
  STATS: 'stats',
  MAINTENANCE: 'maintenance',
  BOOKINGS: 'bookings',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  CONTENT: 'content',
  GROUPS: 'groups',
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  SETTINGS: 'settings',
} as const;

/**
 * Revalidate dashboard-related caches when data changes
 */
export function revalidateDashboard() {
  // Revalidate by path for immediate cache invalidation
  revalidatePath('/dashboard');
  revalidatePath('/api/stats');
  revalidatePath('/api/maintenance');
  revalidatePath('/api/bookings');
  revalidatePath('/api/conversations');
  revalidatePath('/api/notifications');
}

/**
 * Revalidate directory-related caches
 */
export function revalidateDirectory() {
  revalidatePath('/directory');
  revalidatePath('/api/users');
  revalidatePath('/api/groups');
}

/**
 * Revalidate content-related caches
 */
export function revalidateContent() {
  revalidatePath('/resources');
  revalidatePath('/conservation');
  revalidatePath('/api/content');
}

/**
 * Revalidate conversation caches
 */
export function revalidateConversations(userId?: string) {
  revalidatePath('/messages');
  revalidatePath('/api/conversations');
  revalidatePath('/api/messages');
  if (userId) {
    revalidatePath(`/messages`);
  }
}

/**
 * Comprehensive revalidation for admin changes
 */
export function revalidateAdminChanges() {
  // Revalidate all dashboard data
  revalidateDashboard();

  // Revalidate directory data
  revalidateDirectory();

  // Revalidate content
  revalidateContent();

  // Revalidate admin-specific pages
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath('/admin/requests');
}

/**
 * Revalidate user-specific caches
 */
export function revalidateUserData(userId: string) {
  revalidatePath(`/resident/${userId}`);
  revalidatePath(`/member/${userId}`);
  revalidatePath('/directory');
}

/**
 * Revalidate gate-related caches when tier/module/flag changes.
 * Called after:
 * - Tenant tier change (upgrade/downgrade)
 * - Module install/uninstall (onboarding or settings)
 * - Page flag toggle (admin settings UI)
 *
 * Uses revalidatePath() for consistency with the rest of this file.
 * Phase 1 is additive — this is the integration point for future
 * tier/module/flag mutation routes.
 *
 * @param tenantId - The tenant whose gate state changed (currently unused;
 *                   included for forward-compat with per-tenant caching)
 */
export function revalidateGate(tenantId: string): void {
  // Invalidate flag endpoint (carries platform flags used by Layer 3)
  revalidatePath('/api/flags');

  // Invalidate all gated page paths
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  revalidatePath('/maintenance');
  revalidatePath('/bookings');
  revalidatePath('/events');
  revalidatePath('/surveys');
  revalidatePath('/competitions');
  revalidatePath('/directory');
  revalidatePath('/resources');
  revalidatePath('/chat');
  revalidatePath('/news');
  revalidatePath('/groups');
  revalidatePath('/services');
  revalidatePath('/messages');

  // Suppress unused parameter warning — used in Phase 2 for per-tenant targeting
  void tenantId;
}
