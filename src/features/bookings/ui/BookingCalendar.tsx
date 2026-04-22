'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Facility, Booking } from '@entities/booking';
import { VALID_FACILITIES } from '@entities/booking';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('BookingCalendar');

interface BookingCalendarProps {
  selectedFacility?: Facility | null;
  onDateSelect?: (date: Date, facility: Facility) => void;
  onSlotSelect?: (date: Date, facility: Facility) => void;
}

interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  bookings: Booking[];
}

const TIME_SLOTS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

export function BookingCalendar({
  selectedFacility,
  onDateSelect,
  onSlotSelect,
}: BookingCalendarProps) {
  const { t } = useTranslation(['common', 'bookings']);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<Facility | null>(null);

  useEffect(() => {
    if (selectedFacility) {
      setFacility(selectedFacility);
    }
  }, [selectedFacility]);

  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayData[] = [];
    const startPadding = firstDay.getDay();

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        bookings: [],
      });
    }

    // Current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const dayBookings = bookings.filter((b: Booking) => {
        const bDate = new Date(b.date).toISOString().split('T')[0];
        return bDate === dateStr && b.facility === facility;
      });

      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        bookings: dayBookings,
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        bookings: [],
      });
    }

    return days;
  }, [currentDate, bookings, facility]);

  useEffect(() => {
    async function fetchBookings() {
      if (!facility) return;

      setLoading(true);
      try {
        const params = new URLSearchParams({ facility });
        const res = await fetch(`/api/bookings?${params}`);
        const data = await res.json();
        setBookings(data);
      } catch (error) {
        log.error({}, 'Failed to fetch bookings', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [facility]);

  const handleDateClick = (day: DayData) => {
    if (!day.isCurrentMonth) return;
    setSelectedDate(day.date);
    onDateSelect?.(day.date, facility!);
  };

  const getDayColor = (day: DayData): string => {
    if (!day.isCurrentMonth) return 'text-gray-300';

    if (day.isToday) return 'font-bold text-soralia-primary';

    if (day.bookings.length > 0) {
      // Fully booked (all slots taken)
      if (day.bookings.length >= TIME_SLOTS.length) {
        return 'text-red-600 bg-red-50';
      }
      // Partially booked
      return 'text-orange-600 bg-orange-50';
    }

    // Available
    return 'text-green-600';
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Facility Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('bookings:selectFacility')}
        </label>
        <select
          value={facility || ''}
          onChange={e => setFacility(e.target.value as Facility)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        >
          <option value="">{t('bookings:selectFacilityPlaceholder')}</option>
          {VALID_FACILITIES.map(f => (
            <option key={f} value={f}>
              {f.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
          }
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button
          onClick={() =>
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
          }
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          →
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthData.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(day)}
            disabled={!day.isCurrentMonth}
            className={`
              p-2 text-sm rounded-lg transition
              ${getDayColor(day)}
              ${!day.isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}
              ${selectedDate?.getTime() === day.date.getTime() ? 'ring-2 ring-soralia-primary' : ''}
            `}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
          <span>{t('bookings:available')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-orange-50 border border-orange-300" />
          <span>{t('bookings:partial')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-300" />
          <span>{t('bookings:full')}</span>
        </div>
      </div>

      {/* Time Slots (when date selected) */}
      {selectedDate && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-md font-medium mb-4">
            {t('bookings:selectTime')} - {selectedDate.toLocaleDateString()}
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {TIME_SLOTS.map(slot => {
              const isBooked = bookings.some(
                (b: Booking) =>
                  b.startTime === slot &&
                  new Date(b.date).toISOString().split('T')[0] ===
                    selectedDate.toISOString().split('T')[0]
              );
              return (
                <button
                  key={slot}
                  disabled={isBooked}
                  onClick={() => onSlotSelect?.(selectedDate, facility!)}
                  className={`
                    px-3 py-2 text-sm rounded-lg border
                    ${
                      isBooked
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                        : 'border-gray-300 hover:border-soralia-primary hover:bg-soralia-primary/5'
                    }
                  `}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
