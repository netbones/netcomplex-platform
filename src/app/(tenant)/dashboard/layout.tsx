'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { authClient } from '@shared/api/auth-client';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';
import { ErrorBoundary } from '@shared/ui';
import { SpaceLauncher } from '@widgets/dashboard/ui/SpaceLauncher';
import { MobileSpaceBar } from '@widgets/dashboard/ui/MobileSpaceBar';
import { getVisibleSpaces, resolveSpace } from '@widgets/dashboard/model/spaces';

const FOCUS_SPACES_ENABLED = process.env.NEXT_PUBLIC_FOCUS_SPACES === 'true';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { flags } = usePageFlags();

  const role = session?.user?.role || 'RESIDENT';

  // Derive active space from pathname
  const activeSpaceId = getActiveSpaceId(pathname);

  // Get visible spaces for this role + flags
  const visibleSpaces = flags ? getVisibleSpaces(role, flags) : [];

  const handleNavigate = (_spaceId: string) => {
    // Navigation handled by Link href — this callback is for future extensibility
  };

  // Feature flag OFF: old layout (no sidebar, no bottom bar)
  if (!FOCUS_SPACES_ENABLED) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // Feature flag ON: new Focus Space layout with sidebar + bottom bar
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

/**
 * Derive the active space ID from the current pathname.
 * /dashboard → 'home'
 * /dashboard/services → 'services'
 * /dashboard/admin/users → 'admin' (sub-routes belong to admin space)
 */
function getActiveSpaceId(pathname: string): string {
  if (!pathname) return 'home';

  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  if (match) {
    const slug = match[1];
    if (resolveSpace(slug)) {
      return slug;
    }
  }

  return 'home';
}
