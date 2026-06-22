'use client';

import { ProviderMetricCard, ProviderSection, ProviderStatusBadge, ProviderStatusSummary, formatProviderDate } from './provider-ui';
import { useProviderDashboard } from './provider-queries';

export function ProviderOverviewWidget() {
  const { data, isLoading, error } = useProviderDashboard();

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-gray-100" />;
  }

  if (error || !data) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Unable to load provider profile.</div>;
  }

  return (
    <ProviderSection
      title="Provider overview"
      description="Company profile, verification state, and the trust signals that shape analytics access."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-gray-900">{data.companyName}</h3>
              <ProviderStatusBadge status={data.verificationStatus} />
            </div>
            <p className="mt-1 text-sm text-gray-500">{data.trade} · {data.isActive ? 'Active provider profile' : 'Inactive provider profile'}</p>
            <p className="mt-2 text-sm text-gray-600">Primary contact: {data.contactName || data.email || 'Not yet configured'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <div>Started: {formatProviderDate(data.verification.startDate)}</div>
            <div>Review date: {formatProviderDate(data.verification.endDate)}</div>
          </div>
        </div>

        <ProviderStatusSummary
          verification={data.verification}
          remainingToVerification={data.creditProgress.remainingToVerification}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <ProviderMetricCard label="Credit score" value={data.creditScore} hint="Community trust points" />
          <ProviderMetricCard label="Active listings" value={data.activeListingsCount} hint={`${data.listingCount} total listings`} />
          <ProviderMetricCard label="Pending inquiries" value={data.pendingInquiries} hint={`${data.inquiryCount} total inquiries`} />
        </div>
      </div>
    </ProviderSection>
  );
}
