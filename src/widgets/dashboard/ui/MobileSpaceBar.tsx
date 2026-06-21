'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSafeTranslation } from '@shared/lib';
import { authClient } from '@api/client';
import { usePageFlags, useUnreadMessages } from '@shared/lib/hooks';
import { getVisibleSpaces, SPACES, type SpaceId } from '../model/spaces';

const SPACE_FALLBACKS: Record<string, string> = {
  'spaces.home': 'Home',
  'spaces.services': 'Services',
  'spaces.community': 'Community',
  'spaces.messages': 'Messages',
  'spaces.admin': 'Admin',
};

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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { tx } = useSafeTranslation();
  const { data: session } = authClient.useSession();
  const { flags } = usePageFlags();
  const role = session?.user?.role || 'RESIDENT';

  useEffect(() => setMounted(true), []);

  const { data: unreadData } = useUnreadMessages(!!session?.user?.id);
  const unreadCount = (unreadData?.data?.totalUnread as number) ?? 0;

  const visibleSpaces = flags
    ? getVisibleSpaces(role, flags)
    : getVisibleSpaces(role, {} as Parameters<typeof getVisibleSpaces>[1]);

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
    const base = SPACES[spaceId].href;
    return pathname === base || pathname.startsWith(base + '/');
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`#mobile-space-bar{position:fixed!important;bottom:0!important;left:0!important;right:0!important}`}</style>
      <nav
        id="mobile-space-bar"
        className="h-16 pb-[env(safe-area-inset-bottom,0px)] md:hidden bg-white border-t border-gray-200 z-40"
        aria-label="Space navigation"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {mobileSpaces.map(space => {
            const Icon = space.icon;
            const active = isActive(space.id);
            const label = tx(space.labelKey, SPACE_FALLBACKS[space.labelKey] || space.labelKey);

            return (
              <Link
                key={space.id}
                href={space.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
                  active ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {/* Badge: show indicator on Messages space */}
                  {space.id === 'messages' && <UnreadBadge count={unreadCount} />}
                </div>
                <span className="text-[10px] font-medium leading-tight truncate max-w-[64px]">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>,
    document.body
  );
}

/** Small red dot badge for unread messages (placeholder — will connect to real count) */
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}
