'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Suspense } from 'react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const navLinks = [
  { href: '/', page: 'home' },
  { href: '/directory', page: 'directory' },
  { href: '/services', page: 'services' },
  { href: '/resources', page: 'resources' },
  { href: '/conservation', page: 'conservation' },
];

export function Header() {
  const pathname = usePathname();
  const { t } = useTranslation('common');

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
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-soralia-accent font-medium ${pathname === link.href ? 'text-soralia-accent' : ''}`}
            >
              {t(`nav.${link.page}`)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          <Suspense fallback={<div className="w-16 h-6 bg-white/20 rounded" />}>
            <LanguageSwitcher />
          </Suspense>
          <Link
            href="/auth-handler"
            className="bg-white text-soralia-primary py-2 px-4 rounded-md hover:bg-gray-100 transition"
          >
            {t('nav.login')}
          </Link>
        </div>
      </div>
    </header>
  );
}
