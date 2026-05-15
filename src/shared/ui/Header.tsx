'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@shared/ui';
import { authClient } from '@api/auth-client';
import { isAdmin } from '@entities/tenant/api/permissions';
import { MobileMenu } from './MobileMenu';

interface PageFlags {
  campaign: boolean;
  conservation: string;
  conservationExternalUrl: string;
  chat: boolean;
  news: boolean;
  events: boolean;
  directory: boolean;
  surveys: boolean;
}

const BASE_NAV = [
  { href: '/', label: 'home' },
  { href: '/directory', label: 'directory' },
  { href: '/news', label: 'news' },
  { href: '/events', label: 'events' },
  { href: '/surveys', label: 'surveys' },
  { href: '/conservation', label: 'conservation' },
  { href: '/campaign', label: 'campaign' },
];

function TeaserLink({
  href,
  label,
  pathname,
  authenticated,
}: {
  href: string;
  label: string;
  pathname: string;
  authenticated: boolean;
}) {
  const [showToast, setShowToast] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!authenticated) {
      e.preventDefault();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  if (!authenticated) {
    return (
      <div className="relative">
        <button
          onClick={handleClick}
          className="hover:text-soralia-accent font-medium cursor-pointer"
        >
          {label}
        </button>
        {showToast && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-red-600 text-white text-sm px-4 py-2 rounded-md shadow-lg z-50">
            This feature is available to residents only. Please sign in to access.
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`hover:text-soralia-accent font-medium ${pathname.startsWith(href) ? 'text-soralia-accent' : ''}`}
    >
      {label}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pageFlags, setPageFlags] = useState<PageFlags>({
    campaign: true,
    conservation: 'default',
    conservationExternalUrl: '',
    chat: true,
    news: true,
    events: true,
    directory: true,
    surveys: true,
  });
  const { t, i18n } = useTranslation('common');
  const { data: session, isPending } = authClient.useSession();

  const isAdminUser = isAdmin(session?.user?.role);
  const isBoardUser = session?.user?.role === 'BOARD';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function fetchPageFlags() {
      try {
        const res = await fetch('/api/flags');
        const data = await res.json();
        if (data.flags) {
          setPageFlags(prev => ({ ...prev, ...data.flags }));
        }
      } catch (error) {
        console.error('Failed to fetch page flags', error);
      }
    }
    fetchPageFlags();
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  const navItems = mounted
    ? BASE_NAV.filter(item => {
        if (item.href === '/surveys' && pageFlags.surveys === false) return false;
        if (item.href === '/directory' && pageFlags.directory === false) return false;
        if (item.href === '/news' && pageFlags.news === false) return false;
        if (item.href === '/events' && pageFlags.events === false) return false;
        if (item.href === '/conservation' && pageFlags.conservation === 'external') return false;
        if (item.href === '/campaign' && pageFlags.campaign === false) return false;
        return true;
      }).map(item => ({
        name: t(`nav.${item.label}`) || item.label,
        href: item.href,
      }))
    : [];

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md relative overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-10"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,32 C120,64 240,0 360,32 C480,64 600,96 720,64 C840,32 960,0 1080,32 C1200,64 1320,96 1440,64 L1440,120 L0,120 Z"
        />
        <path
          fill="currentColor"
          d="M0,48 C180,96 360,32 540,64 C720,96 900,64 1080,32 C1260,0 1350,0 1440,32 L1440,120 L0,120 Z"
          opacity="0.5"
        />
        <path
          fill="currentColor"
          d="M0,80 C240,48 480,96 720,64 C960,32 1200,0 1440,48 L1440,120 L0,120 Z"
          opacity="0.3"
        />
      </svg>

      <div className="container mx-auto px-4 py-4 relative">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="Soralia Village Logo"
              className="w-16 h-16 rounded-full bg-white p-2 border-2 border-white shadow-lg object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold">{mounted ? t('app.name') : 'Loading...'}</h1>
              <p className="text-xs opacity-75">{mounted ? t('app.tagline') : ''}</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden lg:flex space-x-6">
              {mounted &&
                navItems.map(item => (
                  <TeaserLink
                    key={item.href}
                    href={item.href}
                    label={item.name}
                    pathname={pathname}
                    authenticated={!!session}
                  />
                ))}
            </nav>

            <Suspense fallback={<div className="w-16 h-6 bg-white/20 rounded" />}>
              <LanguageSwitcher />
            </Suspense>

            {!mounted ? (
              <div className="w-20 h-8 bg-white/20 rounded animate-pulse" />
            ) : isPending ? (
              <div className="w-20 h-8 bg-white/20 rounded animate-pulse" />
            ) : session ? (
              <div className="hidden md:flex items-center space-x-3">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 bg-white/20 py-1.5 px-3 rounded-md hover:bg-white/30 transition"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-medium">
                      {(session.user.name || session.user.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium hidden sm:inline">
                    {session.user.name || session.user.email?.split('@')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-white/20 text-white py-2 px-4 rounded-md hover:bg-white/30 transition text-sm hidden md:block"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="bg-white text-soralia-primary py-2 px-4 rounded-md hover:bg-gray-100 transition hidden md:block"
              >
                {t('nav.login')}
              </Link>
            )}

            {mounted && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md hover:bg-white/20 text-white"
                aria-expanded={mobileMenuOpen}
                aria-label="Open menu"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          navItems={navItems}
        />
      </div>
    </header>
  );
}
