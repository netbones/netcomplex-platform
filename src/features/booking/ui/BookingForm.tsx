'use client';

import { useState, useEffect } from 'react';
import { BookingDatePicker, BookingTimeSlots } from '@entities/booking';
import type { BookingFormData } from '@entities/booking';
import { DEFAULT_FACILITIES } from '@entities/booking';
import type { TenantFacility } from '@entities/booking';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('BookingForm');

interface BookingFormProps {
  onSubmit?: (data: BookingFormData) => Promise<void>;
  onSuccess?: () => void;
}

export function BookingForm({ onSubmit, onSuccess }: BookingFormProps) {
  const [facility, setFacility] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [facilities, setFacilities] = useState<TenantFacility[]>(DEFAULT_FACILITIES);
  const [loadingFacilities, setLoadingFacilities] = useState(true);

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const res = await fetch('/api/settings?key=booking_facilities');
        if (res.ok) {
          const body = await res.json();
          const raw = body?.data?.value;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setFacilities(parsed as TenantFacility[]);
              return;
            }
          }
        }
      } catch (err) {
        log.error({}, 'Failed to fetch tenant facilities, using defaults', err);
      } finally {
        setLoadingFacilities(false);
      }
    }

    fetchFacilities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData: BookingFormData = {
      facility: facility as BookingFormData['facility'],
      date,
      startTime,
      endTime,
      purpose,
    };

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errorData = await res.json();
          const message =
            errorData?.data?.error ||
            errorData?.error?.message ||
            errorData?.error ||
            'Failed to create booking';

          if (res.status === 409) {
            throw new Error('This time slot is no longer available. Please choose another time.');
          }

          throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
        }
      }

      setFacility('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setPurpose('');
      onSuccess?.();
    } catch (err) {
      log.error({}, 'Failed to submit booking', err);
      setError(err instanceof Error ? err.message : 'Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeSelect = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  const canSubmit = facility && date && startTime && endTime;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Facility *</label>
        <select
          required
          value={facility}
          onChange={e => {
            setFacility(e.target.value);
            setDate('');
            setStartTime('');
            setEndTime('');
          }}
          disabled={loadingFacilities}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary disabled:opacity-50"
        >
          <option value="">
            {loadingFacilities ? 'Loading facilities...' : 'Select a facility'}
          </option>
          {facilities.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {facility && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <BookingDatePicker
                onSelect={d => {
                  setDate(d);
                  setStartTime('');
                  setEndTime('');
                }}
                selectedDate={date}
              />
            </div>
          </div>

          {date && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Slot *</label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <BookingTimeSlots facility={facility} date={date} onSelect={handleTimeSelect} />
              </div>
              {startTime && (
                <p className="text-sm text-soralia-primary mt-2">
                  Selected: {startTime} – {endTime}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
        <textarea
          rows={3}
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          placeholder="What's this booking for?"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || loadingFacilities || !canSubmit}
        className="w-full bg-soralia-primary text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {submitting ? 'Booking...' : 'Book Facility'}
      </button>
    </form>
  );
}
