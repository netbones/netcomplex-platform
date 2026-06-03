'use client';

import { useSafeTranslation } from '@features/i18n/model/useTranslation';

interface TagCloudProps {
  tags: string[];
  maxDisplay?: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function TagCloud({ tags, maxDisplay = 5, className = '', size = 'small' }: TagCloudProps) {
  const { tx } = useSafeTranslation('common');

  if (!tags || tags.length === 0) {
    return null;
  }

  const displayTags = tags.slice(0, maxDisplay);
  const remainingCount = tags.length - maxDisplay;

  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  };

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <span className="text-gray-500 mr-1">
        <i className="fas fa-tags text-xs"></i>
      </span>
      {displayTags.map(tag => (
        <span
          key={tag}
          className={`${sizeClasses[size]} text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-full`}
        >
          #{tag}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className={`${sizeClasses[size]} text-gray-500`}>
          +{remainingCount} {tx('more', 'more')}
        </span>
      )}
    </div>
  );
}
