'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import { notFound } from 'next/navigation';
import { MESSAGES_DOMAINS, getMessagesDomainWidgets } from '@widgets/dashboard';
import { MESSAGES_DOMAIN_DEFINITIONS } from '@widgets/dashboard';
import { WidgetRenderer } from '@widgets/dashboard';
import { DomainIconBadge } from '@widgets/dashboard';
import { ErrorBoundary, Breadcrumbs } from '@shared/ui';

interface MessagesDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default function MessagesDomainPage({ params }: MessagesDomainPageProps) {
  const { tx } = useSafeTranslation(['common', 'messages']);
  const { domain } = use(params);

  // Validate domain — redirects to existing announcements page if applicable
  if (!MESSAGES_DOMAINS.includes(domain as (typeof MESSAGES_DOMAINS)[number])) {
    notFound();
  }

  const domainDef = MESSAGES_DOMAIN_DEFINITIONS.find(d => d.id === domain);
  const widgets = getMessagesDomainWidgets(domain);

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
            {
              label: tx('spaces.messages', 'Messages'),
              href: '/dashboard/communication',
            },
            {
              label: tx(domainDef?.labelKey ?? domain, domainLabelFallback, { ns: 'messages' }),
              href: `/dashboard/communication/${domain}`,
            },
          ]}
        />

        <div className="flex items-center justify-between mt-6 mb-6">
          <div className="flex items-center gap-3">
            {domainDef && <DomainIconBadge id={domainDef.id} variant="messages" size="md" />}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {tx(domainDef?.labelKey ?? domain, domainLabelFallback, { ns: 'messages' })}
              </h1>
              <p className="text-sm text-gray-500">
                {domainDef
                  ? tx(domainDef.descriptionKey, domainDef?.description ?? '', { ns: 'messages' })
                  : ''}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/communication"
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
          >
            &larr; {tx('domains.back', 'Back to Messages', { ns: 'messages' })}
          </Link>
        </div>

        {/* Render message widgets for this domain */}
        <div className="space-y-6">
          {widgets.map(widgetId => (
            <ErrorBoundary key={widgetId}>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <WidgetRenderer widgetId={widgetId} />
              </div>
            </ErrorBoundary>
          ))}
        </div>

        {/* Coming soon for domains without widgets */}
        {widgets.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            {domainDef && (
              <div className="flex justify-center mb-4">
                <DomainIconBadge id={domainDef.id} variant="messages" size="xl" />
              </div>
            )}
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {tx(domainDef?.labelKey ?? domain, domainLabelFallback, { ns: 'messages' })}
            </h2>
            <p className="text-gray-500">
              {tx('domains.comingSoon', 'This section is coming soon.', { ns: 'messages' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
