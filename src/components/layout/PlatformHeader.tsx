'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'About', href: '/about' },
];

interface PlatformHeaderProps {
  className?: string;
  variant?: 'light' | 'dark';
}

/**
 * PlatformHeader provides consistent branded navigation
 * for platform pages. Follows NetComplex brand guidelines.
 */
export function PlatformHeader({ className, variant = 'light' }: PlatformHeaderProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  const textColor = variant === 'dark' ? 'text-white' : 'text-lapis-deep';
  const subtextColor = variant === 'dark' ? 'text-lapis-azure/70' : 'text-lapis-mid';
  const hoverColor = variant === 'dark' ? 'hover:text-gold-vein' : 'hover:text-lapis-azure';

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
            <span className={cn('text-xs font-medium tracking-wide', subtextColor)}>
              by Netbones Africa
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map(item => (
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
          <div className="flex items-center space-x-4">
            <Link
              href="/sign-in"
              className={cn('text-sm font-medium transition-colors', textColor, hoverColor)}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-lapis-deep bg-gold-vein hover:bg-gold-vein/90 transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center p-2 rounded-md transition-colors',
                textColor,
                hoverColor
              )}
              aria-expanded="false"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
