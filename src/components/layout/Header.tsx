'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Suspense } from 'react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { SideDrawer } from '@/components/ui/SideDrawer';
import { PUBLIC_NAV_LINKS } from '@/lib/constants';
import { authClient } from '@/lib/auth-client';
import { hasPermission, canManageGroups } from '@/lib/permissions';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { t } = useTranslation('common');
  const { data: session, isPending } = authClient.useSession();

  const userRole = session?.user?.role as string | undefined;
  const isAdmin = userRole && hasPermission(userRole, 'admin');
  const isBoard = userRole && hasPermission(userRole, 'users');

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="Soralia Village Logo"
            className="w-16 h-16 rounded-full bg-white p-2 border-2 border-white shadow-lg object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{t('app.name')}</h1>
            <p className="text-xs opacity-75">{t('app.tagline')}</p>
          </div>
        </div>

        <nav className="hidden md:flex space-x-6">
          {PUBLIC_NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-soralia-accent font-medium ${pathname === link.href ? 'text-soralia-accent' : ''}`}
            >
              {t(`nav.${link.page}`)}
            </Link>
          ))}
          {session && (
            <>
              <Link
                href="/directory"
                className={`hover:text-soralia-accent font-medium ${pathname.startsWith('/directory') ? 'text-soralia-accent' : ''}`}
              >
                {t('nav.directory')}
              </Link>
              <Link
                href="/services"
                className={`hover:text-soralia-accent font-medium ${pathname.startsWith('/services') ? 'text-soralia-accent' : ''}`}
              >
                {t('nav.services')}
              </Link>
              <Link
                href="/resources"
                className={`hover:text-soralia-accent font-medium ${pathname.startsWith('/resources') ? 'text-soralia-accent' : ''}`}
              >
                {t('nav.resources')}
              </Link>
              {(isAdmin || isBoard) && (
                <>
                  <Link
                    href="/admin"
                    className={`hover:text-soralia-accent font-medium ${pathname.startsWith('/admin') ? 'text-soralia-accent' : ''}`}
                  >
                    {t('nav.admin')}
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {session && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-md hover:bg-white/20"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          <Suspense fallback={<div className="w-16 h-6 bg-white/20 rounded" />}>
            <LanguageSwitcher />
          </Suspense>
          {isPending ? (
            <div className="w-20 h-8 bg-white/20 rounded animate-pulse" />
          ) : session ? (
            <div className="flex items-center space-x-3">
              <Link
                href="/dashboard"
                className="bg-white/20 py-2 px-4 rounded-md hover:bg-white/30 transition"
              >
                {session.user.name || session.user.email}
              </Link>
              <button onClick={handleSignOut} className="text-sm hover:underline">
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="bg-white text-soralia-primary py-2 px-4 rounded-md hover:bg-gray-100 transition"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>

        <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      </div>
    </header>
  );
}
