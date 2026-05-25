'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authClient } from '@api/auth-client';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';
import { getVisibleSpaces, type SpaceId } from '../model/spaces';

/**
 * MobileSpaceBar — bottom navigation bar for Focus Spaces on mobile.
 *
 * Per Q1 decision: 5 mobile slots (Home, Services, Community, Messages, Admin).
 * Each item shows icon + short label, active state with indigo-600 color.
 *
 * Overflow guard: If getVisibleSpaces() returns >5 items, logs a console warning
 * and slices to 5. TODO: implement "More" overflow sheet when 6th space is added.
 *
 * Safe-area handling:
 * - Bar height: h-16 + safe-area padding at bottom
 * - pb-[env(safe-area-inset-bottom,0px)] ensures bar extends behind home indicator
 *   on iPhone notch/Dynamic Island devices
 * - Only renders on mobile (md:hidden)
 *
 * Prerequisite: Ensure root layout has viewport-fit=cover in viewport meta tag
 * for env(safe-area-inset-bottom) to work on iOS.
 */
export function MobileSpaceBar() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { flags } = usePageFlags();
  const role = session?.user?.role || 'RESIDENT';

  const visibleSpaces = flags ? getVisibleSpaces(role, flags) : [];

  // Overflow guard — max 5 slots on mobile
  const mobileSpaces = visibleSpaces.slice(0, 5);
  if (visibleSpaces.length > 5) {
    // TODO: implement "More" overflow sheet when 6th space is added
    console.warn(
      `[MobileSpaceBar] ${visibleSpaces.length} spaces visible but only 5 mobile slots. ` +
        `Overflow spaces not shown: ${visibleSpaces
          .slice(5)
          .map(s => s.id)
          .join(', ')}`
    );
  }

  /** Determine if a space is currently active based on pathname */
  const isActive = (spaceId: SpaceId): boolean => {
    if (spaceId === 'home') {
      return pathname === '/dashboard' || pathname === '/dashboard/';
    }
    return pathname === `/dashboard/${spaceId}` || pathname.startsWith(`/dashboard/${spaceId}/`);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 pb-[env(safe-area-inset-bottom,0px)] md:hidden bg-white border-t border-gray-200 z-40"
      aria-label="Space navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {mobileSpaces.map(space => {
          const Icon = space.icon;
          const active = isActive(space.id);

          return (
            <Link
              key={space.id}
              href={space.id === 'home' ? '/dashboard' : `/dashboard/${space.id}`}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {/* Badge: show indicator on Messages space */}
                {space.id === 'messages' && <UnreadBadge />}
              </div>
              <span className="text-[10px] font-medium leading-tight truncate max-w-[64px]">
                {space.labelKey.split('.').pop()}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Small red dot badge for unread messages (placeholder — will connect to real count) */
function UnreadBadge() {
  // TODO: connect to real unread message count from message store
  return null;
}
