'use client';

import { Badge } from '@shared/ui/badge';
import type { DisputeCategory } from '../model/types';
import { CATEGORY_LABELS } from '../model/constants';

interface DisputeCategoryBadgeProps {
  category: DisputeCategory;
  className?: string;
}

export function DisputeCategoryBadge({ category, className = '' }: DisputeCategoryBadgeProps) {
  const label = CATEGORY_LABELS[category];

  return (
    <Badge
      variant="outline"
      className={`rounded-md border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ${className}`}
    >
      {label}
    </Badge>
  );
}
