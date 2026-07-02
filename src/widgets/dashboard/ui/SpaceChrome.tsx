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
 * State (collapsed sidebar, pathname, flags) lives in this component
 * so it persists across in-section navigations.
 *
 * Phase 110 — wired to usePageAccess() / useVisibleSpaces() instead of
 * inline role checks.
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useGateContext } from '@features/gate';
import { ErrorBoundary } from '@shared/ui';
import { useVisibleSpaces } from '@shared/lib/hooks';
import { SpaceLauncher } from './SpaceLauncher';
import { MobileSpaceBar } from './MobileSpaceBar';
import { EmptyWorkspaceState } from '@widgets/workspace';
import { WorkspaceScopePanel } from '@widgets/workspace';
import { getActiveSpaceId } from '../model/spaces';

interface SpaceChromeProps {
  children: React.ReactNode;
}

export function SpaceChrome({ children }: SpaceChromeProps) {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const ctx = useGateContext();
  const { spaces: visibleSpaces, isLoading: accessLoading } = useVisibleSpaces(ctx?.flags);

  const activeSpaceId = getActiveSpaceId(pathname);

  // Navigation is handled by the Link href — callback is for future extensibility
  const handleNavigate = (_spaceId: string) => {};

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop sidebar — hidden on mobile */}
        <SpaceLauncher
          spaces={accessLoading ? [] : visibleSpaces}
          activeSpaceId={activeSpaceId}
          collapsed={collapsed}
          onNavigate={handleNavigate}
          onToggleCollapse={() => setCollapsed(prev => !prev)}
        />

        {/* Workspace scope panel — persistent workspace identity surface (WS-06, D-13) */}
        <WorkspaceScopePanel />

        {/* Main content area — safe-area-aware bottom padding for mobile bottom bar */}
        <main
          className="flex-1 min-w-0 md:pb-0"
          style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Empty workspace state — welcome surface for zero-delegation users (WS-05, D-12) */}
          <EmptyWorkspaceState />
          {children}
        </main>
      </div>

      {/* Mobile bottom bar — rendered at body level via portal to avoid containing block issues */}
      <MobileSpaceBar />
    </ErrorBoundary>
  );
}
