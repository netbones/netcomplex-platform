'use client';

import { ProviderSection, ProviderStatusBadge, formatProviderDate } from './provider-ui';
import { useProviderDashboard } from './provider-queries';

export function ProviderListingsWidget() {
  const { data, isLoading, error } = useProviderDashboard();

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-gray-100" />;
  }

  if (error || !data) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Unable to load provider listings.</div>;
  }

  if (data.listings.length === 0) {
    return (
      <ProviderSection title="Active listings" description="Published listings currently visible to the community.">
        <p className="text-sm text-gray-500">No active published listings yet.</p>
      </ProviderSection>
    );
  }

  return (
    <ProviderSection title="Active listings" description="Your published listings and their marketplace quality signals.">
      <div className="space-y-3">
        {data.listings.map(listing => (
          <div key={listing.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{listing.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{listing.category} · {listing.status}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {listing.verified ? <ProviderStatusBadge status="VERIFIED" /> : <ProviderStatusBadge status={data.verificationStatus} />}
              </div>
            </div>
            <div className="mt-3 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
              <div>Rating: {listing.rating.toFixed(2)}</div>
              <div>Reviews: {listing.reviewCount}</div>
              <div>Updated: {formatProviderDate(listing.updatedAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </ProviderSection>
  );
}
