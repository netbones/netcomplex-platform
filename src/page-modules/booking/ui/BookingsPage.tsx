'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { usePageLoading } from '@shared/ui';
import Image from 'next/image';
import { apiGet } from '@/shared/api/http-client';
import { createComponentLogger } from '@shared/lib';
import { BookingForm } from '@features/booking';
import { StatusBadge, FacilityBadge, BookingCalendar, type Booking } from '@entities/booking';

const log = createComponentLogger('BookingsPage');

type Tab = 'list' | 'calendar' | 'new';

export function BookingsPage() {
  const { t } = useTranslation(['common', 'bookings']);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [loading, setLoading] = useState(true);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Bookings', href: '/bookings' },
    ],
    { additionalLoading: loading }
  );

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await apiGet<Booking[]>(`/api/bookings`);
      setBookings(data ?? []);
    } catch (error) {
      log.error({}, 'Failed to fetch bookings', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleBookingSuccess = () => {
    setActiveTab('list');
    fetchBookings();
  };

  if (!isReady) {
    return LoadingComponent;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'list', label: 'My Bookings' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'new', label: 'New Booking' },
  ];

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.bookings') }]}
          />
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Image
                src="/platform/bookings.svg"
                alt=""
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <h1 className="text-4xl font-bold text-soralia-primary">{t('bookings:title')}</h1>
            </div>
          </div>

          <div className="flex border-b border-gray-200 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px]
                  ${
                    activeTab === tab.key
                      ? 'border-soralia-primary text-soralia-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'new' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Book a Facility</h2>
                <BookingForm onSuccess={handleBookingSuccess} />
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading bookings...</p>
                </div>
              ) : (
                <BookingCalendar bookings={bookings} />
              )}
            </div>
          )}

          {activeTab === 'list' && (
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading bookings...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No bookings yet.</p>
                  <button
                    onClick={() => setActiveTab('new')}
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
                            <FacilityBadge facility={booking.facility} />
                          </td>
                          <td className="px-6 py-4">
                            {new Date(booking.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            {booking.startTime} - {booking.endTime}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={booking.status} />
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
