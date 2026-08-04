'use client';

import { useQuery } from '@tanstack/react-query';
import { InvoiceList } from '@features/billing';
import { LoadingSkeleton } from '@shared/ui';
import type { TenantInvoiceView } from '@features/billing';
import { apiGet } from '@/shared/api/http-client';

export default function InvoicesPage() {
  const {
    data: invoices,
    isLoading,
    isError,
  } = useQuery<TenantInvoiceView[]>({
    queryKey: ['tenant-billing-invoices'],
    queryFn: async () => {
      const { data } = await apiGet<TenantInvoiceView[]>('/api/tenant/billing/invoices');
      return data;
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <LoadingSkeleton height="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Unable to load invoices.</p>
        <p className="text-sm text-gray-400 mt-2">Please try again later.</p>
      </div>
    );
  }

  return <InvoiceList invoices={invoices ?? []} />;
}
