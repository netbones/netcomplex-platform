'use client';

import { DashboardPage } from '@pages/dashboard';
import { HomeLayer } from '@widgets/dashboard/ui/HomeLayer';

/**
 * Feature flag toggle: NEXT_PUBLIC_FOCUS_SPACES
 * - true → renders HomeLayer (new Focus Spaces home)
 * - false/unset → renders old DashboardPage with tabs (backward compat)
 */
const focusSpacesEnabled = process.env.NEXT_PUBLIC_FOCUS_SPACES === 'true';

export default function DashboardHome() {
  if (focusSpacesEnabled) {
    return <HomeLayer />;
  }

  return <DashboardPage />;
}
