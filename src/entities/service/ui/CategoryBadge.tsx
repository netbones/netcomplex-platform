'use client';

import { Badge } from '@shared/ui/badge';

interface CategoryBadgeProps {
  category: string;
  variant?: 'primary' | 'secondary';
}

export function CategoryBadge({ category, variant = 'primary' }: CategoryBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`rounded border-0 px-2 py-0.5 text-xs font-medium capitalize ${
        variant === 'primary' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
      }`}
    >
      {category.replace('_', ' ')}
    </Badge>
  );
}
