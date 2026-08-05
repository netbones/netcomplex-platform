'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSafeTranslation } from '@shared/lib';
import { useGateContext } from '@features/gate';
import { useUnreadMessages, useVisibleSpaces } from '@shared/lib/hooks';
import { SPACES, type SpaceId } from '../model/spaces';

const SPACE_FALLBACKS: Record<string, string> = {
  'spaces.home': 'Home',
  'spaces.providers': 'Providers',
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
 * Overflow guard: If useVisibleSpaces() returns >5 items, logs a console warning
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
 *
 * Phase 110 — wired to usePageAccess() / useVisibleSpaces() instead of
 * inline role checks.
 */
export function MobileSpaceBar() {
  const [mounted, setMounted] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const pathname = usePathname();
  const { tx } = useSafeTranslation();
  const ctx = useGateContext();

  useEffect(() => setMounted(true), []);

  const handleClose = useCallback(() => setOverflowOpen(false), []);

  const { data: unreadData } = useUnreadMessages(true);
  const unreadCount = unreadData?.totalUnread ?? 0;

  const { spaces: visibleSpaces } = useVisibleSpaces(ctx?.flags);

  const hasOverflow = visibleSpaces.length > 5;
  const mobileSpaces = visibleSpaces.slice(0, 5);
  const overflowSpaces = visibleSpaces.slice(5);

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
                  {space.id === 'messages' && <UnreadBadge count={unreadCount} />}
                </div>
                <span className="text-[10px] font-medium leading-tight truncate max-w-[64px]">
                  {label}
                </span>
              </Link>
            );
          })}
          {hasOverflow && (
            <button
              type="button"
              onClick={() => setOverflowOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors text-gray-500 hover:text-gray-700"
              aria-label={tx('spaces.more', 'More')}
            >
              <div className="relative">
                <span className="flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-gray-100 text-gray-600">
                  +{overflowSpaces.length}
                </span>
              </div>
              <span className="text-[10px] font-medium leading-tight truncate max-w-[64px]">
                {tx('spaces.more', 'More')}
              </span>
            </button>
          )}
        </div>
      </nav>

      {hasOverflow && overflowOpen && (
        <OverflowSheet spaces={overflowSpaces} onClose={handleClose} isActive={isActive} tx={tx} />
      )}
    </>,
    document.body
  );
}

interface OverflowSheetProps {
  spaces: Array<{
    id: SpaceId;
    icon: React.ComponentType<{ className?: string }>;
    labelKey: string;
    href: string;
  }>;
  onClose: () => void;
  isActive: (id: SpaceId) => boolean;
  tx: (key: string, fallback: string) => string;
}

function OverflowSheet({ spaces, onClose, isActive, tx }: OverflowSheetProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl animate-slide-up max-h-[70vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto my-3" />
        <div className="px-4 pb-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            {tx('spaces.more', 'More Spaces')}
          </h2>
        </div>
        <div className="px-2 pb-4">
          {spaces.map(space => {
            const Icon = space.icon;
            const active = isActive(space.id);
            const label = tx(space.labelKey, SPACE_FALLBACKS[space.labelKey] || space.labelKey);
            return (
              <Link
                key={space.id}
                href={space.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
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
