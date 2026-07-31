import { revalidatePath, revalidateTag } from 'next/cache';

// Note: Path-based revalidation continues to handle ISR pathological cases
// (renderer/edge caches that don't see tag invalidation), but tag-based
// invalidation is now the primary mechanism per ADVISORY-037 §Cache
// Invalidation Reality Audit (P1 — bd-y9v0). Tag calls reach any
// `unstable_cache` wrapper that declared the matching tag in its `tags`
// array, regardless of static `keyParts`.

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
  TENANT_LOOKUP: 'tenant-lookup',
} as const;

/**
 * Revalidate dashboard-related caches when data changes
 */
export function revalidateDashboard() {
  // Tag-based invalidation reaches every unstable_cache wrapper that
  // declared these tags (see `src/shared/api/data-fetching.ts`).
  revalidateTag(CACHE_TAGS.STATS);
  revalidateTag(CACHE_TAGS.MAINTENANCE);
  revalidateTag(CACHE_TAGS.BOOKINGS);
  revalidateTag(CACHE_TAGS.NOTIFICATIONS);
  // Path invalidation covers ISR'd routes that aren't tag-attached yet.
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
  revalidateTag(CACHE_TAGS.GROUPS);
  revalidateTag(CACHE_TAGS.USERS);
  revalidatePath('/directory');
  revalidatePath('/api/users');
  revalidatePath('/api/groups');
}

/**
 * Revalidate content-related caches
 */
export function revalidateContent() {
  revalidateTag(CACHE_TAGS.CONTENT);
  revalidatePath('/resources');
  revalidatePath('/conservation');
  revalidatePath('/api/content');
}

/**
 * Revalidate conversation caches
 */
export function revalidateConversations(userId?: string) {
  revalidateTag(CACHE_TAGS.CONVERSATIONS);
  revalidateTag(CACHE_TAGS.MESSAGES);
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
 * Status: integration point for tier/module/flag mutation routes that have
 * not yet landed. Wired by Phase 2 (`revalidateGate(tenantId)`) when those
 * routes ship. Until then, the helper still does meaningful work: tag-based
 * invalidation reaches any `unstable_cache` wrapper that declared
 * `CACHE_TAGS.SETTINGS` or `CACHE_TAGS.TENANT_LOOKUP` regardless of static
 * keyParts, and the broad path sweep covers ISR'd gated pages.
 *
 * `tenantId` is required (no-op if empty) — Phase 2 will use it to scope
 * per-tenant ISR paths once unstable_cache keys are tenant-partitioned
 * (planned in bd-cqs3 follow-up).
 *
 * @param tenantId - The tenant whose gate state changed. Required.
 */
export function revalidateGate(tenantId: string): void {
  if (!tenantId) return;
  // Tag invalidation reaches platform flags (settings tag) and tenant
  // resolution (tenant-lookup tag — added in bd-y9v0 P1.3).
  revalidateTag(CACHE_TAGS.SETTINGS);
  revalidateTag(CACHE_TAGS.TENANT_LOOKUP);
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
}

/**
 * Revalidate tenant record caches.
 * Wired into tenant admin mutation routes in bd-y9v0 P1.3 — the
 * `tenant-lookup` tag is set on `getTenantById/Slug/Domain` (base.ts:216-241)
 * but was never invalidated before this helper shipped. Until now, only the
 * 60s unstable_cache TTL protected tenant record freshness.
 *
 * @param tenantId - The tenant whose record changed (kept for forward-compat
 *                   once unstable_cache keys are tenant-partitioned).
 */
export function revalidateTenant(tenantId?: string): void {
  revalidateTag(CACHE_TAGS.TENANT_LOOKUP);
  // Suppress unused parameter warning — documented in Phase 2 plan.
  void tenantId;
}
