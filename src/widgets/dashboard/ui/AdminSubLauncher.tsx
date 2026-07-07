'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSafeTranslation } from '@shared/lib';

export type AdminDomainCategory = 'community' | 'operations' | 'financial' | 'system';

export interface AdminDomainCategoryMeta {
  id: AdminDomainCategory;
  labelKey: string;
  description: string;
}

export interface AdminDomainDef {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  description: string;
  category: AdminDomainCategory;
}

export const ADMIN_DOMAIN_CATEGORIES: AdminDomainCategoryMeta[] = [
  {
    id: 'community',
    labelKey: 'domains.categories.community',
    description: 'Community Engagement & Growth',
  },
  {
    id: 'operations',
    labelKey: 'domains.categories.operations',
    description: 'Operational & Facility Management',
  },
  {
    id: 'financial',
    labelKey: 'domains.categories.financial',
    description: 'Financial & Ecosystem Infrastructure',
  },
  {
    id: 'system',
    labelKey: 'domains.categories.system',
    description: 'System Administration',
  },
];

export const ADMIN_DOMAIN_DEFINITIONS: AdminDomainDef[] = [
  {
    id: 'users',
    labelKey: 'domains.users',
    descriptionKey: 'domains.descriptions.users',
    icon: '/platform/users.svg',
    description: 'Manage community members and roles',
    category: 'community',
  },
  {
    id: 'events',
    labelKey: 'domains.events',
    descriptionKey: 'domains.descriptions.events',
    icon: '/platform/events.svg',
    description: 'Community event management',
    category: 'community',
  },
  {
    id: 'competitions',
    labelKey: 'domains.competitions',
    descriptionKey: 'domains.descriptions.competitions',
    icon: '/platform/competitions.svg',
    description: 'Competition setup and results',
    category: 'community',
  },
  {
    id: 'announcements',
    labelKey: 'domains.announcements',
    descriptionKey: 'domains.descriptions.announcements',
    icon: '/platform/announcements.svg',
    description: 'Announcement creation and management',
    category: 'community',
  },
  {
    id: 'surveys',
    labelKey: 'domains.surveys',
    descriptionKey: 'domains.descriptions.surveys',
    icon: '/platform/surveys.svg',
    description: 'Survey creation and results',
    category: 'community',
  },
  {
    id: 'merits',
    labelKey: 'domains.merits',
    descriptionKey: 'domains.descriptions.merits',
    icon: '/platform/merits.svg',
    description: 'Community merit management and disputes',
    category: 'community',
  },
  {
    id: 'achievements',
    labelKey: 'domains.achievements',
    descriptionKey: 'domains.descriptions.achievements',
    icon: '/platform/achievements.svg',
    description: 'Achievement configuration and catalog',
    category: 'community',
  },
  {
    id: 'disputes',
    labelKey: 'domains.disputes',
    descriptionKey: 'domains.descriptions.disputes',
    icon: '/platform/communication.svg',
    description: 'Dispute moderation and resolution',
    category: 'community',
  },
  {
    id: 'maintenance',
    labelKey: 'domains.maintenance',
    descriptionKey: 'domains.descriptions.maintenance',
    icon: '/platform/maintenance.svg',
    description: 'Maintenance request management and analytics',
    category: 'operations',
  },
  {
    id: 'teams',
    labelKey: 'domains.teams',
    descriptionKey: 'domains.descriptions.teams',
    icon: '/platform/users.svg',
    description: 'Manage in-house maintenance teams',
    category: 'operations',
  },
  {
    id: 'bookings',
    labelKey: 'domains.bookings',
    descriptionKey: 'domains.descriptions.adminBookings',
    icon: '/platform/bookings.svg',
    description: 'Manage bookable facilities and settings',
    category: 'operations',
  },
  {
    id: 'services',
    labelKey: 'domains.services',
    descriptionKey: 'domains.descriptions.services',
    icon: '/platform/services.svg',
    description: 'Configure the public services page',
    category: 'operations',
  },
  {
    id: 'resources',
    labelKey: 'domains.resources',
    descriptionKey: 'domains.descriptions.resources',
    icon: '/platform/resources.svg',
    description: 'Community resource management',
    category: 'operations',
  },
  {
    id: 'dwallet',
    labelKey: 'domains.dwallet',
    descriptionKey: 'domains.descriptions.dwallet',
    icon: '/platform/wallet-blue.svg',
    description: 'Community value distribution and payout management',
    category: 'financial',
  },
  {
    id: 'providers',
    labelKey: 'domains.providers',
    descriptionKey: 'domains.descriptions.providers',
    icon: '/platform/providers.svg',
    description: 'Provider management, revenue, and moderation',
    category: 'financial',
  },
  {
    id: 'content',
    labelKey: 'domains.content',
    descriptionKey: 'domains.descriptions.content',
    icon: '/platform/content.svg',
    description: 'Content publishing and moderation',
    category: 'financial',
  },
  {
    id: 'education',
    labelKey: 'domains.education',
    descriptionKey: 'domains.descriptions.education',
    icon: '/platform/education-red.svg',
    description: 'Manage education portal content',
    category: 'financial',
  },
  {
    id: 'system',
    labelKey: 'domains.system',
    descriptionKey: 'domains.descriptions.system',
    icon: '/platform/system.svg',
    description: 'Platform configuration and health',
    category: 'system',
  },
];

