import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContainerLayoutProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  center?: boolean;
}

/**
 * ContainerLayout provides consistent max-width containers
 * for content sections. Follows NetComplex responsive design.
 */
export function ContainerLayout({
  children,
  className,
  size = 'lg',
  center = false,
}: ContainerLayoutProps) {
  const sizeClasses = {
    sm: 'max-w-4xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        center && 'flex flex-col items-center justify-center text-center',
        className
      )}
    >
      {children}
    </div>
  );
}
