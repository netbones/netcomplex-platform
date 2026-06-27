'use client';

import { Breadcrumbs, ErrorBoundary, PageLayout } from '@shared/ui';
import { usePageLoading } from '@shared/ui';
import { DisputeListTable } from '@entities/dispute';
import Link from 'next/link';

const BREADCRUMBS: Array<{ label: string; href: string }> = [
  { label: 'Admin', href: '/admin' },
  { label: 'Disputes', href: '/admin/disputes' },
];

export default function AdminDisputesPage() {
  const { isReady, LoadingComponent } = usePageLoading(BREADCRUMBS, {
    title: 'Disputes',
    contentHeight: 'h-96',
  });

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <PageLayout background="white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <Breadcrumbs items={BREADCRUMBS} />
            <Link
              href="/disputes/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-soralia-primary text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
              aria-label="File a new dispute"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              File a Dispute
            </Link>
          </div>

          <DisputeListTable />
        </div>
      </PageLayout>
    </ErrorBoundary>
  );
}
