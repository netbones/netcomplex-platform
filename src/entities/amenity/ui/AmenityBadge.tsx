'use client';

import { cn } from '@/shared/lib/utils';

export type BadgeVariant = 
  | 'success'   // Open
  | 'warning'   // Closes soon
  | 'danger'    // Fully booked, Booked today
  | 'neutral';  // Always open, Closed

interface AmenityBadgeProps {
  text: string;
  variant: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-gray-50 text-gray-600 border-gray-200',
};

export function AmenityBadge({ text, variant, className }: AmenityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border',
        variantStyles[variant],
        className
      )}
    >
      {text}
    </span>
  );
}

/**
 * Map status to badge variant
 */
export function statusToVariant(status: string): BadgeVariant {
  switch (status) {
    case 'open':
      return 'success';
    case 'closes_soon':
      return 'warning';
    case 'fully_booked':
    case 'booked_today':
      return 'danger';
    case 'always_open':
    case 'closed':
    default:
      return 'neutral';
  }
}
