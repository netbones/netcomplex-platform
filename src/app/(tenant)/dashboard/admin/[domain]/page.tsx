'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import { notFound } from 'next/navigation';
import { ADMIN_DOMAINS, getAdminDomainWidgets } from '@widgets/dashboard';
import { ADMIN_DOMAIN_DEFINITIONS } from '@widgets/dashboard';
import { WidgetRenderer } from '@widgets/dashboard';
import { ErrorBoundary, Breadcrumbs } from '@shared/ui';
import { UsersListSection } from '@widgets/admin';

interface AdminDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default function AdminDomainPage({ params }: AdminDomainPageProps) {
  const { tx } = useSafeTranslation(['common', 'admin']);
  const { domain } = use(params);

  // Validate domain
  if (!ADMIN_DOMAINS.includes(domain as (typeof ADMIN_DOMAINS)[number])) {
    notFound();
  }

  const domainDef = ADMIN_DOMAIN_DEFINITIONS.find(d => d.id === domain);
  const iconSrc = domainDef?.icon;
  const widgets = getAdminDomainWidgets(domain);

  // Compute domain label fallback (used by tx() multiple times)
  const domainLabelFallback = domainDef?.id
    ? domainDef.id.charAt(0).toUpperCase() + domainDef.id.slice(1)
    : domain;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: tx('nav.home', 'Home'), href: '/' },
            { label: tx('nav.dashboard', 'Dashboard'), href: '/dashboard' },
            { label: tx('nav.admin', 'Admin'), href: '/dashboard/admin' },
            {
              label: tx(domainDef?.labelKey ?? domain, domainLabelFallback, { ns: 'admin' }),
              href: `/dashboard/admin/${domain}`,
            },
          ]}
        />

        <div className="flex items-center justify-between mt-6 mb-6">
          <div className="flex items-center gap-3">
            {iconSrc && <img src={iconSrc} alt="" className="w-8 h-8" />}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {tx(domainDef?.labelKey ?? domain, domainLabelFallback, { ns: 'admin' })}
              </h1>
              <p className="text-sm text-gray-500">
                {domainDef
                  ? tx(domainDef.descriptionKey, domainDef?.description ?? '', { ns: 'admin' })
                  : ''}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/admin"
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
          >
            &larr; {tx('domains.back', 'Back to Admin', { ns: 'admin' })}
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

        {/* Users domain: render inline users table below widgets */}
        {domain === 'users' && <UsersListSection />}
      </div>
    </div>
  );
}
