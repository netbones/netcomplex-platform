'use client';

interface CategoryBadgeProps {
  category: string;
  variant?: 'primary' | 'secondary';
}

export function CategoryBadge({ category, variant = 'primary' }: CategoryBadgeProps) {
  const getCategoryLabel = (cat: string) => {
    const categoryMap: Record<string, string> = {
      GARDENING: 'Gardening',
      MAINTENANCE: 'Maintenance',
      PLUMBING: 'Plumbing',
      ELECTRICAL: 'Electrical',
      CLEANING: 'Cleaning',
      SECURITY: 'Security',
      PEST_CONTROL: 'Pest Control',
      APPLIANCE_REPAIR: 'Appliance Repair',
      OTHER: 'Other',
    };
    return categoryMap[cat] || cat;
  };

  const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
  const variantClasses =
    variant === 'primary' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700';

  return <span className={`${baseClasses} ${variantClasses}`}>{getCategoryLabel(category)}</span>;
}
