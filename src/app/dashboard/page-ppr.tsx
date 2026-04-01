import { Suspense } from 'react';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardWidgets } from '@/components/dashboard/DashboardWidgets';

// Enable PPR (Partial Prerendering) - static shell renders immediately
export const experimental_ppr = true;

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-indigo-600 mb-2">Welcome back!</h1>
        <p className="text-gray-600 mb-8">Here's what's happening in Soralia Village</p>

        {/* Static shell - renders immediately */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Suspense fallback={<DashboardSkeleton.StatCard />}>
            <DashboardStats />
          </Suspense>
        </div>

        {/* Dynamic content streams in */}
        <Suspense fallback={<DashboardSkeleton.WidgetGrid />}>
          <DashboardWidgets />
        </Suspense>
      </div>
    </div>
  );
}
