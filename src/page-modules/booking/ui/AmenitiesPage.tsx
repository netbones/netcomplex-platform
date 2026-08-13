'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { usePageLoading } from '@shared/ui';
import { apiGet } from '@/shared/api/http-client';
import { createComponentLogger } from '@/shared/lib';
import type { AmenityWithStatus } from '@entities/amenity';
import { AmenityCard } from '@entities/amenity';
import { BookingDetail } from '@features/booking';
import { DomainIconBadge } from '@widgets/dashboard';
import { MyBookingsTab } from './MyBookingsTab';
import { AmenitiesCalendarTab } from './AmenitiesCalendarTab';

const log = createComponentLogger('AmenitiesPage');

type Tab = 'amenities' | 'bookings' | 'calendar';

interface BookingHandoff {
  amenity: AmenityWithStatus;
  date?: Date;
  slot?: string;
}

export function AmenitiesPage() {
  const [amenities, setAmenities] = useState<AmenityWithStatus[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('amenities');
  const [loading, setLoading] = useState(true);
  const [bookingHandoff, setBookingHandoff] = useState<BookingHandoff | null>(null);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Amenities', href: '/amenities' },
    ],
    { additionalLoading: loading }
  );

  const fetchAmenities = useCallback(async () => {
    try {
      const { data } = await apiGet<AmenityWithStatus[]>(`/api/amenities`);
      setAmenities(data ?? []);
    } catch (error) {
      log.error({}, 'Failed to fetch amenities', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAmenities();
  }, [fetchAmenities]);

  const handleBook = (amenity: AmenityWithStatus) => {
    setBookingHandoff({ amenity });
  };

  const handleBookSlot = (amenity: AmenityWithStatus, date: Date, startTime: string) => {
    setBookingHandoff({ amenity, date, slot: startTime });
  };

  const handleJoinWaitlist = (amenity: AmenityWithStatus) => {
    // TODO: Implement waitlist join
    console.log('Join waitlist:', amenity.id);
  };

  const handleInfo = (amenity: AmenityWithStatus) => {
    // TODO: Show info sheet/modal
    console.log('Show info:', amenity.id);
  };

  const handleContact = (amenity: AmenityWithStatus) => {
    if (amenity.contactPhone) {
      window.location.href = `tel:${amenity.contactPhone}`;
    }
  };

  const handleBookingSuccess = () => {
    setBookingHandoff(null);
    setActiveTab('bookings');
  };

  if (!isReady) {
    return LoadingComponent;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'amenities', label: 'Amenities' },
    { key: 'bookings', label: 'My bookings' },
    { key: 'calendar', label: 'Calendar' },
  ];

  return (
    <ErrorBoundary>
      <main className="relative min-h-screen">
        {/* Pattern background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/platform/patterns/pattern.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: '500px',
          }}
        />
        {/* White wash overlay */}
        <div className="absolute inset-0 bg-white/80" />
        <div className="relative max-w-2xl mx-auto px-4 py-8">
          {/* Show booking detail if amenity selected */}
          {bookingHandoff ? (
            <BookingDetail
              amenity={bookingHandoff.amenity}
              initialDate={bookingHandoff.date}
              initialSlot={bookingHandoff.slot}
              onBack={() => setBookingHandoff(null)}
              onBookingSuccess={handleBookingSuccess}
            />
          ) : (
            <>
              <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Amenities' }]} />

              <div className="flex items-center gap-2.5 mb-6">
                <DomainIconBadge id="amenities" variant="services" size="md" />
                <h1 className="text-2xl font-bold text-gray-900">Amenities</h1>
              </div>

              {/* Tabs */}
              <div className="flex gap-5 border-b border-gray-200 mb-5">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors min-h-[44px]
                      ${
                        activeTab === tab.key
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Amenities Tab */}
              {activeTab === 'amenities' && (
                <div className="flex flex-col gap-3">
                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">Loading amenities...</p>
                    </div>
                  ) : amenities.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">No amenities available.</p>
                    </div>
                  ) : (
                    amenities.map(amenity => (
                      <AmenityCard
                        key={amenity.id}
                        amenity={amenity}
                        onBook={handleBook}
                        onJoinWaitlist={handleJoinWaitlist}
                        onInfo={handleInfo}
                        onContact={handleContact}
                      />
                    ))
                  )}

                  {/* Footer CTA */}
                  <div className="text-center mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">
                      Know of a facility that should be listed here?
                    </p>
                    <button className="text-sm px-3.5 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
                      Chat to management
                    </button>
                  </div>
                </div>
              )}

              {/* My Bookings Tab */}
              {activeTab === 'bookings' && (
                <MyBookingsTab amenities={amenities} onBookAgain={handleBook} />
              )}

              {/* Calendar Tab */}
              {activeTab === 'calendar' && <AmenitiesCalendarTab onBookSlot={handleBookSlot} />}
            </>
          )}
        </div>
      </main>
    </ErrorBoundary>
  );
}
