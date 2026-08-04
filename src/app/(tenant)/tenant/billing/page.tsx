'use client';

import { useQuery } from '@tanstack/react-query';
import { BillingOverview, PlanSelector } from '@features/billing';
import { LoadingSkeleton } from '@shared/ui';
import type { TenantBillingSnapshot } from '@features/billing';
import { apiGet } from '@/shared/api/http-client';

export default function BillingPage() {
  const {
    data: snapshot,
    isLoading,
    isError,
  } = useQuery<TenantBillingSnapshot>({
    queryKey: ['tenant-billing-snapshot'],
    queryFn: async () => {
      const { data } = await apiGet<TenantBillingSnapshot>('/api/tenant/billing/snapshot');
      return data;
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton height="h-48" className="max-w-2xl" />
        <LoadingSkeleton height="h-64" className="max-w-5xl" />
      </div>
    );
  }

  if (isError || !snapshot) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Unable to load billing information.</p>
        <p className="text-sm text-gray-400 mt-2">Please try again later or contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BillingOverview snapshot={snapshot} />
      <PlanSelector
        plans={snapshot.availablePlans}
        currentPlanId={snapshot.currentSubscription?.planId}
      />
    </div>
  );
}
