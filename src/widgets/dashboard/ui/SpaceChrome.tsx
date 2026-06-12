'use client';

/**
 * SpaceChrome — shared client component for the dashboard/admin chrome.
 *
 * Wraps every tenant page (under /dashboard/* or /admin/*) with the same
 * sidebar + main + mobile bar triple. Mounted by:
 *   - src/app/(tenant)/dashboard/layout.tsx (existing)
 *   - src/app/(tenant)/admin/layout.tsx     (new, plan 48-02)
 *
 * The `<main>` is intentionally a passthrough (flex-1 min-w-0 + safe-area
 * bottom padding) so each page owns its own width wrapper. Adding padding or
 * max-width here would duplicate chrome on every admin sub-page.
 *
 * State (collapsed sidebar, pathname, session, flags) lives in this component
 * so it persists across in-section navigations.
 *
 * Phase 48 — extracted from (tenant)/dashboard/layout.tsx verbatim.
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { authClient } from '@api/client';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';
import { ErrorBoundary } from '@shared/ui';
import { SpaceLauncher } from './SpaceLauncher';
import { MobileSpaceBar } from './MobileSpaceBar';
import { getActiveSpaceId, getVisibleSpaces } from '../model/spaces';

interface SpaceChromeProps {
  children: React.ReactNode;
}

export function SpaceChrome({ children }: SpaceChromeProps) {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { flags } = usePageFlags();

  const role = session?.user?.role || 'RESIDENT';
  const activeSpaceId = getActiveSpaceId(pathname);
  const visibleSpaces = flags ? getVisibleSpaces(role, flags) : [];

  // Navigation is handled by the Link href — callback is for future extensibility
  const handleNavigate = (_spaceId: string) => {};

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop sidebar — hidden on mobile */}
        <SpaceLauncher
          spaces={visibleSpaces}
          activeSpaceId={activeSpaceId}
          collapsed={collapsed}
          onNavigate={handleNavigate}
          onToggleCollapse={() => setCollapsed(prev => !prev)}
        />

        {/* Main content area — safe-area-aware bottom padding for mobile bottom bar */}
        <main
          className="flex-1 min-w-0 md:pb-0"
          style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom bar — hidden on desktop */}
      <MobileSpaceBar />
    </ErrorBoundary>
  );
}
