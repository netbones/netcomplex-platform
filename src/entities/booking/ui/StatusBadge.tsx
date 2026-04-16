'use client';

import type { BookingStatus } from '../model/types';
import { BOOKING_STATUS_COLORS } from '../model/constants';

interface StatusBadgeProps {
  status: BookingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = BOOKING_STATUS_COLORS[status] || BOOKING_STATUS_COLORS.CONFIRMED;

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors.bg} ${colors.text}`}>{status}</span>
  );
}
