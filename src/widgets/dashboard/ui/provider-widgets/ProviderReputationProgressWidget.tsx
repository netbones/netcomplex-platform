'use client';

import { ProviderProgressBar, ProviderSection, formatProviderDate } from './provider-ui';
import { useProviderReputationScore } from './provider-queries';

export function ProviderReputationProgressWidget() {
  const { data, isLoading, error } = useProviderReputationScore();

  if (isLoading) {
    return <div className="h-36 animate-pulse rounded-xl bg-gray-100" />;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        Unable to load provider reputation progress.
      </div>
    );
  }

  return (
    <ProviderSection
      title="Verification progress"
      description="Reputation score progress toward verified provider status."
    >
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold text-gray-900">{data.reputationScore}</p>
            <p className="text-sm text-gray-500">
              of {data.progress.verificationThreshold} points needed
            </p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>{data.progress.progressPercentage}% complete</div>
            <div>Last calculated: {formatProviderDate(data.progress.lastCalculatedAt)}</div>
          </div>
        </div>
        <ProviderProgressBar value={data.progress.progressPercentage} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 text-sm text-gray-600">
          <div>Response time: {data.progress.responseTimeScore}</div>
          <div>Quality: {data.progress.qualityScore}</div>
          <div>Reviews: {data.progress.reviewScore}</div>
          <div>Compliance: {data.progress.complianceScore}</div>
          <div>Engagement: {data.progress.engagementScore}</div>
        </div>
      </div>
    </ProviderSection>
  );
}
