import { Suspense } from 'react';
import { getStaticStats } from '@/lib/data-fetching';
import { DashboardContent } from './DashboardContent';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

export default async function DashboardPage() {
  // Pre-fetch static stats on the server
  const staticStats = await getStaticStats();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded" />
                ))}
              </div>
              <div className="h-96 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent initialStats={staticStats} />
    </Suspense>
  );
}
