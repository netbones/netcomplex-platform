'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BookingForm } from '@/components/booking/BookingForm';
import { usePageLoading } from '@/hooks/usePageLoading';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface Booking {
  id: string;
  facility: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string | null;
  status: string;
  user: { name: string; unit: string | null };
}

const facilityLabels: Record<string, string> = {
  community_center: 'Community Center',
  swimming_pool: 'Swimming Pool',
  tennis_court: 'Tennis Court',
  bbq_area: 'BBQ Area',
  meeting_room: 'Meeting Room',
  garden_plot: 'Garden Plot',
};

export default function BookingsPage() {
  const { t } = useTranslation(['common', 'bookings']);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Bookings', href: '/bookings' },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch('/api/bookings');
        const data = await res.json();
        setBookings(data);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.bookings') }]}
          />
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-soralia-primary">{t('bookings:title')}</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-soralia-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              {showForm ? 'View My Bookings' : 'New Booking'}
            </button>
          </div>

          {showForm ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Book a Facility</h2>
                <BookingForm onSubmit={async () => setShowForm(false)} />
              </div>
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading bookings...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No bookings yet.</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-soralia-primary hover:underline"
                  >
                    Make your first booking
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Facility
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bookings.map(booking => (
                        <tr key={booking.id}>
                          <td className="px-6 py-4">
                            {facilityLabels[booking.facility] || booking.facility}
                          </td>
                          <td className="px-6 py-4">
                            {new Date(booking.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            {booking.startTime} - {booking.endTime}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                booking.status === 'CONFIRMED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </ErrorBoundary>
  );
}
