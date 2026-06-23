'use client';

import { ProviderMetricCard, ProviderSection } from './provider-ui';
import { useProviderAnalytics } from './provider-queries';

export function ProviderAnalyticsWidget() {
  const { data, isLoading, error } = useProviderAnalytics();

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-gray-100" />;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        Unable to load provider analytics.
      </div>
    );
  }

  return (
    <ProviderSection
      title="Provider analytics"
      description="Performance metrics for your own listings. Visibility expands as verification progresses."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ProviderMetricCard
          label="Listings"
          value={data.listingsCount}
          hint={`${data.activeListingsCount} active`}
        />
        <ProviderMetricCard
          label="Inquiries"
          value={data.inquiriesCount}
          hint={`${data.inquiriesSummary.pending} pending`}
        />
        <ProviderMetricCard
          label="Average rating"
          value={data.avgRating.toFixed(2)}
          hint={`${data.reviewSummary.reviewCount} reviews`}
        />
        <ProviderMetricCard
          label="Reputation score"
          value={data.reputationScore}
          hint={`${data.analyticsVisibility} visibility`}
        />
      </div>
      {data.dataNotes?.length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
          {data.dataNotes.map(note => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </ProviderSection>
  );
}
