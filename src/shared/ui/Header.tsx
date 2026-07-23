'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { LanguageSwitcher } from '@shared/ui';
import { authClient } from '@api/client';
import { useGateContext } from '@features/gate';
import { usePageFlags } from '@shared/lib/hooks/usePageFlags';
import { type PlatformPageFlags, useBusEvent } from '@shared/lib';
import { NAV_REGISTRY, isNavItemVisible } from '@/shared/lib/nav';
import { Wallet, Sun, Moon, User, CreditCard } from 'lucide-react';
import { MobileMenu } from './MobileMenu';
import { useTenant } from '@entities/tenant';

function TeaserLink({
  href,
  labelKey,
  pathname,
  authenticated,
  t,
}: {
  href: string;
  labelKey: string;
  pathname: string;
  authenticated: boolean;
  t: (key: string) => string;
}) {
  const [showToast, setShowToast] = useState(false);

  const label = t(labelKey);

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
          <div className="absolute top-full left-0 mt-2 w-64 bg-red-600 text-white text-sm px-4 py-2 rounded-md shadow-lg z-[60]">
            This feature is available to residents only. Please sign in to access.
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`hover:text-soralia-accent font-medium ${pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'text-soralia-accent' : ''}`}
    >
      {label}
    </Link>
  );
}

function MoreDropdown({
  items,
  t,
  pathname,
}: {
  items: import('@/shared/lib/nav').NavItem[];
  t: (key: string) => string;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="hover:text-soralia-accent font-medium flex items-center space-x-1 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="true"
        type="button"
      >
        <span>{t('nav.more')}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-[60] py-1 border border-gray-200">
          {items.map(item => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  ? 'text-soralia-primary font-medium'
                  : 'text-gray-700'
              }`}
            >
              {t(item.nameKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AvatarDropdown({
  session,
  flags,
  onSignOut,
  t,
  pathname,
}: {
  session: NonNullable<ReturnType<typeof authClient.useSession>['data']>;
  flags: import('@shared/lib').PlatformPageFlags;
  onSignOut: () => void;
  t: (key: string) => string;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const role = session.user.role;
  const workspaceItems = NAV_REGISTRY.filter(
    item => ['dashboard'].includes(item.id) && isNavItemVisible(item, flags, role)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 bg-white/20 py-1.5 px-3 rounded-md hover:bg-white/30 transition cursor-pointer"
        aria-expanded={open}
        aria-haspopup="true"
        type="button"
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt=""
            width={24}
            height={24}
            className="rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-medium">
            {(session.user.name || session.user.email || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium hidden sm:inline">
          {session.user.name || session.user.email?.split('@')[0]}
        </span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-[60] py-1 border border-gray-200">
          {workspaceItems.map(item => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 ${
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  ? 'text-soralia-primary font-medium'
                  : 'text-gray-700'
              }`}
            >
              {t(item.nameKey)}
            </Link>
          ))}

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
          >
            <User className="w-4 h-4 text-indigo-600" />
            {t('nav.profileSettings')}
          </Link>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700 cursor-pointer"
            type="button"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
            {mounted && theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
          </button>

          {flags.dWallet && (
            <Link
              href="/dashboard/wallet"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
            >
              <Wallet className="w-4 h-4 text-indigo-600" />
              {t('spaces.wallet')}
            </Link>
          )}

          <Link
            href="/billing"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
          >
            <CreditCard className="w-4 h-4 text-indigo-600" />
            {t('nav.billing')}
          </Link>

          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 cursor-pointer"
            type="button"
          >
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ctx = useGateContext();
  const { refetch } = usePageFlags();
  const { t } = useTranslation('common');
  const { data: session, isPending } = authClient.useSession();
  const tenant = useTenant();
  const tenantName = tenant?.name || 'Netcomplex Demo Village';
  const tenantTagline = tenant?.tagline || 'A Community of Neighbors';

  useEffect(() => {
    setMounted(true);
  }, []);

  useBusEvent('page-flags-updated', () => refetch());

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  const role = session?.user?.role;
  const visibleItems =
    mounted && ctx?.flags
      ? NAV_REGISTRY.filter(item => isNavItemVisible(item, ctx.flags, role))
      : [];

  const headerLinkIds = ctx?.flags?.headerLinks ?? [];
  const headerOrder = ['home', ...headerLinkIds];

  const headerItems = headerOrder
    .map(id => visibleItems.find(item => item.id === id))
    .filter((item): item is NonNullable<typeof item> => item != null)
    .slice(0, 5);

  const moreItems = visibleItems.filter(
    item =>
      ![
        'home',
        'dashboard',
        'bookings',
        'messages',
        'maintenance',
        'dashboard-home',
        'dashboard-services',
        'dashboard-community',
        'dashboard-messages',
        'dashboard-admin',
        'dashboard-wallet',
        ...headerItems.map(i => i.id),
      ].includes(item.id)
  );

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md relative z-40">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="w-full h-full opacity-10" viewBox="0 0 1440 120" preserveAspectRatio="none">
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
      </div>

      <div className="container mx-auto px-4 py-4 relative">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src={tenant?.logoUrl || '/logo.png'}
              alt={`${tenantName} Logo`}
              width={64}
              height={64}
              className="rounded-full bg-white p-2 border-2 border-white shadow-lg object-cover"
              unoptimized
            />
            <div>
              <h1 className="text-2xl font-bold">
                {mounted ? t('app.name', { tenantName }) : 'Loading...'}
              </h1>
              <p className="text-xs opacity-75">
                {mounted ? t('app.tagline', { tagline: tenantTagline }) : ''}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden lg:flex space-x-6 items-center">
              {headerItems.map(item => (
                <TeaserLink
                  key={item.href}
                  href={item.href}
                  labelKey={item.nameKey}
                  pathname={pathname}
                  authenticated={!!session}
                  t={t}
                />
              ))}
              <MoreDropdown items={moreItems} t={t} pathname={pathname} />
            </nav>

            <Suspense fallback={<div className="w-16 h-6 bg-white/20 rounded" />}>
              <LanguageSwitcher />
            </Suspense>

            {!mounted ? (
              <div className="w-20 h-8 bg-white/20 rounded animate-pulse" />
            ) : isPending ? (
              <div className="w-20 h-8 bg-white/20 rounded animate-pulse" />
            ) : session ? (
              <div className="hidden md:flex items-center">
                <AvatarDropdown
                  session={session}
                  flags={ctx?.flags ?? ({} as PlatformPageFlags)}
                  onSignOut={handleSignOut}
                  t={t}
                  pathname={pathname}
                />
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
          pageFlags={ctx?.flags ?? null}
          isAuthenticated={!!session}
          role={session?.user?.role as string | null}
        />
      </div>
    </header>
  );
}
