import Link from 'next/link';
import { cn } from '@shared/lib';

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
    primary: 'bg-gold-vein text-lapis-deep hover:bg-gold-vein/90 border border-gold-vein',
    secondary: 'bg-vellum text-lapis-deep hover:bg-vellum-light border border-lapis-azure/30',
    outline: 'bg-transparent text-lapis-deep border border-lapis-azure/40 hover:bg-lapis-azure/10',
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
