'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSafeTranslation } from '@features/i18n/model/useTranslation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { notFound } from 'next/navigation';
import { SERVICES_DOMAINS, getServicesDomainWidgets } from '@widgets/dashboard/model/spaces';
import { SERVICES_DOMAIN_DEFINITIONS } from '@widgets/dashboard/ui/ServicesSubLauncher';
import { WidgetRenderer } from '@widgets/dashboard';
import { ErrorBoundary, Breadcrumbs } from '@shared/ui';
import { MaintenanceForm } from '@features/maintenance';

interface ServicesDomainPageProps {
  params: Promise<{ domain: string }>;
}

export default function ServicesDomainPage({ params }: ServicesDomainPageProps) {
  // Load both common + services namespaces so all t() calls resolve on the
  // first render (otherwise the services namespace lazy-loads after hydration
  // and the page flashes the raw key like "domains.maintenance").
  // isReady combines mounted + ready into a single flag from the hook.
  const { tx, isReady } = useSafeTranslation(['common', 'services']);
  const { domain } = use(params);
  const searchParams = useSearchParams();
  // Defer the action=new form render until i18n is mounted + ready to avoid
  // SSR/hydration mismatches from useSearchParams returning null on the server
  // and to ensure breadcrumbs above have rendered with stable text.
  const showNewForm = isReady && domain === 'maintenance' && searchParams.get('action') === 'new';

  // Validate domain
  if (!SERVICES_DOMAINS.includes(domain as (typeof SERVICES_DOMAINS)[number])) {
    notFound();
  }

  const domainDef = SERVICES_DOMAIN_DEFINITIONS.find(d => d.id === domain);
  const DomainIcon = domainDef?.icon;
  const widgets = getServicesDomainWidgets(domain);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: tx('nav.home', 'Home'), href: '/' },
            { label: tx('nav.dashboard', 'Dashboard'), href: '/dashboard' },
            {
              label: tx('spaces.services', 'Services'),
              href: '/dashboard/services',
            },
            {
              label: tx(
                domainDef?.labelKey ?? domain,
                domainDef?.id
                  ? domainDef.id.charAt(0).toUpperCase() + domainDef.id.slice(1)
                  : domain
              ),
              href: `/dashboard/services/${domain}`,
            },
          ]}
        />

        <div className="flex items-center justify-between mt-6 mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {DomainIcon && <DomainIcon className="w-8 h-8 text-indigo-600" />}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {tx(
                  domainDef?.labelKey ?? domain,
                  domainDef?.id
                    ? domainDef.id.charAt(0).toUpperCase() + domainDef.id.slice(1)
                    : domain
                )}
              </h1>
              <p className="text-sm text-gray-500">
                {domainDef ? tx(domainDef.descriptionKey, domainDef.description) : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {domain === 'maintenance' && !showNewForm && (
              <Link
                href="/dashboard/services/maintenance?action=new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-soralia-primary text-white text-sm rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" />
                {tx('maintenance:newRequest', 'New Request')}
              </Link>
            )}
            <Link
              href="/dashboard/services"
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
            >
              &larr; {tx('domains.back', 'Back to Services')}
            </Link>
          </div>
        </div>

        {/* New maintenance request form — shown when ?action=new is set on maintenance domain */}
        {showNewForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Submit Maintenance Request</h2>
              <Link
                href="/dashboard/services/maintenance"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ✕ Cancel
              </Link>
            </div>
            <ErrorBoundary>
              <MaintenanceForm
                onSubmit={async data => {
                  // Perform the actual POST to /api/maintenance, then reload the page
                  // to show the new request in the widget. A full reload is used so the
                  // client-side widget refetches and the form state is cleared.
                  const res = await fetch('/api/maintenance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                  });
                  if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    const message =
                      body?.message ?? body?.error ?? 'Failed to submit maintenance request';
                    toast.error(message);
                    throw new Error(message);
                  }
                  toast.success('Maintenance request submitted');
                  window.location.href = '/dashboard/services/maintenance';
                }}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Render service widgets for this domain */}
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
              {tx(
                domainDef?.labelKey ?? domain,
                domainDef?.id
                  ? domainDef.id.charAt(0).toUpperCase() + domainDef.id.slice(1)
                  : domain
              )}
            </h2>
            <p className="text-gray-500">
              {tx('domains.comingSoon', 'This section is coming soon.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
