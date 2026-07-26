'use client';

import { type ComponentProps, useState } from 'react';
import { Calendar } from '@shared/ui/calendar';

const now = new Date();

const bookedDays = [
  new Date(now.getFullYear(), now.getMonth(), 7),
  new Date(now.getFullYear(), now.getMonth(), 15),
  new Date(now.getFullYear(), now.getMonth(), 23),
];

const CalendarTwo = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const modifiers = {
    booked: bookedDays,
  };

  const modifiersStyles: ComponentProps<typeof Calendar>['modifiersStyles'] = {
    booked: {
      backgroundColor: 'var(--color-amber-200)',
      color: 'var(--color-amber-900)',
      fontWeight: 'bold',
    },
  };

  return (
    <div className="flex items-center justify-center px-4">
      <Calendar
        className="rounded-md border"
        mode="single"
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        onSelect={setDate}
        selected={date}
      />
    </div>
  );
};

export default CalendarTwo;
