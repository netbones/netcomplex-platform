'use client';

import { useQuery } from '@tanstack/react-query';
import { PaymentMethodForm } from '@features/billing';
import { LoadingSkeleton } from '@shared/ui';
import type { TenantPaymentView } from '@features/billing';
import { apiGet } from '@/shared/api/http-client';

export default function PaymentMethodsPage() {
  const { data: payments, isLoading } = useQuery<TenantPaymentView[]>({
    queryKey: ['tenant-billing-payments'],
    queryFn: async () => {
      const { data } = await apiGet<{ recentPayments?: TenantPaymentView[] }>(
        '/api/tenant/billing/snapshot'
      );
      return data?.recentPayments ?? [];
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
