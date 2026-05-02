'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BookingFormData, Facility } from '@entities/booking';
import { VALID_FACILITIES } from '@entities/booking';
import type { TenantFacilityConfig } from '@entities/tenant';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('BookingForm');

interface BookingFormProps {
  selectedFacility?: Facility | null;
  selectedDate?: Date | null;
  selectedTime?: string | null;
  tenantFacilities?: TenantFacilityConfig[];
  onSubmit?: (data: BookingFormData) => Promise<void>;
  onSuccess?: () => void;
}

export function BookingForm({
  selectedFacility: propFacility,
  selectedDate: propDate,
  selectedTime: propTime,
  tenantFacilities = [],
  onSubmit,
  onSuccess,
}: BookingFormProps) {
  const { t } = useTranslation(['common', 'bookings']);
  const [formData, setFormData] = useState<BookingFormData>({
    facility: (propFacility || '') as BookingFormData['facility'],
    date: propDate ? propDate.toISOString().split('T')[0] : '',
    startTime: propTime || '',
    endTime: '',
    purpose: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Determine which facilities to show
  const facilities =
    tenantFacilities.length > 0
      ? tenantFacilities.map(f => ({ value: f.type, label: f.name }))
      : Object.entries({
          POOL: 'Swimming Pool',
          GYM: 'Gym',
          COMMUNITY_CENTER: 'Community Center',
          TENNIS: 'Tennis Court',
          BBQ_AREA: 'BBQ Area',
        }).map(([value, label]) => ({ value, label }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);

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
          const data = await res.json();
          throw new Error(data.error || 'Failed to create booking');
        }
      }

      setSuccess(true);
      setFormData({
        facility: '' as BookingFormData['facility'],
        date: '',
        startTime: '',
        endTime: '',
        purpose: '',
      });
      onSuccess?.();
    } catch (err) {
      log.error({}, 'Failed to submit booking', err);
      setError(err instanceof Error ? err.message : 'Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate end time based on start time (default 1 hour duration)
  const handleStartTimeChange = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const endHour = (hours + 1) % 24;
    const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    setFormData({
      ...formData,
      startTime: time,
      endTime: endTime,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg">{t('bookings:success')}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('bookings:facility')} *
        </label>
        <select
          required
          value={formData.facility}
          onChange={e =>
            setFormData({ ...formData, facility: e.target.value as BookingFormData['facility'] })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        >
          <option value="">{t('bookings:selectFacility')}</option>
          {facilities.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('bookings:date')} *
        </label>
        <input
          type="date"
          required
          value={formData.date}
          onChange={e => setFormData({ ...formData, date: e.target.value })}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('bookings:startTime')} *
          </label>
          <input
            type="time"
            required
            value={formData.startTime}
            onChange={e => handleStartTimeChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('bookings:endTime')} *
          </label>
          <input
            type="time"
            required
            value={formData.endTime}
            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('bookings:purpose')}
        </label>
        <textarea
          rows={3}
          value={formData.purpose}
          onChange={e => setFormData({ ...formData, purpose: e.target.value })}
          placeholder={t('bookings:purposePlaceholder')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-soralia-primary text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {submitting ? t('bookings:submitting') : t('bookings:submit')}
      </button>
    </form>
  );
}
