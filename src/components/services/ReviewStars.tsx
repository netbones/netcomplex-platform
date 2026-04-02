'use client';

interface ReviewStarsProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export function ReviewStars({ rating, size = 'md', showValue = false }: ReviewStarsProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const starSize = sizeClasses[size];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {/* Full stars */}
      {Array.from({ length: fullStars }, (_, i) => (
        <i
          key={`full-${i}`}
          className={`fas fa-star text-yellow-400 ${starSize}`}
          aria-hidden="true"
        />
      ))}

      {/* Half star */}
      {hasHalfStar && (
        <i className={`fas fa-star-half-alt text-yellow-400 ${starSize}`} aria-hidden="true" />
      )}

      {/* Empty stars */}
      {Array.from({ length: emptyStars }, (_, i) => (
        <i
          key={`empty-${i}`}
          className={`far fa-star text-gray-300 ${starSize}`}
          aria-hidden="true"
        />
      ))}

      {showValue && <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>}
    </div>
  );
}
