'use client';

import { useQuery } from '@tanstack/react-query';
import { InvoiceList } from '@features/billing';
import { LoadingSkeleton } from '@shared/ui';
import type { TenantInvoiceView } from '@features/billing';

export default function InvoicesPage() {
  const {
    data: invoices,
    isLoading,
    isError,
  } = useQuery<TenantInvoiceView[]>({
    queryKey: ['tenant-billing-invoices'],
    queryFn: async () => {
      const response = await fetch('/api/tenant/billing/invoices');
      if (!response.ok) {
        throw new Error('Failed to load invoices');
      }
      const body = await response.json();
      return body.data ?? body;
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
