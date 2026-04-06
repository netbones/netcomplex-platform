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

  const textColor = variant === 'dark' ? 'text-white' : 'text-bark';
  const hoverColor = variant === 'dark' ? 'hover:text-canopy-300' : 'hover:text-canopy';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-slate-200/20 backdrop-blur-sm',
        variant === 'dark' ? 'bg-slate-900/80' : 'bg-white/80',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className={cn('text-xl font-bold', textColor)}>NetComplex</span>
            </Link>
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
                  isActive(item.href) && 'text-canopy font-semibold'
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-canopy hover:bg-canopy-600 transition-colors"
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
