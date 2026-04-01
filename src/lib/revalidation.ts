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
