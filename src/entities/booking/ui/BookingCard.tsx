'use client';

import type { Booking } from '../model/types';
import { FacilityBadge } from './FacilityBadge';
import { StatusBadge } from './StatusBadge';

interface BookingCardProps {
  booking: Booking;
}

export function BookingCard({ booking }: BookingCardProps) {
  const date = typeof booking.date === 'string' ? new Date(booking.date) : booking.date;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-2">
        <FacilityBadge facility={booking.facility} />
        <StatusBadge status={booking.status} />
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-gray-900 font-medium">{date.toLocaleDateString()}</p>
        <p className="text-gray-500">
          {booking.startTime} - {booking.endTime}
        </p>
        {booking.purpose && <p className="text-gray-600 text-xs mt-2">{booking.purpose}</p>}
      </div>
    </div>
  );
}
