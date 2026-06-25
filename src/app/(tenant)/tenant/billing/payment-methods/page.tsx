'use client';

import { useQuery } from '@tanstack/react-query';
import { PaymentMethodForm } from '@features/billing';
import { LoadingSkeleton } from '@shared/ui';
import type { TenantPaymentView } from '@features/billing';

export default function PaymentMethodsPage() {
  const { data: payments, isLoading } = useQuery<TenantPaymentView[]>({
    queryKey: ['tenant-billing-payments'],
    queryFn: async () => {
      const response = await fetch('/api/tenant/billing/snapshot');
      if (!response.ok) {
        throw new Error('Failed to load payment information');
      }
      const body = await response.json();
      return body.data?.recentPayments ?? [];
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <LoadingSkeleton height="h-48" />
      </div>
    );
  }

  return <PaymentMethodForm payments={payments ?? []} />;
}
