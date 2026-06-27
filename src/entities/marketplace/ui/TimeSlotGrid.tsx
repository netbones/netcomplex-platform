'use client';

import { useMemo } from 'react';

interface TimeSlotGridProps {
  availability: Record<string, { start: string; end: string }[]>;
  date: string;
  bookedSlots: { startTime: string; endTime: string }[];
  onSelect: (slot: { start: string; end: string }) => void;
  onBack: () => void;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Parse "HH:MM" string into total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Format total minutes since midnight to "HH:MM" string.
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function TimeSlotGrid({
  availability,
  date,
  bookedSlots,
  onSelect,
  onBack,
}: TimeSlotGridProps) {
  const dateObj = new Date(date + 'T00:00:00');
  const dayName = DAY_NAMES[dateObj.getDay()];
  const dayRanges = availability[dayName] || [];

  // Generate 30-minute slots from availability ranges
  const allSlots = useMemo(() => {
    const slots: { start: string; end: string; booked: boolean }[] = [];

    for (const range of dayRanges) {
      let current = timeToMinutes(range.start);
      const end = timeToMinutes(range.end);

      while (current + 30 <= end) {
        const startStr = minutesToTime(current);
        const endStr = minutesToTime(current + 30);

        // Check if this slot overlaps with any booked slot
        const isBooked = bookedSlots.some(bs => bs.startTime === startStr && bs.endTime === endStr);

        slots.push({ start: startStr, end: endStr, booked: isBooked });
        current += 30;
      }
    }

    return slots;
  }, [dayRanges, bookedSlots]);

  return (
    <div className="p-4">
      {/* Back button + date header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Go back"
        >
          ←
        </button>
        <div>
          <h3 className="font-semibold text-lg">Select Time</h3>
          <p className="text-sm text-gray-500">
            {dateObj.toLocaleDateString('default', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Time slot grid */}
      {allSlots.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {allSlots.map((slot, i) => (
            <button
              key={i}
              type="button"
              disabled={slot.booked}
              onClick={() => onSelect({ start: slot.start, end: slot.end })}
              className={`min-w-[44px] min-h-[44px] rounded-lg text-sm py-2 px-3
                ${
                  slot.booked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                    : 'border border-soralia-primary/30 text-soralia-primary hover:bg-soralia-primary/10'
                }
              `}
            >
              {slot.start}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No available time slots for this day.</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 text-soralia-primary text-sm underline min-h-[44px]"
          >
            Choose a different date
          </button>
        </div>
      )}
    </div>
  );
}
