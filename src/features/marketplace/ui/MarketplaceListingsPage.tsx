'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@api/client';
import { SwipeableServiceCard } from './SwipeableServiceCard';
import { PullToRefresh } from './PullToRefresh';
import { BookingBottomSheet } from '@entities/marketplace';
import { InquireModal } from './InquireModal';
import type { ServiceListing } from '@entities/service';

export function MarketplaceListingsPage() {
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<ServiceListing | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [inquireListing, setInquireListing] = useState<ServiceListing | null>(null);

  const { data, isLoading, refetch, isError } = trpc.marketplace.listListings.useQuery();

  useEffect(() => {
    if (data) {
      const raw = Array.isArray(data)
        ? data
        : ((data as unknown as { data?: unknown[] }).data ?? []);
      setServices(raw as ServiceListing[]);
      setError(null);
    }
    if (isError) {
      setError('Failed to load marketplace listings. Please try again.');
    }
  }, [data, isError]);

  const handleBook = (serviceId: string) => {
    const listing = services.find(s => s.id === serviceId);
    if (listing) {
      setSelectedListing(listing);
      setBottomSheetOpen(true);
    }
  };

  const handleInquire = (serviceId: string) => {
    const listing = services.find(s => s.id === serviceId);
    if (listing) {
      setInquireListing(listing);
    }
  };

  const parseAvailability = (
    _listing: ServiceListing
  ): Record<string, { start: string; end: string }[]> => {
    try {
      // Services may not have availability; return empty map as fallback
      return {};
    } catch {
      return {};
    }
  };

  // D-13: single-column stack on mobile, responsive grid on desktop
  // D-16: 44x44px touch targets on all interactive elements
  return (
    <PullToRefresh
      onRefresh={async () => {
        await refetch();
      }}
    >
      <div className="pb-[env(safe-area-inset-bottom,16px)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Service Marketplace</h2>
          <span className="text-sm text-gray-500">{services.length} providers</span>
        </div>

        {error && !isLoading && (
          <div className="px-4 pb-4">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              {error}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading services...</div>
        ) : (
          /* D-13: single-column card stack on mobile */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
            {services.map(service => (
              <SwipeableServiceCard
                key={service.id}
                service={service}
                onInquire={handleInquire}
                onBook={handleBook}
              />
            ))}
            {services.length === 0 && !isLoading && !error && (
              <p className="col-span-full text-center text-gray-500 py-8">
                No services available yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* D-14: Bottom sheet booking flow */}
      {selectedListing && (
        <BookingBottomSheet
          listing={{
            id: selectedListing.id,
            title: selectedListing.title,
            description: selectedListing.description,
            category: selectedListing.category,
            priceType: selectedListing.priceType,
            price: selectedListing.price,
            currency: selectedListing.currency,
            images: selectedListing.images,
            verified: selectedListing.verified,
            rating: selectedListing.rating,
            reviewCount: selectedListing.reviewCount,
            provider: selectedListing.provider,
            availability: parseAvailability(selectedListing),
          }}
          isOpen={bottomSheetOpen}
          onClose={() => setBottomSheetOpen(false)}
          onBookingComplete={bookingId => {
            setBottomSheetOpen(false);
            window.location.href = `/dashboard/services/amenities/${bookingId}`;
          }}
        />
      )}

      {inquireListing && (
        <InquireModal
          listing={inquireListing}
          isOpen={!!inquireListing}
          onClose={() => setInquireListing(null)}
        />
      )}
    </PullToRefresh>
  );
}
