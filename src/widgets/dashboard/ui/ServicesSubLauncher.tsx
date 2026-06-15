'use client';

import {
  Wrench,
  Calendar,
  Building,
  Briefcase,
  CalendarDays,
  FileText,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  icon: LucideIcon;
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
    icon: Wrench,
    description: 'Submit and track maintenance requests',
  },
  {
    id: 'bookings',
    labelKey: 'domains.bookings',
    descriptionKey: 'domains.descriptions.bookings',
    icon: Calendar,
    description: 'Book community facilities and amenities',
  },
  {
    id: 'amenities',
    labelKey: 'domains.amenities',
    descriptionKey: 'domains.descriptions.amenities',
    icon: Building,
    description: 'Community amenities and shared spaces',
  },
  {
    id: 'my-services',
    labelKey: 'domains.myServices',
    descriptionKey: 'domains.descriptions.myServices',
    icon: Briefcase,
    description: 'Community services you offer',
  },
  {
    id: 'events',
    labelKey: 'domains.events',
    descriptionKey: 'domains.descriptions.events',
    icon: CalendarDays,
    description: 'Upcoming community events and activities',
  },
  {
    id: 'surveys',
    labelKey: 'domains.surveys',
    descriptionKey: 'domains.descriptions.surveys',
    icon: FileText,
    description: 'Community surveys and questionnaires',
  },
  {
    id: 'competitions',
    labelKey: 'domains.competitions',
    descriptionKey: 'domains.descriptions.competitions',
    icon: Trophy,
    description: 'Community competitions and contests',
  },
];
