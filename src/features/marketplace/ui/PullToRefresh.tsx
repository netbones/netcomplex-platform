'use client';

import { useState, useRef, useCallback } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const REFRESH_THRESHOLD = 60; // px

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  return (
    <div
      onTouchStart={e => {
        if (window.scrollY === 0) {
          startY.current = e.touches[0].clientY;
        }
      }}
      onTouchMove={e => {
        if (refreshing) return;
        if (startY.current === 0) return;
        const delta = e.touches[0].clientY - startY.current;
        if (delta > 0 && window.scrollY === 0) {
          setPullDistance(Math.min(delta * 0.4, 80));
        }
      }}
      onTouchEnd={() => {
        if (pullDistance > REFRESH_THRESHOLD && !refreshing) {
          void handleRefresh();
        } else {
          setPullDistance(0);
        }
        startY.current = 0;
      }}
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Pull indicator */}
      {pullDistance > 0 && (
        <div className="flex justify-center py-2" style={{ height: pullDistance }}>
          <div
            className={`w-6 h-6 border-2 border-soralia-primary border-t-transparent rounded-full ${refreshing ? 'animate-spin' : ''}`}
          />
        </div>
      )}
      {children}
    </div>
  );
}
