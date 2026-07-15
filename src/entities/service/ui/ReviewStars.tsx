'use client';

import { Star, StarHalf } from 'lucide-react';

interface ReviewStarsProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ReviewStars({ rating, max = 5, size = 'md' }: ReviewStarsProps) {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className={`flex items-center gap-0.5`}>
      {[...Array(max)].map((_, i) => {
        if (i < Math.floor(rating)) {
          return <Star key={i} className={`${sizeClass} text-yellow-400 fill-yellow-400`} />;
        } else if (i < rating) {
          return <StarHalf key={i} className={`${sizeClass} text-yellow-400 fill-yellow-400`} />;
        }
        return <Star key={i} className={`${sizeClass} text-gray-300`} />;
      })}
    </div>
  );
}
