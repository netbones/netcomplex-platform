'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { apiGet, apiDelete } from '@/shared/api/http-client';
import { createComponentLogger } from '@/shared/lib';
import {
  AMENITY_ICON_COLORS,
  formatDateKey,
  parseDateKey,
  type AmenityWithStatus,
} from '@entities/amenity';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';

const log = createComponentLogger('MyBookingsTab');

type BookingStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

interface MyBooking {
  id: string;
  amenityId: string | null;
  status: BookingStatus;
  date: string | Date;
  startTime: string;
  endTime: string;
  cancelledAt: string | Date | null;
  purpose: string | null;
  amenityName: string | null;
  amenityIcon: string | null;
}

const STATUS_STYLES: Record<BookingStatus, { bg: string; text: string; label: string }> = {
  CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
  WAITLISTED: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Waitlisted' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' },
  NO_SHOW: { bg: 'bg-red-100', text: 'text-red-800', label: 'No-show' },
};

/** Local calendar date key from API date (string or Date), avoiding UTC shift. */
function bookingDateKey(date: string | Date): string {
  if (typeof date === 'string') {
    // "YYYY-MM-DD" or ISO — take the date portion
    const m = date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    return formatDateKey(new Date(date));
  }
  return formatDateKey(date);
}

/**
 * True when the booking slot has ended (or status already terminal).
 * CONFIRMED/WAITLISTED rows from yesterday must land in Past even before
 * an automated COMPLETED/NO_SHOW transition exists.
 */
function isPastBooking(booking: MyBooking, now: Date = new Date()): boolean {
  if (
    booking.status === 'COMPLETED' ||
    booking.status === 'NO_SHOW' ||
    booking.status === 'CANCELLED'
  ) {
    return true;
  }

  const key = bookingDateKey(booking.date);
  const day = parseDateKey(key);
  const [endH, endM] = (booking.endTime || '23:59').split(':').map(Number);
  const endsAt = new Date(day);
  endsAt.setHours(endH || 0, endM || 0, 0, 0);
  return endsAt.getTime() <= now.getTime();
}

interface MyBookingsTabProps {
  amenities: AmenityWithStatus[];
  onBookAgain: (amenity: AmenityWithStatus) => void;
}

export function MyBookingsTab({ amenities, onBookAgain }: MyBookingsTabProps) {
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await apiGet<MyBooking[]>('/api/amenities/bookings');
      setBookings(data ?? []);
    } catch (error) {
      log.error({}, 'Failed to fetch my bookings', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = useCallback(
    async (booking: MyBooking) => {
      if (!confirm(`Cancel your ${booking.amenityName ?? 'booking'} booking?`)) return;
      try {
        await apiDelete(`/api/bookings/${booking.id}`);
        toast.success('Booking cancelled');
        await fetchBookings();
      } catch (error) {
        log.error({}, 'Failed to cancel booking', error);
        toast.error('Failed to cancel booking');
      }
    },
    [fetchBookings]
  );

  const handleBookAgain = useCallback(
    (booking: MyBooking) => {
      const amenity = amenities.find(a => a.id === booking.amenityId);
      if (amenity) {
        onBookAgain(amenity);
      } else {
        toast.error('Amenity no longer available');
      }
    },
    [amenities, onBookAgain]
  );

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcomingList: MyBooking[] = [];
    const pastList: MyBooking[] = [];
    for (const b of bookings) {
      if ((b.status === 'CONFIRMED' || b.status === 'WAITLISTED') && !isPastBooking(b, now)) {
        upcomingList.push(b);
      } else if (isPastBooking(b, now)) {
        pastList.push(b);
      }
    }
    return { upcoming: upcomingList, past: pastList };
  }, [bookings]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading bookings...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section>
          <p className="text-sm text-gray-500 mb-2.5">Upcoming</p>
          <div className="flex flex-col gap-2.5">
            {upcoming.map(b => (
              <BookingRow
                key={b.id}
                booking={b}
                past={false}
                onCancel={() => handleCancel(b)}
                onBookAgain={() => handleBookAgain(b)}
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="text-sm text-gray-500 mb-2.5">Past</p>
          <div className="flex flex-col gap-2.5">
            {past.map(b => (
              <BookingRow
                key={b.id}
                booking={b}
                past
                onCancel={() => handleCancel(b)}
                onBookAgain={() => handleBookAgain(b)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingRow({
  booking,
  past,
  onCancel,
  onBookAgain,
}: {
  booking: MyBooking;
  past: boolean;
  onCancel: () => void;
  onBookAgain: () => void;
}) {
  const icon = booking.amenityIcon ?? 'default';
  const colors = AMENITY_ICON_COLORS[icon] ?? AMENITY_ICON_COLORS.default;
  const statusStyle = STATUS_STYLES[booking.status] ?? STATUS_STYLES.CONFIRMED;
  const date = parseDateKey(bookingDateKey(booking.date));
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl px-3.5 py-3 flex items-center gap-3',
        past && 'opacity-70'
      )}
    >
      <div
        className={cn('w-11 h-11 min-w-11 rounded-lg flex items-center justify-center', colors.bg)}
      >
        <i
          className={cn('ti', `ti-${booking.amenityIcon ?? 'building'}`, 'text-xl', colors.text)}
          aria-hidden="true"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 truncate">
          {booking.amenityName ?? 'Facility'}
        </div>
        <div className="text-[13px] text-gray-500">
          {dateLabel}, {booking.startTime} – {booking.endTime}
        </div>
      </div>

      <span
        className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap',
          statusStyle.bg,
          statusStyle.text
        )}
      >
        {statusStyle.label}
      </span>

      {past ? (
        <button
          onClick={onBookAgain}
          className="text-[13px] px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
        >
          Book again
        </button>
      ) : (
        <button
          onClick={onCancel}
          aria-label="Cancel booking"
          className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
