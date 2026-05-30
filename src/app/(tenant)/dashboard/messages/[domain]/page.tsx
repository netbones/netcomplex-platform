'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { notFound } from 'next/navigation';
import { MESSAGES_DOMAINS, getMessagesDomainWidgets } from '@widgets/dashboard/model/spaces';
import { MESSAGES_DOMAIN_DEFINITIONS } from '@widgets/dashboard/ui/MessagesSubLauncher';
import { WidgetRenderer } from '@widgets/dashboard';
import { ErrorBoundary, Breadcrumbs } from '@shared/ui';

interface MessagesDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default function MessagesDomainPage({ params }: MessagesDomainPageProps) {
  const { t } = useTranslation('common');
  const { domain } = use(params);

  // Validate domain — redirects to existing announcements page if applicable
  if (!MESSAGES_DOMAINS.includes(domain as (typeof MESSAGES_DOMAINS)[number])) {
    notFound();
  }

  const domainDef = MESSAGES_DOMAIN_DEFINITIONS.find(d => d.id === domain);
  const DomainIcon = domainDef?.icon;
  const widgets = getMessagesDomainWidgets(domain);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('nav.dashboard'), href: '/dashboard' },
            {
              label: t('spaces.messages', { defaultValue: 'Messages' }),
              href: '/dashboard/messages',
            },
            {
              label: t(domainDef?.labelKey ?? domain, { ns: 'messages' }),
              href: `/dashboard/messages/${domain}`,
            },
          ]}
        />

        <div className="flex items-center justify-between mt-6 mb-6">
          <div className="flex items-center gap-3">
            {DomainIcon && <DomainIcon className="w-8 h-8 text-indigo-600" />}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t(domainDef?.labelKey ?? domain, { ns: 'messages' })}
              </h1>
              <p className="text-sm text-gray-500">
                {domainDef ? t(domainDef.descriptionKey, { ns: 'messages' }) : ''}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/messages"
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
          >
            &larr; {t('domains.back', { ns: 'messages', defaultValue: 'Back to Messages' })}
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
            {DomainIcon && <DomainIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />}
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {t(domainDef?.labelKey ?? domain, { ns: 'messages' })}
            </h2>
            <p className="text-gray-500">
              {t('domains.comingSoon', {
                ns: 'messages',
                defaultValue: 'This section is coming soon.',
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