export function groupDomainsByCategory(
  domains: AdminDomainDef[]
): Record<AdminDomainCategory, AdminDomainDef[]> {
  const grouped: Record<AdminDomainCategory, AdminDomainDef[]> = {
    community: [],
    operations: [],
    financial: [],
    system: [],
  };
  for (const domain of domains) {
    grouped[domain.category].push(domain);
  }
  return grouped;
}

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
  'domains.achievements': 'Achievements',
  'domains.disputes': 'Disputes',
  'domains.providers': 'Providers',
  'domains.dwallet': 'dWallet',
  'domains.system': 'System',
  'domains.services': 'Services',
  'domains.education': 'Education Portal',
  'domains.teams': 'Teams',
  'domains.bookings': 'Bookings',
  'domains.descriptions.users': 'Manage community members and roles',
  'domains.descriptions.maintenance': 'Maintenance request management and analytics',
  'domains.descriptions.content': 'Content publishing and moderation',
  'domains.descriptions.events': 'Community event management',
  'domains.descriptions.competitions': 'Competition setup and results',
  'domains.descriptions.resources': 'Community resource management',
  'domains.descriptions.surveys': 'Survey creation and results',
  'domains.descriptions.announcements': 'Announcement creation and management',
  'domains.descriptions.merits': 'Community merit management and disputes',
  'domains.descriptions.achievements': 'Achievement configuration and catalog',
  'domains.descriptions.disputes': 'Dispute moderation and resolution',
  'domains.descriptions.dwallet': 'Community value distribution and payout management',
  'domains.descriptions.system': 'Platform configuration and health',
  'domains.descriptions.services': 'Configure the public services page',
  'domains.descriptions.adminBookings': 'Manage bookable facilities and settings',
  'domains.descriptions.education': 'Manage education portal content',
  'domains.descriptions.teams': 'Manage in-house maintenance teams',
  'domains.descriptions.providers': 'Provider management, revenue, and moderation',
  'domains.categories.community': 'Community Engagement & Growth',
  'domains.categories.operations': 'Operational & Facility Management',
  'domains.categories.financial': 'Financial & Ecosystem Infrastructure',
  'domains.categories.system': 'System Administration',
};

export function AdminSubLauncher() {
  const { tx } = useSafeTranslation('admin');
  const grouped = groupDomainsByCategory(ADMIN_DOMAIN_DEFINITIONS);

  const handleUsersClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const toggle = document.getElementById('users-section-toggle');
    if (toggle) {
      toggle.scrollIntoView({ behavior: 'smooth' });
      toggle.click();
    }
  };

  return (
    <div className="mt-8 space-y-8">
      {ADMIN_DOMAIN_CATEGORIES.map(cat => {
        const domains = grouped[cat.id];
        if (domains.length === 0) return null;
        return (
          <section key={cat.id}>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              {tx(cat.labelKey, DOMAIN_FALLBACKS[cat.labelKey] || cat.description)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {domains.map(domain => {
                if (domain.id === 'users') {
                  return (
                    <button
                      key={domain.id}
                      onClick={handleUsersClick}
                      className="group flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100 text-left w-full"
                      type="button"
                    >
                      <div className="flex-shrink-0 w-10 h-10 relative">
                        <Image src={domain.icon} alt="" fill className="w-full h-full" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                          {tx(
                            domain.labelKey,
                            DOMAIN_FALLBACKS[domain.labelKey] || domain.labelKey
                          )}
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
                    <div className="flex-shrink-0 w-10 h-10 relative">
                      <Image src={domain.icon} alt="" fill className="w-full h-full" />
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
          </section>
        );
      })}
    </div>
  );
}
