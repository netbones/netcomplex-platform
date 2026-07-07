'use client';

import { useState, useMemo } from 'react';
import type { Booking } from '@entities/booking';
import { FacilityBadge, StatusBadge } from '@entities/booking';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface BookingCalendarProps {
  bookings: Booking[];
  onSelectDate?: (date: string) => void;
}

export function BookingCalendar({ bookings, onSelectDate }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];
    const result: { date: string; isPast: boolean; isToday: boolean; count: number }[] = [];

    for (let i = 0; i < firstDay; i++) {
      result.push({ date: '', isPast: true, isToday: false, count: 0 });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const count = bookingDates.get(dateStr)?.length ?? 0;
      result.push({ date: dateStr, isPast: dateStr < today, isToday: dateStr === today, count });
    }
    return result;
  }, [currentMonth, bookingDates]);

  const selectedBookings = selectedDate ? bookingDates.get(selectedDate) || [] : [];

  const handleSelect = (date: string) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
            }
            className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100"
            aria-label="Previous month"
          >
            ←
          </button>
          <h3 className="font-semibold text-lg">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
            }
            className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs text-gray-500 py-1">
              {d}
            </div>
          ))}

          {days.map((d, i) => (
            <button
              key={i}
              type="button"
              disabled={d.isPast || !d.date}
              onClick={() => d.date && d.count > 0 && handleSelect(d.date)}
              className={`relative min-w-[44px] min-h-[44px] rounded-lg text-sm transition
                ${!d.date ? 'invisible' : ''}
                ${
                  d.isPast
                    ? 'text-gray-300 cursor-not-allowed'
                    : d.isToday
                      ? 'bg-soralia-primary/10 font-bold text-soralia-primary'
                      : d.count > 0
                        ? 'hover:bg-soralia-primary/10 cursor-pointer'
                        : 'text-gray-400'
                }
                ${selectedDate === d.date ? 'ring-2 ring-soralia-primary' : ''}
              `}
            >
              <span>{d.date ? parseInt(d.date.split('-')[2]) : ''}</span>
              {d.count > 0 && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {d.count <= 3 ? (
                    Array.from({ length: d.count }).map((_, j) => (
                      <span key={j} className="w-1 h-1 rounded-full bg-soralia-primary" />
                    ))
                  ) : (
                    <span className="text-[10px] text-soralia-primary font-bold">{d.count}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
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
