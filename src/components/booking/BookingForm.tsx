'use client';

import { useState } from 'react';

interface BookingFormProps {
  onSubmit?: (data: BookingData) => Promise<void>;
}

interface BookingData {
  facility: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
}

const facilities = [
  { value: 'community_center', label: 'Community Center' },
  { value: 'swimming_pool', label: 'Swimming Pool' },
  { value: 'tennis_court', label: 'Tennis Court' },
  { value: 'bbq_area', label: 'BBQ Area' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'garden_plot', label: 'Garden Plot' },
];

export function BookingForm({ onSubmit }: BookingFormProps) {
  const [formData, setFormData] = useState<BookingData>({
    facility: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

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
          throw new Error('Failed to create booking');
        }

        alert('Booking submitted successfully!');
        setFormData({ facility: '', date: '', startTime: '', endTime: '', purpose: '' });
      }
    } catch (err) {
      setError('Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Facility *</label>
        <select
          required
          value={formData.facility}
          onChange={e => setFormData({ ...formData, facility: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        >
          <option value="">Select a facility</option>
          {facilities.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
          <input
            type="time"
            required
            value={formData.startTime}
            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
        <textarea
          rows={3}
          value={formData.purpose}
          onChange={e => setFormData({ ...formData, purpose: e.target.value })}
          placeholder="What's this booking for?"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-soralia-primary text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {submitting ? 'Booking...' : 'Book Facility'}
      </button>
    </form>
  );
}
