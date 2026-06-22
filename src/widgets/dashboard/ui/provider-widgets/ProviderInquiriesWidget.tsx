'use client';

import { ProviderMetricCard, ProviderSection } from './provider-ui';
import { useProviderAnalytics, useProviderDashboard } from './provider-queries';

export function ProviderInquiriesWidget() {
  const dashboardQuery = useProviderDashboard();
  const analyticsQuery = useProviderAnalytics();

  if (dashboardQuery.isLoading || analyticsQuery.isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-gray-100" />;
  }

  if (dashboardQuery.error || analyticsQuery.error || !dashboardQuery.data || !analyticsQuery.data) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Unable to load provider inquiries.</div>;
  }

  const dashboard = dashboardQuery.data;
  const analytics = analyticsQuery.data;

  return (
    <ProviderSection
      title="Inquiry pipeline"
      description="How quickly new work is coming in from your own listings."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <ProviderMetricCard label="Total inquiries" value={dashboard.inquiryCount} />
        <ProviderMetricCard label="Pending response" value={analytics.inquiriesSummary.pending} />
        <ProviderMetricCard label="Responded" value={analytics.inquiriesSummary.responded} />
      </div>
    </ProviderSection>
  );
}
