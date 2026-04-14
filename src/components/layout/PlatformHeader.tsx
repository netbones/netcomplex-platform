'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@shared/ui/LanguageSwitcher';

interface PlatformHeaderProps {
  className?: string;
  variant?: 'light' | 'dark';
}

/**
 * PlatformHeader provides consistent branded navigation
 * for platform pages. Follows NetComplex brand guidelines.
 */
export function PlatformHeader({ className, variant = 'light' }: PlatformHeaderProps) {
  const pathname = usePathname() ?? '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, ready } = useTranslation('platform');

  const textColor = variant === 'dark' ? 'text-white' : 'text-lapis-deep';
  const subtextColor = variant === 'dark' ? 'text-lapis-azure/70' : 'text-lapis-mid';
  const hoverColor = variant === 'dark' ? 'hover:text-gold-vein' : 'hover:text-lapis-azure';

  const navItems = ready
    ? [
        { name: t('header.home'), href: '/' },
        { name: t('header.features'), href: '/features' },
        { name: t('header.pricing'), href: '/pricing' },
        { name: t('header.about'), href: '/about' },
      ]
    : [
        { name: 'Home', href: '/' },
        { name: 'Features', href: '/features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'About', href: '/about' },
      ];

  const signInText = ready ? t('header.signIn') : 'Sign In';
  const getStartedText = ready ? t('header.getStarted') : 'Get Started';

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-lapis-azure/20 backdrop-blur-sm',
        variant === 'dark' ? 'bg-lapis-deep/90' : 'bg-vellum/90',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-4">
            <Link href="/" className="flex flex-col">
              <span className={cn('text-2xl font-bold tracking-tight', textColor)}>NetComplex</span>
              <span className={cn('text-xs font-medium tracking-wide', subtextColor)}>
                Your complex, connected.
              </span>
            </Link>
            <span
              className={cn('text-xs font-medium tracking-wide hidden lg:inline', subtextColor)}
            >
              by <b>Net</b>bones Africa
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  textColor,
                  hoverColor,
                  isActive(item.href) && 'text-gold-vein font-semibold'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher variant={variant} />
            <Link
              href="/sign-in"
              className={cn('text-sm font-medium transition-colors', textColor, hoverColor)}
            >
              {signInText}
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-lapis-deep bg-gold-vein hover:bg-gold-vein/90 transition-colors"
            >
              {getStartedText}
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher variant={variant} />
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center p-2 rounded-md transition-colors',
                textColor,
                hoverColor
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-lapis-azure/20 py-4">
            <nav className="space-y-2">
              {navItems.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'block text-sm font-medium transition-colors py-2',
                    textColor,
                    hoverColor,
                    isActive(item.href) && 'text-gold-vein font-semibold'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="space-y-2 pt-4 border-t border-lapis-azure/20 mt-4">
              <Link
                href="/sign-in"
                className={cn(
                  'block text-sm font-medium transition-colors py-2',
                  textColor,
                  hoverColor
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {signInText}
              </Link>
              <Link
                href="/signup"
                className="block text-center px-4 py-2 text-sm font-medium rounded-lg text-lapis-deep bg-gold-vein hover:bg-gold-vein/90 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {getStartedText}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
