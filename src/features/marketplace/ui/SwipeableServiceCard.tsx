'use client';

import { useState, useRef } from 'react';
import { ServiceCard, type ServiceListing } from '@entities/service';

interface SwipeableServiceCardProps {
  service: ServiceListing;
  onInquire: (serviceId: string) => void;
  onBook: (serviceId: string) => void;
}

export function SwipeableServiceCard({ service, onInquire, onBook }: SwipeableServiceCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const translateXRef = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const isSwiping = useRef(false);
  const isHorizontalSwipe = useRef(false);
  const SWIPE_THRESHOLD = 80;

  const updateTranslateX = (value: number) => {
    translateXRef.current = value;
    setTranslateX(value);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isSwiping.current = true;
    isHorizontalSwipe.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    // Pitfall 5: Only activate horizontal swipe after direction lock
    if (!isHorizontalSwipe.current) {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isHorizontalSwipe.current = true;
      } else {
        return; // vertical scroll — do not intercept
      }
    }

    if (isHorizontalSwipe.current) {
      // Clamp swipe range to prevent excessive movement
      const clamped = Math.max(-SWIPE_THRESHOLD * 1.5, Math.min(SWIPE_THRESHOLD * 1.5, deltaX));
      updateTranslateX(clamped);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    isSwiping.current = false;

    // Use the final touch position to determine delta (not stale state from touchMove)
    if (isHorizontalSwipe.current) {
      const finalDeltaX = e.changedTouches[0].clientX - startX.current;

      if (finalDeltaX > SWIPE_THRESHOLD) {
        // D-13: swipe right = Inquire (blue)
        onInquire(service.id);
      } else if (finalDeltaX < -SWIPE_THRESHOLD) {
        // D-13: swipe left = Book (green)
        onBook(service.id);
      }
    }

    // Snap back to neutral
    updateTranslateX(0);
    isHorizontalSwipe.current = false;
  };

  // Action indicators shown based on swipe direction
  const showInquireHint = translateX > 20;
  const showBookHint = translateX < -20;

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ touchAction: 'pan-y' }}>
      {/* Inquire action hint (swipe right) — blue per D-13 */}
      {showInquireHint && (
        <div
          className="absolute inset-y-0 left-0 w-20 bg-blue-500 flex items-center justify-center rounded-l-lg z-0 min-h-[44px]"
          data-swipe-action="inquire"
        >
          <span className="text-white text-xs font-semibold">Inquire</span>
        </div>
      )}

      {/* Book action hint (swipe left) — green per D-13 */}
      {showBookHint && (
        <div
          className="absolute inset-y-0 right-0 w-20 bg-green-500 flex items-center justify-center rounded-r-lg z-0 min-h-[44px]"
          data-swipe-action="book"
        >
          <span className="text-white text-xs font-semibold">Book</span>
        </div>
      )}

      {/* Card content with transform */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 bg-white transition-transform duration-200"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <ServiceCard service={service} onInquiry={onInquire} />
      </div>
    </div>
  );
}
