'use client';

import { useState, useMemo } from 'react';

interface BookingDatePickerProps {
  onSelect: (date: string) => void;
  selectedDate?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BookingDatePicker({ onSelect, selectedDate }: BookingDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date().toISOString().split('T')[0];

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { date: string; isPast: boolean; isToday: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) {
      result.push({ date: '', isPast: true, isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push({ date: dateStr, isPast: dateStr < today, isToday: dateStr === today });
    }
    return result;
  }, [currentMonth, today]);

  return (
    <div className="p-4">
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
        <h3 className="font-semibold">
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
            onClick={() => d.date && onSelect(d.date)}
            className={`min-w-[44px] min-h-[44px] rounded-lg text-sm transition
              ${!d.date ? 'invisible' : ''}
              ${
                d.isPast
                  ? 'text-gray-300 cursor-not-allowed'
                  : d.isToday
                    ? 'bg-soralia-primary text-white font-bold'
                    : 'hover:bg-soralia-primary/10 text-gray-700'
              }
              ${
                selectedDate === d.date && !d.isToday
                  ? 'bg-soralia-primary/20 ring-2 ring-soralia-primary font-medium'
                  : ''
              }
            `}
          >
            {d.date ? parseInt(d.date.split('-')[2]) : ''}
          </button>
        ))}
      </div>
    </div>
  );
}
