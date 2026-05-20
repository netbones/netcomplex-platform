'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useIsMounted } from 'usehooks-ts';
import { authClient } from '@api/auth-client';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';
import {
  getHeaderItems,
  getMoreDropdownItems,
  getWorkspaceItems,
  getAdminItems,
  type NavItem,
} from '@/shared/lib/navigation-config';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
  const pathname = usePathname() ?? '';
  const isMounted = useIsMounted();
  const { t, ready } = useTranslation('common');
  const { data: session } = authClient.useSession();
  const { flags } = usePageFlags();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isMounted() || !ready) {
    return null;
  }

  const isLoggedIn = !!session;
  const userRole = session?.user?.role as string | undefined;

  // Build nav sections from navigation-config (4-section structure per governance)
  const exploreItems = flags ? getHeaderItems(flags) : [];
  const communityItems = flags ? getMoreDropdownItems(flags) : [];
  const workspaceItems = flags ? getWorkspaceItems(flags, isLoggedIn) : [];
  const adminItems = getAdminItems(userRole);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const renderNavItem = (item: NavItem, useAdminLabel = false) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => onClose()}
      className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
        isActive(item.href)
          ? 'bg-lapis-deep text-white font-medium'
          : 'text-lapis-mid hover:bg-lapis-azure/10 hover:text-lapis-deep'
      }`}
    >
      <NavIcon name={item.icon || 'file'} />
      <span>{useAdminLabel && item.adminLabelKey ? t(item.adminLabelKey) : t(item.labelKey)}</span>
    </Link>
  );

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/50 z-[99999] cursor-pointer border-none"
          onClick={() => onClose()}
        />
      )}
      <aside
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-900 shadow-2xl z-[100000] transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-lapis-azure/20 flex justify-between items-center">
          <h2 className="text-xl font-bold text-lapis-deep dark:text-white">{t('app.name')}</h2>
          <button
            onClick={() => onClose()}
            className="p-2 rounded-lg hover:bg-lapis-azure/10 text-lapis-mid transition-colors"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {/* Explore section */}
          <div className="text-xs font-semibold text-lapis-mid uppercase tracking-wider mb-3 px-3">
            {t('nav.explore')}
          </div>
          {exploreItems.map(item => renderNavItem(item))}

          {/* Community section */}
          {communityItems.length > 0 && (
            <>
              <div className="border-t border-lapis-azure/20 my-4"></div>
              <div className="text-xs font-semibold text-lapis-mid uppercase tracking-wider mb-3 px-3">
                {t('nav.community')}
              </div>
              {communityItems.map(item => renderNavItem(item))}
            </>
          )}

          {isLoggedIn && (
            <>
              {/* My Space (workspace items — now includes Notifications + Settings) */}
              {workspaceItems.length > 0 && (
                <>
                  <div className="border-t border-lapis-azure/20 my-4"></div>
                  <div className="text-xs font-semibold text-lapis-mid uppercase tracking-wider mb-3 px-3">
                    {t('nav.mySpace')}
                  </div>
                  {workspaceItems.map(item => renderNavItem(item))}
                </>
              )}

              {/* Admin items (role-gated) */}
              {adminItems.length > 0 && (
                <>
                  <div className="border-t border-lapis-azure/20 my-4"></div>
                  <div className="text-xs font-semibold text-lapis-mid uppercase tracking-wider mb-3 px-3">
                    {t('nav.administration')}
                  </div>
                  {adminItems.map(item => renderNavItem(item, true))}
                </>
              )}

              <div className="border-t border-lapis-azure/20 my-4"></div>

              <button
                onClick={async () => {
                  await authClient.signOut();
                  onClose();
                  window.location.href = '/';
                }}
                className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full cursor-pointer"
                type="button"
              >
                <NavIcon name="signout" />
                <span>{t('nav.logout')}</span>
              </button>
            </>
          )}

          {!isLoggedIn && (
            <>
              <div className="border-t border-lapis-azure/20 my-4"></div>
              <Link
                href="/sign-in"
                onClick={() => onClose()}
                className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 text-lapis-mid hover:bg-lapis-azure/10 hover:text-lapis-deep w-full"
              >
                <NavIcon name="signin" />
                <span>{t('nav.login')}</span>
              </Link>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

function NavIcon({ name }: { name: string }) {
  const iconClass = 'w-5 h-5';
  const icons: Record<string, React.ReactNode> = {
    home: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    users: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    calendar: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    file: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    heart: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    tool: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.81 2.62 2.27l-.534 6.592a1 1 0 01-.986.84H5.5a1 1 0 01-.986-.84L2.61 8.08A1.724 1.724 0 004.04 6.37a1.724 1.724 0 002.573-1.066c1.543-.94 3.31.81 2.62 2.27l-.534 6.592a1 1 0 01-.986.84H4.5a1 1 0 01-1-1v-3a1 1 0 011-1h3.325z"
        />
      </svg>
    ),
    mail: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    shield: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    signout: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    ),
    cog: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.81 2.62 2.27l-.534 6.592a1 1 0 01-.986.84H5.5a1 1 0 01-.986-.84L2.61 8.08A1.724 1.724 0 004.04 6.37a1.724 1.724 0 002.573-1.066c1.543-.94 3.31.81 2.62 2.27l-.534 6.592a1 1 0 01-.986.84H4.5a1 1 0 01-1-1v-3a1 1 0 011-1h3.325z"
        />
      </svg>
    ),
    bell: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.659 6 8.009 6 10v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a1 1 0 001-1v-4a1 1 0 00-1-1h-6a1 1 0 00-1 1v4a1 1 0 001 1m6 0h6"
        />
      </svg>
    ),
    'external-link-alt': (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    ),
    tags: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7h4a2 2 0 010 4H7z"
        />
      </svg>
    ),
    chart: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    signin: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 16l-5-5m5 5l5-5m-5 5v12"
        />
      </svg>
    ),
  };
  return icons[name] || icons.home;
}
