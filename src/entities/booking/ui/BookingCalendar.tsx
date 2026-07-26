'use client';

import { useState, useMemo } from 'react';
import { Calendar } from '@shared/ui/calendar';
import type { Booking } from '@entities/booking';
import { FacilityBadge, StatusBadge } from '@entities/booking';

interface BookingCalendarProps {
  bookings: Booking[];
  onSelectDate?: (date: string) => void;
}

export function BookingCalendar({ bookings, onSelectDate }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const bookingDates = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const dateStr =
        typeof b.date === 'string' ? b.date.split('T')[0] : b.date.toISOString().split('T')[0];
      const existing = map.get(dateStr) || [];
      existing.push(b);
      map.set(dateStr, existing);
    }
    return map;
  }, [bookings]);

  const bookedDays = useMemo(
    () =>
      Array.from(bookingDates.keys()).map(d => {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day);
      }),
    [bookingDates]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedBookings = selectedDate ? bookingDates.get(selectedDate) || [] : [];

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = date.toISOString().split('T')[0];
    if (!bookingDates.has(dateStr)) return;
    setSelectedDate(dateStr);
    onSelectDate?.(dateStr);
  };

  const selectedDateObj = selectedDate
    ? new Date(
        Number(selectedDate.split('-')[0]),
        Number(selectedDate.split('-')[1]) - 1,
        Number(selectedDate.split('-')[2])
      )
    : undefined;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <Calendar
          mode="single"
          selected={selectedDateObj}
          onSelect={handleSelect}
          disabled={{ before: today }}
          modifiers={{ booked: bookedDays }}
          modifiersStyles={{
            booked: {
              backgroundColor: 'var(--color-blue-200)',
              color: 'var(--color-blue-900)',
              fontWeight: 'bold',
              borderRadius: '9999px',
            },
          }}
          className="rounded-md border-0"
        />
      </div>

      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold mb-3">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          {selectedBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No bookings for this date.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedBookings.map(booking => (
                <div key={booking.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-2">
                    <FacilityBadge facility={booking.facility} />
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {booking.startTime} - {booking.endTime}
                  </p>
                  {booking.purpose && (
                    <p className="text-xs text-gray-600 mt-1">{booking.purpose}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
