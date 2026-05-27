'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { notFound } from 'next/navigation';
import { ADMIN_DOMAINS, getAdminDomainWidgets } from '@widgets/dashboard/model/spaces';
import { ADMIN_DOMAIN_DEFINITIONS } from '@widgets/dashboard/ui/AdminSubLauncher';
import { WidgetRenderer } from '@widgets/dashboard';
import { ErrorBoundary, Breadcrumbs } from '@shared/ui';

interface AdminDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default function AdminDomainPage({ params }: AdminDomainPageProps) {
  const { t } = useTranslation(['admin', 'common']);
  const { domain } = use(params);

  // Validate domain
  if (!ADMIN_DOMAINS.includes(domain as (typeof ADMIN_DOMAINS)[number])) {
    notFound();
  }

  const domainDef = ADMIN_DOMAIN_DEFINITIONS.find(d => d.id === domain);
  const DomainIcon = domainDef?.icon;
  const widgets = getAdminDomainWidgets(domain);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('nav.dashboard'), href: '/dashboard' },
            { label: t('nav.admin'), href: '/dashboard/admin' },
            { label: t(domainDef?.labelKey ?? domain), href: `/dashboard/admin/${domain}` },
          ]}
        />

        <div className="flex items-center justify-between mt-6 mb-6">
          <div className="flex items-center gap-3">
            {DomainIcon && <DomainIcon className="w-8 h-8 text-indigo-600" />}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t(domainDef?.labelKey ?? domain)}
              </h1>
              <p className="text-sm text-gray-500">{domainDef?.description}</p>
            </div>
          </div>
          <Link
            href="/dashboard/admin"
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
          >
            &larr; {t('domains.back')}
          </Link>
        </div>

        {/* Render admin widgets for this domain */}
        <div className="space-y-6">
          {widgets.map(widgetId => (
            <ErrorBoundary key={widgetId}>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <WidgetRenderer widgetId={widgetId} />
              </div>
            </ErrorBoundary>
          ))}
        </div>
      </div>
    </div>
  );
}
