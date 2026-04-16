'use client';

import { useState, useCallback } from 'react';
import type { BookingFormData, Booking } from '@entities/booking';
import { VALID_FACILITIES, FACILITY_LABELS } from '@entities/booking';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('useBookings');

interface UseBookingsOptions {
  onBookingCreated?: (booking: Booking) => void;
}

export function useBookings({ onBookingCreated }: UseBookingsOptions = {}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const createBooking = useCallback(
    async (data: BookingFormData): Promise<boolean> => {
      setSubmitting(true);
      setError('');

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create booking');
        }

        const booking = await res.json();
        onBookingCreated?.(booking);
        return true;
      } catch (err) {
        log.error({}, 'Failed to create booking', err);
        setError(err instanceof Error ? err.message : 'Failed to submit booking');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [onBookingCreated]
  );

  return {
    createBooking,
    submitting,
    error,
    setError,
  };
}
