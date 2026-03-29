'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { hasPermission } from '@/lib/permissions';

const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'dashboard', icon: 'home' },
  { href: '/directory', label: 'directory', icon: 'users' },
  { href: '/services', label: 'services', icon: 'calendar' },
  { href: '/resources', label: 'resources', icon: 'file' },
  { href: '/groups', label: 'groups', icon: 'users' },
  { href: '/interest', label: 'interest', icon: 'heart' },
  { href: '/maintenance', label: 'maintenance', icon: 'tool' },
  { href: '/bookings', label: 'bookings', icon: 'calendar' },
  { href: '/messages', label: 'messages', icon: 'mail' },
];

const SETTINGS_LINKS = [
  { href: '/notifications', label: 'notifications', icon: 'bell' },
  { href: '/settings', label: 'settings', icon: 'cog' },
];

const ADMIN_LINKS = [
  { href: '/admin', label: 'overview', icon: 'shield' },
  { href: '/admin/users', label: 'users', icon: 'users' },
  { href: '/admin/groups', label: 'groups', icon: 'users' },
  { href: '/admin/content', label: 'content', icon: 'file' },
  { href: '/admin/requests', label: 'requests', icon: 'tool' },
  { href: '/admin/surveys', label: 'surveys', icon: 'chart' },
  { href: '/admin/external-surveys', label: 'external', icon: 'external-link-alt' },
  { href: '/admin/categories', label: 'categories', icon: 'tags' },
];

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { t, ready } = useTranslation('common');
  const { data: session } = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !ready) {
    return null;
  }

  const userRole = session?.user?.role as string | undefined;
  const canManageUsers = userRole && hasPermission(userRole, 'users');
  const canManageContent = userRole && hasPermission(userRole, 'content');
  const canManageGroups = userRole && hasPermission(userRole, 'groups');
  const canManageRequests = userRole && hasPermission(userRole, 'requests');

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9999] transition-opacity" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-[10000] transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t('app.name')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Menu
          </div>
          {DASHBOARD_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                isActive(link.href)
                  ? 'bg-soralia-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <NavIcon name={link.icon} />
              <span>{t(`nav.${link.label}`)}</span>
            </Link>
          ))}

          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Settings
          </div>
          {SETTINGS_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                isActive(link.href)
                  ? 'bg-soralia-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <NavIcon name={link.icon} />
              <span>{t(`nav.${link.label}`)}</span>
            </Link>
          ))}

          {(canManageUsers || canManageContent || canManageGroups || canManageRequests) && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Admin
              </div>
              {ADMIN_LINKS.map(link => {
                if (link.href === '/admin/users' && !canManageUsers) return null;
                if (link.href === '/admin/content' && !canManageContent) return null;
                if (link.href === '/admin/groups' && !canManageGroups) return null;
                if (link.href === '/admin/requests' && !canManageRequests) return null;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      isActive(link.href)
                        ? 'bg-soralia-primary text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <NavIcon name={link.icon} />
                    <span>{t(`admin.${link.label}`) || link.label}</span>
                  </Link>
                );
              })}
            </>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          <button
            onClick={async () => {
              await authClient.signOut();
              onClose();
              window.location.href = '/';
            }}
            className="flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
          >
            <NavIcon name="signout" />
            <span>{t('nav.logout')}</span>
          </button>
        </nav>
      </aside>
    </>
  );
}

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    home: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    calendar: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    file: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    heart: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    tool: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.81 2.62 2.27l-.534 6.592a1 1 0 01-.986.84H5.5a1 1 0 01-.986-.84L2.61 8.08A1.724 1.724 0 004.04 6.37a1.724 1.724 0 002.573-1.066c1.543-.94 3.31.81 2.62 2.27l-.534 6.592a1 1 0 01-.986.84H4.5a1 1 0 01-1-1v-3a1 1 0 011-1h3.325z"
        />
      </svg>
    ),
    mail: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    shield: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    signout: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    ),
  };
  return icons[name] || icons.home;
}
