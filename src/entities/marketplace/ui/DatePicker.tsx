'use client';

import { useState, useMemo } from 'react';

interface DatePickerProps {
  availability: Record<string, { start: string; end: string }[]>;
  onSelect: (date: string) => void;
  bookedDates?: string[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DatePicker({ availability, onSelect }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { date: string; available: boolean; isPast: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) {
      result.push({ date: '', available: false, isPast: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayName = DAY_NAMES[new Date(year, month, d).getDay()].toLowerCase();
      const hasSlots = (availability[dayName]?.length || 0) > 0;
      result.push({ date: dateStr, available: hasSlots, isPast: dateStr < today });
    }
    return result;
  }, [currentMonth, availability, today]);

  const handleSelect = (date: string) => {
    setSelectedDate(date);
    onSelect(date);
  };

  return (
    <div className="p-4">
      {/* Month navigation */}
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

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-1">
            {d}
          </div>
        ))}

        {/* Day cells */}
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            disabled={!d.available || d.isPast}
            onClick={() => d.available && handleSelect(d.date)}
            className={`min-w-[44px] min-h-[44px] rounded-lg text-sm
              ${!d.date ? 'invisible' : ''}
              ${d.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
              ${!d.available && !d.isPast ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : ''}
              ${d.available && !d.isPast ? 'bg-soralia-primary/10 text-soralia-primary hover:bg-soralia-primary/20 font-medium' : ''}
              ${selectedDate === d.date ? 'ring-2 ring-soralia-primary' : ''}
            `}
          >
            {d.date ? parseInt(d.date.split('-')[2]) : ''}
          </button>
        ))}
      </div>
    </div>
  );
}
