import { CARD_HEADER_COLORS, CARD_ANIMATIONS, INTEREST_COLORS } from '@/lib/constants';
import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import Link from 'next/link';

export interface Resident {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  interests: string[];
  avatar: string | null;
  isPublic: boolean;
  role?: string;
  standardSeats?: Array<{
    household: {
      street: string;
      unit: string;
      homeImage: string | null;
    };
    isPrimaryOwner: boolean;
  }>;
  soloSeat?: {
    seatType: string;
    household?: {
      street: string;
      unit: string;
      homeImage: string | null;
    };
  };
}

function getInterestColor(interest: string): string {
  return INTEREST_COLORS[interest] || 'bg-gray-500';
}

function getResidentLabel(residentType?: string, role?: string): string {
  if (residentType === 'OWNER') return 'Owner';
  if (residentType === 'RENTER') return 'Renter';
  if (residentType === 'BOARD') return 'Board Member';
  return role || 'Resident';
}

interface ResidentCardProps {
  resident: Resident;
  headerColor?: string;
  avatarUrl?: string;
  interestList?: string[];
  onChat?: () => void;
  canChat?: boolean;
  showChatButton?: boolean;
}

export function ResidentCard({
  resident,
  headerColor,
  avatarUrl,
  interestList = [],
  onChat,
  canChat = false,
  showChatButton = true,
}: ResidentCardProps) {
  const finalHeaderColor =
    headerColor || 'bg-gradient-to-r from-soralia-primary to-soralia-secondary';
  const finalAvatarUrl =
    avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`;
  const finalInterestList = Array.isArray(resident.interests) ? resident.interests : interestList;

  const hasHomeImage = !!(
    resident.standardSeats?.[0]?.household?.homeImage || resident.soloSeat?.household?.homeImage
  );

  return (
    <Link
      href={`/resident/${resident.id}`}
      className={`block bg-white rounded-lg shadow-md overflow-hidden hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-in-out ${CARD_ANIMATIONS.transition}`}
    >
      <div className={`${finalHeaderColor} p-4 text-white`}>
        <div className="flex items-center gap-3">
          <img
            src={finalAvatarUrl}
            alt={resident.name}
            className="w-10 h-10 rounded-full bg-white/20"
          />
          <div>
            <h3 className="font-bold text-lg">{resident.name}</h3>
            <p className="text-sm opacity-90">
              {resident.standardSeats?.[0]?.household?.street ||
                resident.soloSeat?.household?.street ||
                'Address not available'}
              {(resident.standardSeats?.[0]?.household?.unit ||
                resident.soloSeat?.household?.unit) &&
                `, ${resident.standardSeats?.[0]?.household?.unit || resident.soloSeat?.household?.unit}`}
            </p>
          </div>
        </div>
      </div>

      {/* Home Image - Below header in grid view */}
      {resident.standardSeats?.[0]?.household?.homeImage ||
      resident.soloSeat?.household?.homeImage ? (
        <div className="w-full h-32 overflow-hidden bg-gray-100 border-t border-gray-200">
          <img
            src={
              resident.standardSeats?.[0]?.household?.homeImage ||
              resident.soloSeat?.household?.homeImage ||
              ''
            }
            alt={`${resident.name}'s home`}
            className="w-full h-full object-cover"
            onError={e => {
              console.log(`Failed to load home image for ${resident.name}:`, e);
              // Hide the image on error and show a placeholder
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML =
                '<div class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">Image not available</div>';
            }}
          />
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <i className="fas fa-home text-soralia-secondary mr-2" aria-hidden="true"></i>
            <span className="text-sm text-gray-600">
              {getResidentLabel(
                resident.standardSeats?.[0]?.isPrimaryOwner
                  ? 'OWNER'
                  : resident.soloSeat
                    ? 'BOARD'
                    : 'RENTER',
                resident.role
              )}
            </span>
          </div>
          {showChatButton && canChat && onChat && (
            <button
              onClick={e => {
                e.preventDefault();
                onChat();
              }}
              className="text-soralia-primary hover:text-indigo-700 transition-colors"
              title="Start chat"
            >
              <i className="fas fa-comment" aria-hidden="true"></i>
            </button>
          )}
        </div>
        {resident.isPublic && (
          <>
            <div className="flex items-center mb-2">
              <i className="fas fa-envelope text-soralia-secondary mr-2" aria-hidden="true"></i>
              <span className="text-sm text-gray-600">{resident.email}</span>
            </div>
            {resident.phone && (
              <div className="flex items-center mb-2">
                <i className="fas fa-phone text-soralia-secondary mr-2" aria-hidden="true"></i>
                <span className="text-sm text-gray-600">{resident.phone}</span>
              </div>
            )}
          </>
        )}
        {finalInterestList.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {finalInterestList.map((interest, i) => (
              <span
                key={i}
                className={`text-xs text-white px-2 py-1 rounded-full ${getInterestColor(interest)}`}
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

interface ResidentListItemProps {
  resident: Resident;
  headerColor?: string;
  avatarUrl?: string;
  interestList?: string[];
  onChat?: () => void;
  canChat?: boolean;
  showChatButton?: boolean;
}

export function ResidentListItem({
  resident,
  headerColor,
  avatarUrl,
  interestList = [],
  onChat,
  canChat = false,
  showChatButton = true,
}: ResidentListItemProps) {
  const finalHeaderColor =
    headerColor || 'bg-gradient-to-r from-soralia-primary to-soralia-secondary';
  const finalAvatarUrl =
    avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`;
  const finalInterestList = Array.isArray(resident.interests) ? resident.interests : interestList;

  return (
    <div
      className={`bg-white rounded-lg shadow-md hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer relative overflow-hidden min-h-32 ${CARD_ANIMATIONS.transition}`}
    >
      <div className={`${finalHeaderColor} p-4 text-white w-64 shrink-0 z-10`}>
        <div className="flex items-center gap-3">
          <img
            src={finalAvatarUrl}
            alt={resident.name}
            className="w-10 h-10 rounded-full bg-white/20"
          />
          <div>
            <h3 className="font-bold text-lg">{resident.name}</h3>
            <p className="text-sm opacity-90">
              {resident.standardSeats?.[0]?.household?.street ||
                resident.soloSeat?.household?.street ||
                'Address not available'}
              {(resident.standardSeats?.[0]?.household?.unit ||
                resident.soloSeat?.household?.unit) &&
                `, ${resident.standardSeats?.[0]?.household?.unit || resident.soloSeat?.household?.unit}`}
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 flex items-center z-10">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <i className="fas fa-home text-soralia-secondary mr-2" aria-hidden="true"></i>
              <span className="text-sm text-gray-600">
                {getResidentLabel(
                  resident.standardSeats?.[0]?.isPrimaryOwner
                    ? 'OWNER'
                    : resident.soloSeat
                      ? 'BOARD'
                      : 'RENTER',
                  resident.role
                )}
              </span>
            </div>
            {showChatButton && canChat && onChat && (
              <button
                onClick={e => {
                  e.preventDefault();
                  onChat();
                }}
                className="text-soralia-primary hover:text-indigo-700 transition-colors flex-shrink-0"
                title="Start chat"
              >
                <i className="fas fa-comment text-xl" aria-hidden="true"></i>
              </button>
            )}
          </div>
          {resident.isPublic && (
            <>
              <div className="flex items-center mb-2">
                <i className="fas fa-envelope text-soralia-secondary mr-2" aria-hidden="true"></i>
                <span className="text-sm text-gray-600">{resident.email}</span>
              </div>
              {resident.phone && (
                <div className="flex items-center mb-2">
                  <i className="fas fa-phone text-soralia-secondary mr-2" aria-hidden="true"></i>
                  <span className="text-sm text-gray-600">{resident.phone}</span>
                </div>
              )}
            </>
          )}
          {finalInterestList.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {finalInterestList.slice(0, 3).map((interest, i) => (
                <span
                  key={i}
                  className={`text-xs text-white px-2 py-1 rounded-full ${getInterestColor(interest)}`}
                >
                  {interest}
                </span>
              ))}
              {finalInterestList.length > 3 && (
                <span className="text-xs text-gray-500 px-2 py-1">
                  +{finalInterestList.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Home Image - Right side in list view (absolute positioning like home page) */}
      {(resident.standardSeats?.[0]?.household?.homeImage ||
        resident.soloSeat?.household?.homeImage) && (
        <div className="absolute inset-y-0 right-0 w-48">
          <img
            src={
              resident.standardSeats?.[0]?.household?.homeImage ||
              resident.soloSeat?.household?.homeImage ||
              ''
            }
            alt={`${resident.name}'s home`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
