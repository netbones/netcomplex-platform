'use client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Messages domain definition.
 * Each domain maps to a message sub-space rendered on /dashboard/communication/[domain].
 */
export interface MessagesDomainDef {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Messages space domain definitions.
 * These define the 3 communication areas available to all users.
 * When adding a new messages domain, update this constant.
 */
export const MESSAGES_DOMAIN_DEFINITIONS: MessagesDomainDef[] = [
  {
    id: 'conversations',
    labelKey: 'domains.conversations',
    descriptionKey: 'domains.descriptions.conversations',
    icon: '/platform/communication.svg',
    description: 'Direct and group conversations',
  },
  {
    id: 'announcements',
    labelKey: 'domains.announcements',
    descriptionKey: 'domains.descriptions.announcements',
    icon: '/platform/announcements.svg',
    description: 'Community announcements and broadcasts',
  },
  {
    id: 'notifications',
    labelKey: 'domains.notifications',
    descriptionKey: 'domains.descriptions.notifications',
    icon: '/platform/communication.svg',
    description: 'System notifications and alerts',
  },
];
