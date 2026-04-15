'use client';

interface ReviewStarsProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ReviewStars({ rating, max = 5, size = 'md' }: ReviewStarsProps) {
  const sizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-base';

  return (
    <div className={`flex items-center gap-0.5 ${sizeClass}`}>
      {[...Array(max)].map((_, i) => (
        <i
          key={i}
          className={`${
            i < Math.floor(rating)
              ? 'fas fa-star text-yellow-400'
              : i < rating
                ? 'fas fa-star-half-alt text-yellow-400'
                : 'far fa-star text-gray-300'
          }`}
        ></i>
      ))}
    </div>
  );
}
