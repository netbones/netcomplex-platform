'use client';

import { useState } from 'react';
import { BookingBottomSheet } from '@entities/marketplace';

interface ServiceListing {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priceType?: string;
  price?: number;
  currency?: string;
  images?: string[];
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
  provider?: { id?: string; name?: string; email?: string; avatar?: string };
  availability?: Record<string, { start: string; end: string }[]>;
}

interface MarketplaceDetailPageProps {
  listing: ServiceListing;
}

export function MarketplaceDetailPage({ listing }: MarketplaceDetailPageProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const defaultAvailability: Record<string, { start: string; end: string }[]> = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };

  const listingWithAvailability = {
    ...listing,
    availability: listing.availability || defaultAvailability,
    price: listing.price || 0,
    currency: listing.currency || 'ZAR',
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero image section */}
      {listing.images && listing.images.length > 0 && (
        <div className="relative w-full h-64 md:h-96 bg-gray-200 rounded-lg overflow-hidden mb-6">
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title + Rating */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{listing.title}</h1>
        {listing.rating !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-gold-vein">★</span>
            <span className="text-sm font-medium">{listing.rating.toFixed(1)}</span>
            {listing.reviewCount !== undefined && listing.reviewCount > 0 && (
              <span className="text-sm text-gray-500">({listing.reviewCount} reviews)</span>
            )}
          </div>
        )}
      </div>

      {/* Pricing */}
      {listing.price !== undefined && listing.price > 0 && (
        <div className="mb-4">
          <span className="text-xl font-semibold text-soralia-primary">
            {new Intl.NumberFormat('en-ZA', {
              style: 'currency',
              currency: listing.currency || 'ZAR',
            }).format(listing.price)}
          </span>
          {listing.priceType === 'HOURLY' && (
            <span className="text-sm text-gray-500 ml-1">/hr</span>
          )}
        </div>
      )}

      {/* Description */}
      {listing.description && (
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">{listing.description}</p>
        </div>
      )}

      {/* Provider info */}
      {listing.provider && (
        <div className="border-t pt-4 mb-6">
          <p className="text-sm text-gray-600">
            Provided by{' '}
            <span className="font-medium text-gray-900">
              {listing.provider.name || 'Service Provider'}
            </span>
          </p>
        </div>
      )}

      {/* Book Now CTA — D-16 */}
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="w-full bg-soralia-primary text-white font-semibold py-3 rounded-lg min-h-[44px] hover:bg-soralia-primary/90 transition-colors"
      >
        Book Now
      </button>

      {/* Booking Bottom Sheet */}
      <BookingBottomSheet
        listing={listingWithAvailability}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onBookingComplete={_bookingId => {
          setIsSheetOpen(false);
        }}
      />
    </div>
  );
}
