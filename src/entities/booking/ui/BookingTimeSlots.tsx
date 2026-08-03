'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createComponentLogger } from '@shared/lib';
import { apiGet } from '@/shared/api/http-client';

const log = createComponentLogger('BookingTimeSlots');

interface BookedSlot {
  startTime: string;
  endTime: string;
}

interface BookingTimeSlotsProps {
  facility: string;
  date: string;
  onSelect: (startTime: string, endTime: string) => void;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const SLOT_START = timeToMinutes('06:00');
const SLOT_END = timeToMinutes('22:00');

export function BookingTimeSlots({ facility, date, onSelect }: BookingTimeSlotsProps) {
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiGet<{ bookedSlots?: BookedSlot[] }>(
        `/api/bookings/availability?facility=${encodeURIComponent(facility)}&date=${date}`
      );
      setBookedSlots(data?.bookedSlots ?? []);
    } catch (err) {
      log.error({}, 'Failed to fetch facility availability', err);
    } finally {
      setLoading(false);
    }
  }, [facility, date]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const allSlots = useMemo(() => {
    const slots: { start: string; end: string; booked: boolean }[] = [];

    for (let current = SLOT_START; current + 30 <= SLOT_END; current += 30) {
      const startStr = minutesToTime(current);
      const endStr = minutesToTime(current + 30);

      const isBooked = bookedSlots.some(bs => startStr < bs.endTime && endStr > bs.startTime);

      slots.push({ start: startStr, end: endStr, booked: isBooked });
    }

    return slots;
  }, [bookedSlots]);

  const handleSelect = (slot: { start: string; end: string }) => {
    setSelectedStart(slot.start);
    onSelect(slot.start, slot.end);
  };

  const dateObj = new Date(date + 'T00:00:00');

  if (loading) {
    return (
      <div className="p-4 text-center py-8">
        <p className="text-gray-500">Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h4 className="font-semibold">
          {dateObj.toLocaleDateString('default', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h4>
        <p className="text-sm text-gray-500">Available time slots</p>
      </div>

      {allSlots.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {allSlots.map((slot, i) => (
            <button
              key={i}
              type="button"
              disabled={slot.booked}
              onClick={() => handleSelect(slot)}
              className={`min-w-[44px] min-h-[44px] rounded-lg text-sm py-2 px-3 transition
                ${
                  slot.booked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                    : selectedStart === slot.start
                      ? 'bg-soralia-primary text-white ring-2 ring-soralia-primary'
                      : 'border border-soralia-primary/30 text-soralia-primary hover:bg-soralia-primary/10'
                }
              `}
            >
              {slot.start}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center py-8 text-gray-500">No time slots available.</p>
      )}
    </div>
  );
}
