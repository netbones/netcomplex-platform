import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PrimaryCTAProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * PrimaryCTA provides consistent call-to-action buttons
 * following NetComplex design system.
 */
export function PrimaryCTA({
  href,
  children,
  className,
  size = 'md',
  variant = 'primary',
}: PrimaryCTAProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-canopy text-white hover:bg-canopy-600 border border-canopy',
    secondary: 'bg-fieldstone text-bark hover:bg-fieldstone-200 border border-fieldstone',
    outline: 'bg-transparent text-canopy border border-canopy hover:bg-canopy hover:text-white',
  };

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-200',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
