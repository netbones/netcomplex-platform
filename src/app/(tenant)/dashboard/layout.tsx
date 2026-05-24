'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { authClient } from '@shared/api/auth-client';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';
import { ErrorBoundary } from '@shared/ui';
import { SpaceLauncher } from '@widgets/dashboard/ui/SpaceLauncher';
import { getVisibleSpaces, resolveSpace } from '@widgets/dashboard/model/spaces';

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

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop sidebar */}
        <SpaceLauncher
          spaces={visibleSpaces}
          activeSpaceId={activeSpaceId}
          collapsed={collapsed}
          onNavigate={handleNavigate}
          onToggleCollapse={() => setCollapsed(prev => !prev)}
        />

        {/* Main content area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
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
