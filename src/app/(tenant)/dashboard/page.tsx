'use client';

import { HomeLayer } from '@widgets/dashboard';
import { MyHomeSpaceWithErrorBoundary } from '@widgets/dashboard';

export default function DashboardHome() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <HomeLayer />
      <MyHomeSpaceWithErrorBoundary />
    </div>
  );
}
