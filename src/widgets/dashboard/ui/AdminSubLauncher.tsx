'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Wrench,
  FileText,
  Calendar,
  Star,
  FolderOpen,
  BarChart2,
  Megaphone,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ADMIN_DOMAINS } from '../model/spaces';

/**
 * Admin management domain definition.
 * Each domain maps to admin widgets rendered on the /dashboard/admin/[domain] page.
 */
export interface AdminDomainDef {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
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
    icon: Users,
    description: 'Manage community members and roles',
  },
  {
    id: 'maintenance',
    labelKey: 'domains.maintenance',
    descriptionKey: 'domains.descriptions.maintenance',
    icon: Wrench,
    description: 'Maintenance request management and analytics',
  },
  {
    id: 'content',
    labelKey: 'domains.content',
    descriptionKey: 'domains.descriptions.content',
    icon: FileText,
    description: 'Content publishing and moderation',
  },
  {
    id: 'events',
    labelKey: 'domains.events',
    descriptionKey: 'domains.descriptions.events',
    icon: Calendar,
    description: 'Community event management',
  },
  {
    id: 'competitions',
    labelKey: 'domains.competitions',
    descriptionKey: 'domains.descriptions.competitions',
    icon: Star,
    description: 'Competition setup and results',
  },
  {
    id: 'resources',
    labelKey: 'domains.resources',
    descriptionKey: 'domains.descriptions.resources',
    icon: FolderOpen,
    description: 'Community resource management',
  },
  {
    id: 'surveys',
    labelKey: 'domains.surveys',
    descriptionKey: 'domains.descriptions.surveys',
    icon: BarChart2,
    description: 'Survey creation and results',
  },
  {
    id: 'announcements',
    labelKey: 'domains.announcements',
    descriptionKey: 'domains.descriptions.announcements',
    icon: Megaphone,
    description: 'Announcement creation and management',
  },
  {
    id: 'system',
    labelKey: 'domains.system',
    descriptionKey: 'domains.descriptions.system',
    icon: Settings,
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
export function AdminSubLauncher() {
  const { t } = useTranslation('admin');
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('domains.heading')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMIN_DOMAIN_DEFINITIONS.map(domain => {
          const DomainIcon = domain.icon;
          return (
            <Link
              key={domain.id}
              href={`/dashboard/admin/${domain.id}`}
              className="group flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
            >
              <div className="flex-shrink-0 p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition">
                <DomainIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                  {t(domain.labelKey)}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {t(domain.descriptionKey)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
