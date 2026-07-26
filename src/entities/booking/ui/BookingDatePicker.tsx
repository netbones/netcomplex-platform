'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { Button } from '@shared/ui/button';
import { Calendar } from '@shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';

interface BookingDatePickerProps {
  onSelect: (date: string) => void;
  selectedDate?: string;
}

export function BookingDatePicker({ onSelect, selectedDate }: BookingDatePickerProps) {
  const [open, setOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDateObj = selectedDate
    ? new Date(
        Number(selectedDate.split('-')[0]),
        Number(selectedDate.split('-')[1]) - 1,
        Number(selectedDate.split('-')[2])
      )
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDateObj!, 'PPP') : <span>Select a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDateObj}
          onSelect={date => {
            if (date) {
              onSelect(date.toISOString().split('T')[0]);
              setOpen(false);
            }
          }}
          disabled={{ before: today }}
        />
      </PopoverContent>
    </Popover>
  );
}
