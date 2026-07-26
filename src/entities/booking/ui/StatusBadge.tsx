'use client';

import { Badge } from '@shared/ui/badge';
import type { BookingStatus } from '../model/types';
import { BOOKING_STATUS_COLORS } from '../model/constants';

interface StatusBadgeProps {
  status: BookingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = BOOKING_STATUS_COLORS[status] || BOOKING_STATUS_COLORS.CONFIRMED;

  return <Badge className={`border-0 font-medium ${colors.bg} ${colors.text}`}>{status}</Badge>;
}
