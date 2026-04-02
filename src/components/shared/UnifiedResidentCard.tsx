import { CARD_HEADER_COLORS, CARD_ANIMATIONS, INTEREST_COLORS } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
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

interface UnifiedResidentCardProps {
  resident: Resident;
  viewMode: 'grid' | 'list';
  headerColor?: string;
  avatarUrl?: string;
  isChatVisible?: boolean;
  onChat?: () => void;
  index?: number; // For consistent header colors
}

export function UnifiedResidentCard({
  resident,
  viewMode,
  headerColor,
  avatarUrl,
  isChatVisible = false,
  onChat,
  index = 0,
}: UnifiedResidentCardProps) {
  const { t } = useTranslation(['common', 'home']);

  const finalHeaderColor = headerColor || CARD_HEADER_COLORS[index % CARD_HEADER_COLORS.length];

  const finalAvatarUrl =
    avatarUrl ||
    resident.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`;

  const street =
    resident.standardSeats?.[0]?.household?.street || resident.soloSeat?.household?.street || '';
  const unit =
    resident.standardSeats?.[0]?.household?.unit || resident.soloSeat?.household?.unit || '';
  const address = [street, unit].filter(Boolean).join(', ');

  const interestList = Array.isArray(resident.interests) ? resident.interests : [];

  const hasHomeImage = !!(
    resident.standardSeats?.[0]?.household?.homeImage || resident.soloSeat?.household?.homeImage
  );

  const getResidentLabel = () => {
    if (resident.standardSeats?.[0]?.isPrimaryOwner) {
      return t ? t('home.owner', { defaultValue: 'Owner' }) : 'Owner';
    }
    if (resident.soloSeat) {
      return 'Board Member';
    }
    return t ? t('home.renter', { defaultValue: 'Renter' }) : 'Renter';
  };

  return (
    <Link
      href={`/resident/${resident.id}`}
      className={`block bg-white rounded-lg shadow-md hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer ${CARD_ANIMATIONS.transition} ${
        viewMode === 'list' ? 'flex relative overflow-hidden min-h-32' : 'overflow-hidden'
      }`}
    >
      {/* Home Image - Grid view only (above header) */}
      {viewMode === 'grid' && hasHomeImage && (
        <div className="h-32 w-full relative">
          <Image
            src={
              resident.standardSeats?.[0]?.household?.homeImage ||
              resident.soloSeat?.household?.homeImage ||
              ''
            }
            alt={`${resident.name}'s home`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div
        className={`${finalHeaderColor} p-4 text-white ${
          viewMode === 'list' ? 'w-64 shrink-0 z-10' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative">
            <Image
              src={finalAvatarUrl}
              alt={resident.name}
              fill
              sizes="40px"
              className="rounded-full bg-white/20"
            />
          </div>
          <div>
            <h3 className="font-bold text-lg">{resident.name}</h3>
            <p className="text-sm opacity-90">{address}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={`p-4 ${
          viewMode === 'list'
            ? 'flex-1 flex items-center justify-between z-10'
            : 'flex gap-4 items-start'
        }`}
      >
        <div className={`${viewMode === 'list' ? 'flex-1' : 'flex-1'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <i className="fas fa-home text-soralia-secondary mr-2" aria-hidden="true"></i>
              <span className="text-sm text-gray-600">{getResidentLabel()}</span>
            </div>
            {viewMode === 'grid' && isChatVisible && onChat && (
              <button
                onClick={e => {
                  e.preventDefault();
                  onChat();
                }}
                className="text-soralia-primary hover:text-indigo-700 transition-colors flex-shrink-0 z-10 relative"
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
          {interestList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {interestList.map((interest, interestIdx) => (
                <span
                  key={`${index}-${interestIdx}`}
                  className={`text-xs text-white px-2 py-1 rounded-full ${
                    INTEREST_COLORS[interest] || 'bg-gray-500'
                  }`}
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chat button for list view */}
        {viewMode === 'list' && isChatVisible && onChat && (
          <button
            onClick={e => {
              e.preventDefault();
              onChat();
            }}
            className="text-soralia-primary hover:text-indigo-700 transition-colors flex-shrink-0 ml-4 z-20 relative"
            title="Start chat"
          >
            <i className="fas fa-comment text-xl" aria-hidden="true"></i>
          </button>
        )}
      </div>

      {/* Home Image - List view only (absolute positioning) */}
      {viewMode === 'list' && hasHomeImage && (
        <div className="absolute inset-y-0 right-0 w-48 z-0">
          <Image
            src={
              resident.standardSeats?.[0]?.household?.homeImage ||
              resident.soloSeat?.household?.homeImage ||
              ''
            }
            alt={`${resident.name}'s home`}
            fill
            sizes="192px"
            className="object-cover"
          />
        </div>
      )}
    </Link>
  );
}
