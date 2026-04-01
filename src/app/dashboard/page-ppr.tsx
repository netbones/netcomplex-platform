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
          <Suspense
            fallback={
              <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-8 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              </div>
            }
          >
            <DashboardStats />
          </Suspense>
        </div>

        {/* Dynamic content streams in */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <DashboardWidgets />
        </Suspense>
      </div>
    </div>
  );
}
