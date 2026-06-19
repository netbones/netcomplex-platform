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
    id: 'bookings',
    labelKey: 'domains.bookings',
    descriptionKey: 'domains.descriptions.bookings',
    icon: '/platform/bookings.svg',
    description: 'Book community facilities and amenities',
  },
  {
    id: 'amenities',
    labelKey: 'domains.amenities',
    descriptionKey: 'domains.descriptions.amenities',
    icon: '/platform/amenities.svg',
    description: 'Community amenities and shared spaces',
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
];
