'use client';

import { MyDisputesWidget } from '@/widgets/dashboard/ui/MyDisputesWidget';
import { Suspense } from 'react';
import { Breadcrumbs, ErrorBoundary, LoadingSkeleton } from '@shared/ui';
import { useSafeTranslation } from '@shared/lib';
import { Scale } from 'lucide-react';

export default function DisputesPage() {
  const { tx } = useSafeTranslation(['common', 'services']);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: tx('nav.home', 'Home'), href: '/' },
            { label: tx('nav.dashboard', 'Dashboard'), href: '/dashboard' },
            { label: tx('domains.disputes', 'Disputes') },
          ]}
        />

        <div className="flex items-center gap-3 mt-6 mb-6">
          <Scale className="w-8 h-8 text-soralia-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tx('domains.disputes', 'Disputes')}
            </h1>
            <p className="text-sm text-gray-500">
              {tx('domains.descriptions.disputes', 'File and track community disputes')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSkeleton className="h-96" />}>
              <MyDisputesWidget />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
