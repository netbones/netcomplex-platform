'use client';

interface CategoryBadgeProps {
  category: string;
  variant?: 'primary' | 'secondary';
}

export function CategoryBadge({ category, variant = 'primary' }: CategoryBadgeProps) {
  const isPrimary = variant === 'primary';

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
        isPrimary ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
      }`}
    >
      {category.replace('_', ' ')}
    </span>
  );
}
