'use client';

import type { DisputeCategory } from '../model/types';
import { CATEGORY_LABELS } from '../model/constants';

interface DisputeCategoryBadgeProps {
  category: DisputeCategory;
  className?: string;
}

export function DisputeCategoryBadge({ category, className = '' }: DisputeCategoryBadgeProps) {
  const label = CATEGORY_LABELS[category];

  return (
    <span
      className={`inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 ${className}`}
    >
      {label}
    </span>
  );
}
