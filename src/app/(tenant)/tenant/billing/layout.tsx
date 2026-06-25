import type { ReactNode } from 'react';
import Link from 'next/link';

export default function BillingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Billing</h1>

      <nav className="flex gap-4 mb-8 border-b border-gray-200 pb-3">
        <Link
          href="/tenant/billing"
          className="text-sm font-medium text-gray-600 hover:text-[#4F46E5] transition-colors"
        >
          Overview
        </Link>
        <Link
          href="/tenant/billing/invoices"
          className="text-sm font-medium text-gray-600 hover:text-[#4F46E5] transition-colors"
        >
          Invoices
        </Link>
        <Link
          href="/tenant/billing/payment-methods"
          className="text-sm font-medium text-gray-600 hover:text-[#4F46E5] transition-colors"
        >
          Payment Methods
        </Link>
      </nav>

      {children}
    </div>
  );
}
