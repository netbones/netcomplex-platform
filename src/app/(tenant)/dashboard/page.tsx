'use client';

import { HomeLayer } from '@widgets/dashboard/ui/HomeLayer';
import { MyHomeSpaceWithErrorBoundary } from '@widgets/dashboard/ui/MyHomeSpace';

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      <HomeLayer />
      <MyHomeSpaceWithErrorBoundary />
    </div>
  );
}
