'use client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Service domain definition.
 * Each domain maps to a service sub-space rendered on /dashboard/services/[domain].
 */
export interface ServicesDomainDef {
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
 * Services space domain definitions.
 * These define the 5 service areas available to residents.
 * When adding a new service domain, update this constant.
 */
export const SERVICES_DOMAIN_DEFINITIONS: ServicesDomainDef[] = [
  {
    id: 'maintenance',
    labelKey: 'domains.maintenance',
    descriptionKey: 'domains.descriptions.maintenance',
    icon: '/platform/maintenance.svg',
    description: 'Submit and track maintenance requests',
  },
  {
    id: 'amenities',
    labelKey: 'domains.amenities',
    descriptionKey: 'domains.descriptions.amenities',
    icon: '/platform/amenities.svg',
    description: 'Book community facilities and amenities',
  },
  {
    id: 'security',
    labelKey: 'domains.security',
    descriptionKey: 'domains.descriptions.security',
    icon: '/platform/merits.svg',
    description: 'Panic button and community security contacts',
  },
  {
    id: 'my-services',
    labelKey: 'domains.myServices',
    descriptionKey: 'domains.descriptions.myServices',
    icon: '/platform/my-services.svg',
    description: 'Community services you offer or receive',
  },
  {
    id: 'events',
    labelKey: 'domains.events',
    descriptionKey: 'domains.descriptions.events',
    icon: '/platform/events.svg',
    description: 'Upcoming community events and activities',
  },
  {
    id: 'surveys',
    labelKey: 'domains.surveys',
    descriptionKey: 'domains.descriptions.surveys',
    icon: '/platform/surveys.svg',
    description: 'Community surveys and questionnaires',
  },
  {
    id: 'competitions',
    labelKey: 'domains.competitions',
    descriptionKey: 'domains.descriptions.competitions',
    icon: '/platform/competitions.svg',
    description: 'Community competitions and contests',
  },
  {
    id: 'communication',
    labelKey: 'domains.communication',
    descriptionKey: 'domains.descriptions.communication',
    icon: '/platform/communication.svg',
    description: 'Chat, announcements, and messaging',
  },
  {
    id: 'disputes',
    labelKey: 'domains.disputes',
    descriptionKey: 'domains.descriptions.disputes',
    icon: '/platform/disputes.svg',
    description: 'File and track community disputes',
  },
  {
    id: 'marketplace',
    labelKey: 'domains.marketplace',
    descriptionKey: 'domains.descriptions.marketplace',
    icon: '/platform/marketplace.svg',
    description: 'Browse and book community service providers',
  },
  {
    id: 'education',
    labelKey: 'domains.education',
    descriptionKey: 'domains.descriptions.education',
    icon: '/platform/education-red.svg',
    description: 'Bursaries, scholarships, and free learning resources',
  },
  {
    id: 'directory',
    labelKey: 'domains.directory',
    descriptionKey: 'domains.descriptions.directory',
    icon: '/platform/users.svg',
    description: 'Find and connect with neighbours',
  },
  {
    id: 'groups',
    labelKey: 'domains.groups',
    descriptionKey: 'domains.descriptions.groups',
    icon: '/platform/teams-nc.svg',
    description: 'Join community groups and committees',
  },
  {
    id: 'resources',
    labelKey: 'domains.resources',
    descriptionKey: 'domains.descriptions.resources',
    icon: '/platform/resources.svg',
    description: 'Community documents and guidelines',
  },
  {
    id: 'conservation',
    labelKey: 'domains.conservation',
    descriptionKey: 'domains.descriptions.conservation',
    icon: '/platform/conservation.svg',
    description: 'Sustainability and conservation initiatives',
  },
];
