import { ReactNode } from 'react';
import { cn } from '@shared/lib';

interface SectionLayoutProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  container?: boolean;
  background?: 'transparent' | 'fieldstone' | 'canopy' | 'white' | 'vellum';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * SectionLayout provides consistent spacing and container structure
 * for page sections. Follows NetComplex spacing scale.
 */
export function SectionLayout({
  children,
  className,
  size = 'lg',
  container = true,
  background = 'transparent',
  padding = 'md',
}: SectionLayoutProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
    xl: 'py-20',
  };

  const backgroundClasses = {
    transparent: '',
    fieldstone: 'bg-fieldstone',
    canopy: 'bg-canopy text-white',
    white: 'bg-white',
    vellum: 'bg-vellum',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4',
    md: 'px-4 sm:px-6',
    lg: 'px-4 sm:px-6 lg:px-8',
  };

  const Container = container ? 'div' : 'section';

  const containerClasses = container ? 'max-w-7xl mx-auto' : '';

  return (
    <section
      className={cn(
        sizeClasses[size],
        backgroundClasses[background],
        paddingClasses[padding],
        className
      )}
    >
      {container ? <div className={containerClasses}>{children}</div> : children}
    </section>
  );
}
