'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { authClient } from '@api/auth-client';
import { useIsMounted } from 'usehooks-ts';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';
import { isAdmin } from '@entities/tenant/api/permissions';

interface NavItem {
  name: string;
  href: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

export function MobileMenu({ isOpen, onClose, navItems }: MobileMenuProps) {
  const { t } = useTranslation('common');
  const isMounted = useIsMounted();
  const { data: session } = authClient.useSession();
  const { flags } = usePageFlags();
  const isAdminUser = isAdmin(session?.user?.role);
  const isBoard = session?.user?.role === 'board';
  const isLoggedIn = !!session;

  if (!isOpen) return null;

  if (!isMounted || !flags) {
    return (
      <div className="mt-4 p-4 bg-soralia-primary border-t-4 border-white">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-soralia-primary border-t-4 border-white">
      <nav className="space-y-2">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="block py-2 px-3 hover:bg-white/10 rounded text-white"
          >
            {item.name}
          </Link>
        ))}

        {isLoggedIn && (
          <>
            <div className="border-t border-white/20 my-2" />
            {flags.dashboard !== false && (
              <Link
                href="/dashboard"
                onClick={onClose}
                className="block py-2 px-3 hover:bg-white/10 rounded text-white"
              >
                {t('nav.dashboard')}
              </Link>
            )}
            {flags.maintenance !== false && (
              <Link
                href="/maintenance"
                onClick={onClose}
                className="block py-2 px-3 hover:bg-white/10 rounded text-white"
              >
                {t('nav.maintenance')}
              </Link>
            )}
            {flags.bookings !== false && (
              <Link
                href="/bookings"
                onClick={onClose}
                className="block py-2 px-3 hover:bg-white/10 rounded text-white"
              >
                {t('nav.bookings')}
              </Link>
            )}
            {flags.messages !== false && (
              <Link
                href="/messages"
                onClick={onClose}
                className="block py-2 px-3 hover:bg-white/10 rounded text-white"
              >
                {t('nav.messages')}
              </Link>
            )}
          </>
        )}

        {(isAdminUser || isBoard) && (
          <>
            <div className="border-t border-white/20 my-2" />
            <Link
              href="/admin"
              onClick={onClose}
              className="block py-2 px-3 hover:bg-white/10 rounded text-gold-vein font-medium"
            >
              {t('nav.admin')}
            </Link>
            <Link
              href="/admin/users"
              onClick={onClose}
              className="block py-2 px-3 hover:bg-white/10 rounded text-white text-sm"
            >
              {t('admin.users')}
            </Link>
            <Link
              href="/admin/requests"
              onClick={onClose}
              className="block py-2 px-3 hover:bg-white/10 rounded text-white text-sm"
            >
              {t('admin.requests')}
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-white/20 mt-4 pt-4">
        {isLoggedIn ? (
          <button
            onClick={async () => {
              await authClient.signOut();
              onClose();
              window.location.href = '/';
            }}
            className="block w-full text-left py-2 text-red-300"
          >
            {t('nav.logout')}
          </button>
        ) : (
          <Link href="/sign-in" onClick={onClose} className="block py-2 text-soralia-accent">
            {t('nav.login')}
          </Link>
        )}
      </div>
    </div>
  );
}
