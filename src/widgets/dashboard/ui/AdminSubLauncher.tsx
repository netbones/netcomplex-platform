'use client';

import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
/**
 * Admin management domain definition.
 * Each domain maps to admin widgets rendered on the /dashboard/admin/[domain] page.
 */
export interface AdminDomainDef {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  description: string;
}

/**
 * Admin management domains.
 * These mirror the Admin Dashboard tab inventory defined in
 * docs/architecture/NAVIGATION_GOVERNANCE.md.
 * When adding a new admin domain, update both this constant AND the governance doc.
 */
export const ADMIN_DOMAIN_DEFINITIONS: AdminDomainDef[] = [
  {
    id: 'users',
    labelKey: 'domains.users',
    descriptionKey: 'domains.descriptions.users',
    icon: '/platform/users.svg',
    description: 'Manage community members and roles',
  },
  {
    id: 'maintenance',
    labelKey: 'domains.maintenance',
    descriptionKey: 'domains.descriptions.maintenance',
    icon: '/platform/maintenance.svg',
    description: 'Maintenance request management and analytics',
  },
  {
    id: 'content',
    labelKey: 'domains.content',
    descriptionKey: 'domains.descriptions.content',
    icon: '/platform/content.svg',
    description: 'Content publishing and moderation',
  },
  {
    id: 'events',
    labelKey: 'domains.events',
    descriptionKey: 'domains.descriptions.events',
    icon: '/platform/events.svg',
    description: 'Community event management',
  },
  {
    id: 'competitions',
    labelKey: 'domains.competitions',
    descriptionKey: 'domains.descriptions.competitions',
    icon: '/platform/competitions.svg',
    description: 'Competition setup and results',
  },
  {
    id: 'resources',
    labelKey: 'domains.resources',
    descriptionKey: 'domains.descriptions.resources',
    icon: '/platform/resources.svg',
    description: 'Community resource management',
  },
  {
    id: 'surveys',
    labelKey: 'domains.surveys',
    descriptionKey: 'domains.descriptions.surveys',
    icon: '/platform/surveys.svg',
    description: 'Survey creation and results',
  },
  {
    id: 'announcements',
    labelKey: 'domains.announcements',
    descriptionKey: 'domains.descriptions.announcements',
    icon: '/platform/announcements.svg',
    description: 'Announcement creation and management',
  },
  {
    id: 'merits',
    labelKey: 'domains.merits',
    descriptionKey: 'domains.descriptions.merits',
    icon: '/platform/merits.svg',
    description: 'Community merit management and disputes',
  },
  {
    id: 'services',
    labelKey: 'domains.services',
    descriptionKey: 'domains.descriptions.services',
    icon: '/platform/system.svg',
    description: 'Configure the public services page',
  },
  {
    id: 'system',
    labelKey: 'domains.system',
    descriptionKey: 'domains.descriptions.system',
    icon: '/platform/system.svg',
    description: 'Platform configuration and health',
  },
];

/**
 * AdminSubLauncher — icon-grid sub-launcher for admin management domains.
 *
 * Renders as a 3-column responsive grid of management domain cards.
 * Each card shows an icon + label + description and links to
 * /dashboard/admin/[domain].
 *
 * This is rendered BELOW the admin overview widgets (stats, activity, quick-links)
 * on the admin space page.
 */
const DOMAIN_FALLBACKS: Record<string, string> = {
  'domains.heading': 'Management Domains',
  'domains.users': 'Users',
  'domains.maintenance': 'Maintenance',
  'domains.content': 'Content',
  'domains.events': 'Events',
  'domains.competitions': 'Competitions',
  'domains.resources': 'Resources',
  'domains.surveys': 'Surveys',
  'domains.announcements': 'Announcements',
  'domains.merits': 'Merits',
  'domains.system': 'System',
  'domains.services': 'Services',
  'domains.descriptions.users': 'Manage community members and roles',
  'domains.descriptions.maintenance': 'Maintenance request management and analytics',
  'domains.descriptions.content': 'Content publishing and moderation',
  'domains.descriptions.events': 'Community event management',
  'domains.descriptions.competitions': 'Competition setup and results',
  'domains.descriptions.resources': 'Community resource management',
  'domains.descriptions.surveys': 'Survey creation and results',
  'domains.descriptions.announcements': 'Announcement creation and management',
  'domains.descriptions.merits': 'Community merit management and disputes',
  'domains.descriptions.system': 'Platform configuration and health',
  'domains.descriptions.services': 'Configure the public services page',
};

export function AdminSubLauncher() {
  const { tx } = useSafeTranslation('admin');

  const handleUsersClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const toggle = document.getElementById('users-section-toggle');
    if (toggle) {
      toggle.scrollIntoView({ behavior: 'smooth' });
      toggle.click();
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {tx('domains.heading', 'Management Domains')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMIN_DOMAIN_DEFINITIONS.map(domain => {
          if (domain.id === 'users') {
            return (
              <button
                key={domain.id}
                onClick={handleUsersClick}
                className="group flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100 text-left w-full"
                type="button"
              >
                <div className="flex-shrink-0 w-10 h-10">
                  <img src={domain.icon} alt="" className="w-full h-full" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                    {tx(domain.labelKey, DOMAIN_FALLBACKS[domain.labelKey] || domain.labelKey)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {tx(
                      domain.descriptionKey,
                      DOMAIN_FALLBACKS[domain.descriptionKey] || domain.descriptionKey
                    )}
                  </p>
                </div>
              </button>
            );
          }
          return (
            <Link
              key={domain.id}
              href={`/admin/${domain.id}`}
              className="group flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
            >
              <div className="flex-shrink-0 w-10 h-10">
                <img src={domain.icon} alt="" className="w-full h-full" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                  {tx(domain.labelKey, DOMAIN_FALLBACKS[domain.labelKey] || domain.labelKey)}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {tx(
                    domain.descriptionKey,
                    DOMAIN_FALLBACKS[domain.descriptionKey] || domain.descriptionKey
                  )}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
