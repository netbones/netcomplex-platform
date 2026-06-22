'use client';

import Link from 'next/link';
import { ErrorBoundary } from '@shared/ui';
import {
  EmptyProviderState,
  ProviderAnalyticsWidget,
  ProviderCreditProgressWidget,
  ProviderInquiriesWidget,
  ProviderOverviewWidget,
  ProviderListingsWidget,
} from './provider-widgets';
import { useProviderDashboard } from './provider-widgets';

function ProvidersLayerInner() {
  const dashboardQuery = useProviderDashboard();

  if (dashboardQuery.isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-gray-100" />
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-56 rounded-2xl bg-gray-100" />
          <div className="h-56 rounded-2xl bg-gray-100" />
          <div className="h-56 rounded-2xl bg-gray-100" />
          <div className="h-56 rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (dashboardQuery.error?.status === 404) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <EmptyProviderState
          title="Complete your provider registration"
          body="Your account can access the provider dashboard, but there is no matching provider profile yet. Ask an administrator to finish linking your provider company record to this login email."
          ctaHref="/dashboard/services"
          ctaLabel="Back to services"
        />
      </div>
    );
  }

  if (dashboardQuery.error?.status === 403) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <EmptyProviderState
          title="Provider access required"
          body="This space is only available to linked service providers and board/admin users."
          ctaHref="/dashboard"
          ctaLabel="Return to dashboard"
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Providers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track provider verification, listing performance, inquiries, and your community credit
            progress.
          </p>
        </div>
        <Link
          href="/dashboard/providers/billing"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Open billing
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProviderOverviewWidget />
        <ProviderAnalyticsWidget />
        <ProviderListingsWidget />
        <ProviderCreditProgressWidget />
      </div>

      <ProviderInquiriesWidget />
    </div>
  );
}

export function ProvidersLayer() {
  return (
    <ErrorBoundary>
      <ProvidersLayerInner />
    </ErrorBoundary>
  );
}

export default ProvidersLayer;
