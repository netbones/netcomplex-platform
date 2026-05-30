'use client';

import { MessageSquare, Megaphone, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Messages domain definition.
 * Each domain maps to a message sub-space rendered on /dashboard/messages/[domain].
 */
export interface MessagesDomainDef {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
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
    labelKey: 'messages.domains.conversations',
    descriptionKey: 'messages.domains.descriptions.conversations',
    icon: MessageSquare,
    description: 'Direct and group conversations',
  },
  {
    id: 'announcements',
    labelKey: 'messages.domains.announcements',
    descriptionKey: 'messages.domains.descriptions.announcements',
    icon: Megaphone,
    description: 'Community announcements and broadcasts',
  },
  {
    id: 'notifications',
    labelKey: 'messages.domains.notifications',
    descriptionKey: 'messages.domains.descriptions.notifications',
    icon: Bell,
    description: 'System notifications and alerts',
  },
];
