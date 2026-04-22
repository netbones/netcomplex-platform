'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@shared/ui';
import { authClient } from '@api/auth-client';
import { hasPermission } from '@api/permissions';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('Header');

interface PageFlags {
  campaign: boolean;
  conservation: string;
  conservationExternalUrl: string;
  chat: boolean;
  news: boolean;
  events: boolean;
  directory: boolean;
}

interface CampaignConfig {
  config: {
    linkLabel: Record<string, string>;
    pageTitle: Record<string, string>;
    pageDescription: Record<string, string>;
    contentCategory: string;
  };
  content: unknown[];
}

function getLocalizedLabel(
  labelObj: Record<string, string> | null | undefined,
  i18n: { language: string }
): string {
  if (!labelObj || typeof labelObj !== 'object') return '';
  return labelObj[i18n.language] || labelObj.en || '';
}

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
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig['config'] | null>(null);
  const [pageFlags, setPageFlags] = useState<PageFlags>({
    campaign: true,
    conservation: 'default',
    conservationExternalUrl: '',
    chat: true,
    news: true,
    events: true,
    directory: true,
  });
  const { t, i18n, ready } = useTranslation('common');
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Fetch page flags for dynamic nav
  useEffect(() => {
    async function fetchPageFlags() {
      try {
        const res = await fetch('/api/flags');
        const data = await res.json();
        if (data.flags) {
          setPageFlags(prev => ({ ...prev, ...data.flags }));
        }
      } catch (error) {
        log.error({}, 'Failed to fetch page flags', error);
      }
    }
    fetchPageFlags();
  }, []);

  // Fetch campaign config to get dynamic link label
  useEffect(() => {
    async function fetchCampaignConfig() {
      try {
        const res = await fetch('/api/campaign');
        const data: CampaignConfig = await res.json();
        if (data.config) {
          setCampaignConfig(data.config);
        }
      } catch (error) {
        log.error({}, 'Failed to fetch campaign config', error);
      }
    }
    fetchCampaignConfig();
  }, []);

  // Get localized campaign link label with safety check
  const campaignLabel =
    pageFlags.campaign === false
      ? null
      : getLocalizedLabel(campaignConfig?.linkLabel, i18n) || t('nav.campaign');

  if (!mounted || !ready) {
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
              <h1 className="text-2xl font-bold">Soralia Village</h1>
              <p className="text-xs opacity-75">A Community of Neighbors</p>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const userRole = session?.user?.role as string | undefined;
  const isAdmin = userRole && hasPermission(userRole, 'admin');
  const isBoard = userRole && hasPermission(userRole, 'users');

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

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
      <div className="container mx-auto px-4 py-4 flex justify-between items-center relative z-10">
        <Link href="/" className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="Soralia Village Logo"
            className="w-16 h-16 rounded-full bg-white p-2 border-2 border-white shadow-lg object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{t('app.name')}</h1>
            <p className="text-xs opacity-75">{t('app.tagline')}</p>
          </div>
        </Link>

        <nav className="hidden md:flex space-x-6">
          <Link
            href="/"
            className={`hover:text-soralia-accent font-medium ${pathname === '/' ? 'text-soralia-accent' : ''}`}
          >
            {t('nav.home')}
          </Link>
          {pageFlags.directory !== false && (
            <TeaserLink
              href="/directory"
              label={t('nav.directory')}
              pathname={pathname}
              authenticated={!!session}
            />
          )}
          {pageFlags.news !== false && (
            <TeaserLink
              href="/news"
              label={t('nav.news')}
              pathname={pathname}
              authenticated={!!session}
            />
          )}
          {pageFlags.events !== false && (
            <TeaserLink
              href="/events"
              label={t('nav.events')}
              pathname={pathname}
              authenticated={!!session}
            />
          )}
          {pageFlags.conservation !== 'external' && (
            <Link
              href="/conservation"
              className={`hover:text-soralia-accent font-medium ${pathname === '/conservation' ? 'text-soralia-accent' : ''}`}
            >
              {t('nav.conservation')}
            </Link>
          )}
          {pageFlags.campaign !== false && campaignLabel && (
            <Link
              href="/campaign"
              className={`hover:text-soralia-accent font-medium ${pathname === '/campaign' ? 'text-soralia-accent' : ''}`}
            >
              {campaignLabel}
            </Link>
          )}
          {session && (isAdmin || isBoard) && (
            <Link
              href="/admin"
              className={`hover:text-soralia-accent font-medium ${pathname.startsWith('/admin') ? 'text-soralia-accent' : ''}`}
            >
              {t('nav.admin')}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <Suspense fallback={<div className="w-16 h-6 bg-white/20 rounded" />}>
            <LanguageSwitcher />
          </Suspense>

          {isPending ? (
            <div className="w-20 h-8 bg-white/20 rounded animate-pulse" />
          ) : session ? (
            <div className="flex items-center space-x-3">
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
                className="hidden md:block bg-white/20 text-white py-2 px-4 rounded-md hover:bg-white/30 transition text-sm"
              >
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

          {mounted && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-white/20"
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

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-3">
            <nav className="space-y-1">
              {session ? (
                <>
                  <Link href="/dashboard" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Dashboard
                  </Link>
                  <Link href="/directory" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Directory
                  </Link>
                  <Link href="/services" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Services
                  </Link>
                  <Link href="/resources" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Resources
                  </Link>
                  <Link href="/groups" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Groups
                  </Link>
                  <Link href="/interest" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Interest
                  </Link>
                  <Link href="/maintenance" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Maintenance
                  </Link>
                  <Link href="/bookings" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Bookings
                  </Link>
                  <Link href="/messages" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Messages
                  </Link>
                  <div className="border-t border-white/20 my-1"></div>
                  <Link
                    href="/notifications"
                    className="block py-1.5 px-2 hover:bg-white/10 rounded"
                  >
                    Notifications
                  </Link>
                  <Link href="/settings" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Settings
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/directory" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Directory
                  </Link>
                  <Link href="/services" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Services
                  </Link>
                  <Link href="/resources" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Resources
                  </Link>
                  <Link href="/groups" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Groups
                  </Link>
                  <Link href="/interest" className="block py-1.5 px-2 hover:bg-white/10 rounded">
                    Interest
                  </Link>
                </>
              )}
            </nav>
            <div className="border-t border-white/20 mt-2 pt-2 space-y-1">
              {session ? (
                <button
                  onClick={async () => {
                    await authClient.signOut();
                    window.location.href = '/';
                  }}
                  className="block w-full text-left py-2 text-red-400"
                >
                  {t('nav.logout')}
                </button>
              ) : (
                <>
                  <Link href="/sign-in" className="block py-1 hover:text-soralia-accent">
                    {t('nav.login')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
