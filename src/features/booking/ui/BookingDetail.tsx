'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, Clock, Users, Info } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { AmenityWithStatus, TimeSlot } from '@entities/amenity';
import { AmenityBadge, statusToVariant } from '@entities/amenity';
import { generateTimeSlots, formatHours } from '@entities/amenity';
import { apiGet, apiPost } from '@/shared/api/http-client';
import { createComponentLogger } from '@/shared/lib';

const log = createComponentLogger('BookingDetail');

interface BookingDetailProps {
  amenity: AmenityWithStatus;
  onBack: () => void;
  onBookingSuccess: () => void;
}

interface DateOption {
  date: Date;
  dayName: string;
  dayNum: number;
  isToday: boolean;
}

export function BookingDetail({ amenity, onBack, onBookingSuccess }: BookingDetailProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Generate 5-7 days ahead
  const dateOptions = useMemo<DateOption[]>(() => {
    const days: DateOption[] = [];
    const today = new Date();
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      days.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        isToday: i === 0,
      });
    }
    
    return days;
  }, []);

  // Fetch existing bookings for the selected date
  const fetchExistingBookings = useCallback(async (date: Date) => {
    if (!amenity.bookable) return;
    
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const { data } = await apiGet<Array<{ startTime: string; endTime: string }>>(
        `/api/amenities/${amenity.id}/bookings?date=${dateStr}`
      );
      
      // Generate slots with booking info
      const slots = generateTimeSlots(
        amenity.hoursOpen,
        amenity.hoursClose,
        amenity.slotDurationMins || 60,
        date,
        data ?? []
      );
      
      setTimeSlots(slots);
    } catch (error) {
      log.error({}, 'Failed to fetch bookings', error);
      // Still generate slots without booking info
      const slots = generateTimeSlots(
        amenity.hoursOpen,
        amenity.hoursClose,
        amenity.slotDurationMins || 60,
        date,
        []
      );
      setTimeSlots(slots);
    } finally {
      setLoading(false);
    }
  }, [amenity]);

  useEffect(() => {
    fetchExistingBookings(selectedDate);
    setSelectedSlot(null);
  }, [selectedDate, fetchExistingBookings]);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    
    setSubmitting(true);
    try {
      await apiPost('/api/bookings', {
        amenityId: amenity.id,
        date: selectedDate.toISOString().split('T')[0],
        startTime: selectedSlot,
        endTime: calculateEndTime(selectedSlot, amenity.slotDurationMins || 60),
      });
      
      onBookingSuccess();
    } catch (error) {
      log.error({}, 'Failed to create booking', error);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateEndTime = (startTime: string, durationMins: number): string => {
    const [hours, mins] = startTime.split(':').map(Number);
    const totalMins = hours * 60 + mins + durationMins;
    const endHours = Math.floor(totalMins / 60);
    const endMins = totalMins % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const formatConfirmLabel = (): string => {
    if (!selectedSlot) return 'Confirm booking';
    
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = selectedDate.getDate();
    return `Confirm booking · ${dayName} ${dayNum}, ${selectedSlot}`;
  };

  const hoursText = formatHours(amenity.hoursOpen, amenity.hoursClose);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 mb-4 hover:text-gray-700"
      >
        <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
        Back to amenities
      </button>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header with icon/photo */}
        <div className="h-[140px] bg-green-100 flex items-center justify-center">
          {amenity.photoUrl ? (
            <img
              src={amenity.photoUrl}
              alt={amenity.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <i
              className={`ti ti-${amenity.icon} text-5xl text-green-600`}
              aria-hidden="true"
            />
          )}
        </div>

        <div className="p-4">
          {/* Title and status */}
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold">{amenity.name}</h2>
            <AmenityBadge
              text={amenity.statusText}
              variant={statusToVariant(amenity.computedStatus)}
            />
          </div>

          {/* Hours */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-0.5">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {hoursText} daily
          </div>

          {/* Occupancy and slot duration */}
          {(amenity.maxOccupancy || amenity.slotDurationMins) && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              {amenity.maxOccupancy && `Max ${amenity.maxOccupancy} people`}
              {amenity.maxOccupancy && amenity.slotDurationMins && ' · '}
              {amenity.slotDurationMins && `${amenity.slotDurationMins / 60} hour slots`}
            </div>
          )}

          <div className="border-t border-gray-200 my-3.5" />

          {/* Date selection */}
          <p className="text-sm text-gray-500 mb-2.5">Select a date</p>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {dateOptions.map(option => (
              <button
                key={option.date.toISOString()}
                onClick={() => setSelectedDate(option.date)}
                className={cn(
                  'flex-1 min-w-[60px] py-2 px-1 text-sm rounded-md border-2 transition',
                  selectedDate.toDateString() === option.date.toDateString()
                    ? 'border-indigo-600 text-indigo-600 font-medium'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                )}
              >
                <div>{option.dayName}</div>
                <div className="text-[15px]">{option.dayNum}</div>
              </button>
            ))}
          </div>

          {/* Time slot selection */}
          <p className="text-sm text-gray-500 mb-2.5">Select a time slot</p>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading slots...</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {timeSlots.map(slot => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && setSelectedSlot(slot.time)}
                  disabled={!slot.available}
                  className={cn(
                    'py-2 px-3 text-sm rounded-md border-2 transition',
                    !slot.available
                      ? 'text-gray-400 border-gray-100 cursor-not-allowed'
                      : selectedSlot === slot.time
                      ? 'border-indigo-600 text-indigo-600 font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  )}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}

          {/* Rules/info box */}
          {amenity.rulesText && (
            <div className="bg-gray-50 rounded-md p-2.5 text-sm text-gray-500 mb-4 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              {amenity.rulesText}
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={!selectedSlot || submitting}
            className={cn(
              'w-full py-2.5 text-sm font-medium rounded-md transition',
              selectedSlot && !submitting
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
          >
            {submitting ? 'Confirming...' : formatConfirmLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
