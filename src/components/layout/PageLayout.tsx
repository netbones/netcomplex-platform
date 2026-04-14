import { ReactNode } from 'react';
import { cn } from '@shared/lib';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  background?: 'white' | 'fieldstone' | 'gradient';
}

/**
 * PageLayout provides consistent page structure and background styling
 * for all platform pages. Follows the NetComplex design system.
 */
export function PageLayout({ children, className, background = 'white' }: PageLayoutProps) {
  const backgroundClasses = {
    white: 'bg-white',
    fieldstone: 'bg-fieldstone',
    gradient: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
  };

  return (
    <div className={cn('min-h-screen', backgroundClasses[background], className)}>{children}</div>
  );
}
