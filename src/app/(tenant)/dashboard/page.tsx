'use client';

import { DashboardPage } from '@pages/dashboard';
import { HomeLayer } from '@widgets/dashboard/ui/HomeLayer';
import { MyHomeSpaceWithErrorBoundary } from '@widgets/dashboard/ui/MyHomeSpace';

/**
 * Feature flag toggle: NEXT_PUBLIC_FOCUS_SPACES
 * - true → renders HomeLayer + MyHomeSpace (new Focus Spaces home)
 * - false/unset → renders old DashboardPage with tabs (backward compat)
 */
const focusSpacesEnabled = process.env.NEXT_PUBLIC_FOCUS_SPACES === 'true';

export default function DashboardHome() {
  if (focusSpacesEnabled) {
    return (
      <div className="space-y-8">
        <HomeLayer />
        <MyHomeSpaceWithErrorBoundary />
      </div>
    );
  }

  return <DashboardPage />;
}
