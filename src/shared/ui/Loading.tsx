'use client';

import { cn } from '@shared/lib';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable loading spinner component
 */
export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
}

/**
 * Reusable loading skeleton component
 */
export function LoadingSkeleton({ className, lines = 1, height = 'h-4' }: LoadingSkeletonProps) {
  if (lines === 1) {
    return (
      <div
        className={cn('animate-pulse bg-gray-200 rounded', height, className)}
        role="status"
        aria-label="Loading"
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className={cn('animate-pulse bg-gray-200 rounded', height)} />
      ))}
    </div>
  );
}

interface LoadingCardProps {
  className?: string;
  titleLines?: number;
  contentLines?: number;
}

/**
 * Loading skeleton for card-like components
 */
export function LoadingCard({
  className,
  titleLines: _titleLines = 1,
  contentLines = 3,
}: LoadingCardProps) {
  return (
    <div className={cn('p-6 border border-gray-200 rounded-lg bg-white', className)}>
      <LoadingSkeleton height="h-6" className="w-3/4 mb-4" />
      <LoadingSkeleton lines={contentLines} height="h-4" className="mb-2" />
    </div>
  );
}

interface LoadingButtonProps {
  className?: string;
  width?: string;
}

/**
 * Loading skeleton for buttons
 */
export function LoadingButton({ className, width = 'w-24' }: LoadingButtonProps) {
  return <LoadingSkeleton className={cn('h-10 rounded', width, className)} />;
}
