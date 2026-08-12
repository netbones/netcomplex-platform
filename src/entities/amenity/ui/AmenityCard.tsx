'use client';

import { Phone, Info } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { AmenityWithStatus } from '../model/types';
import { AmenityBadge, statusToVariant } from './AmenityBadge';
import { formatHours } from '../model/selectors';

interface AmenityCardProps {
  amenity: AmenityWithStatus;
  onBook?: (amenity: AmenityWithStatus) => void;
  onJoinWaitlist?: (amenity: AmenityWithStatus) => void;
  onInfo?: (amenity: AmenityWithStatus) => void;
  onContact?: (amenity: AmenityWithStatus) => void;
}

// Tabler icon mapping - maps icon names to colors
const iconColors: Record<string, { bg: string; text: string }> = {
  tennis: { bg: 'bg-green-100', text: 'text-green-600' },
  swimming: { bg: 'bg-amber-100', text: 'text-amber-600' },
  parking: { bg: 'bg-gray-100', text: 'text-gray-600' },
  fire: { bg: 'bg-red-100', text: 'text-red-600' },
  default: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
};

export function AmenityCard({
  amenity,
  onBook,
  onJoinWaitlist,
  onInfo,
  onContact,
}: AmenityCardProps) {
  const colors = iconColors[amenity.icon] || iconColors.default;
  const hoursText = formatHours(amenity.hoursOpen, amenity.hoursClose);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex">
      {/* Left: Photo or Icon tile */}
      <div
        className={cn(
          'w-[120px] min-w-[120px] h-[100px] flex items-center justify-center',
          colors.bg
        )}
      >
        {amenity.photoUrl ? (
          <img
            src={amenity.photoUrl}
            alt={amenity.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <i
            className={`ti ti-${amenity.icon} text-3xl ${colors.text}`}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Right: Content */}
      <div className="flex-1 p-3.5 flex flex-col justify-center gap-1">
        {/* Name and Status */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-[15px]">{amenity.name}</span>
          <AmenityBadge
            text={amenity.statusText}
            variant={statusToVariant(amenity.computedStatus)}
            className="ml-auto"
          />
        </div>

        {/* Hours */}
        {amenity.bookable ? (
          <div className="text-[13px] text-gray-500 flex items-center gap-1.5">
            <i className="ti ti-clock text-sm" aria-hidden="true" />
            {hoursText}
          </div>
        ) : (
          <div className="text-[13px] text-gray-500">
            No booking needed — contact security to register a visitor.
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-1.5">
          {amenity.bookable && (
            <>
              {amenity.computedStatus === 'fully_booked' && amenity.waitlistEnabled ? (
                <button
                  onClick={() => onJoinWaitlist?.(amenity)}
                  className="text-[13px] px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                >
                  Join waitlist
                </button>
              ) : (
                <button
                  onClick={() => onBook?.(amenity)}
                  className="text-[13px] px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                >
                  Book
                </button>
              )}
            </>
          )}
          
          {amenity.rulesText && (
            <button
              onClick={() => onInfo?.(amenity)}
              className="text-[13px] px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition"
              aria-label="View info"
            >
              <Info className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {amenity.contactEnabled && amenity.contactPhone && (
            <button
              onClick={() => onContact?.(amenity)}
              className="text-[13px] px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition"
              aria-label="Call"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
