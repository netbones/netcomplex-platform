/**
 * Tab → Space Migration Map (Phase 30-B)
 *
 * Single shared constant for remapping old 6-tab keys to new 5-space keys.
 * Used by both default-layouts.ts and widget-store.ts to prevent inconsistency.
 *
 * Mapping rationale:
 * - overview → home (home space replaces overview tab)
 * - maintenance → services (merged per Q1 decision)
 * - bookings → services (bookings is a service)
 * - services → services (already correct key)
 * - content → community (content becomes community space)
 * - premium → community (premium community widgets merged into community)
 */
export const TAB_TO_SPACE_MAP: Record<string, string> = {
  overview: 'home',
  maintenance: 'services',
  bookings: 'services',
  services: 'services',
  content: 'community',
  premium: 'community',
} as const;
