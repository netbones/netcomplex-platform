/**
 * Priority Taxonomy — Enforced Definitions
 *
 * Priority levels map to communication modes, not just visual colour.
 * From docs/architecture/11-ANNOUNCEMENTS-PROBLEM-DEFINITION.md:
 *
 * | Priority | Label          | Meaning                                            | Examples                              |
 * |----------|----------------|----------------------------------------------------|---------------------------------------|
 * | urgent   | Legal / Urgent | Time-bound, legally consequential, requires attention | High Court notice, interdict, safety |
 * | high     | Governance     | Formal, action may be required, statutory period   | AGM notice, levy resolution, rule am. |
 * | normal   | Operational    | Informational, temporary, no action required       | Water outage, maintenance, gate close |
 * | low      | Community      | Social, contextual, awareness only                 | Pet reminder, noise request, lost item|
 */

export type AnnouncementPriority = 'urgent' | 'high' | 'normal' | 'low';

export const PRIORITY_TAXONOMY: Record<
  AnnouncementPriority,
  {
    label: string;
    meaning: string;
    examples: string;
    color: string; // Tailwind class for visual indicator
    borderColor: string; // Left-border accent class
  }
> = {
  urgent: {
    label: 'Legal / Urgent',
    meaning: 'Time-bound, legally consequential, requires immediate attention',
    examples: 'High Court notice, interdict, emergency safety issue',
    color: 'text-red-700 bg-red-100',
    borderColor: 'border-l-4 border-red-500',
  },
  high: {
    label: 'Governance',
    meaning: 'Formal, action may be required, statutory notice period applies',
    examples: 'AGM notice, levy resolution, rule amendment',
    color: 'text-amber-700 bg-amber-100',
    borderColor: 'border-l-4 border-amber-500',
  },
  normal: {
    label: 'Operational',
    meaning: 'Informational, temporary, no action required',
    examples: 'Water outage, maintenance access, gate closure',
    color: 'text-blue-700 bg-blue-100',
    borderColor: 'border-l-4 border-blue-500',
  },
  low: {
    label: 'Community',
    meaning: 'Social, contextual, awareness only',
    examples: 'Pet reminder, noise request, lost property',
    color: 'text-gray-700 bg-gray-100',
    borderColor: 'border-l-4 border-gray-300',
  },
};

/**
 * Maximum priority level each role may assign.
 * Only BOARD and ADMIN may publish urgent announcements.
 * COMMITTEE may publish high and below.
 * MANAGER may publish normal and below.
 * All other content-enabled roles may publish normal and below.
 */
export const MAX_PRIORITY_BY_ROLE: Record<string, AnnouncementPriority> = {
  ADMIN: 'urgent',
  BOARD: 'urgent',
  COMMITTEE: 'high',
  MANAGER: 'normal',
  // All other roles default to 'normal'
};

const PRIORITY_LEVELS: Record<AnnouncementPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

/**
 * Validate that a user with the given role may assign the requested priority.
 * Returns the validated priority (downgrades if role insufficient).
 */
export function validatePriorityForRole(
  requestedPriority: AnnouncementPriority,
  userRole: string
): AnnouncementPriority {
  const maxAllowed = MAX_PRIORITY_BY_ROLE[userRole] ?? 'normal';
  const maxLevel = PRIORITY_LEVELS[maxAllowed];
  const requestedLevel = PRIORITY_LEVELS[requestedPriority];

  if (requestedLevel > maxLevel) {
    // Downgrade to the maximum the user's role allows
    return maxAllowed;
  }
  return requestedPriority;
}

/**
 * Get the list of priorities a user with the given role may assign.
 * Used by the admin form to populate the priority dropdown.
 */
export function getAllowedPriorities(userRole: string): AnnouncementPriority[] {
  const maxAllowed = MAX_PRIORITY_BY_ROLE[userRole] ?? 'normal';
  const maxLevel = PRIORITY_LEVELS[maxAllowed];
  return (Object.entries(PRIORITY_LEVELS) as [AnnouncementPriority, number][])
    .filter(([_, level]) => level <= maxLevel)
    .map(([key]) => key);
}
