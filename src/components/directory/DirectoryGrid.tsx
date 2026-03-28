import {
  CARD_HEADER_COLORS,
  CARD_ANIMATIONS,
  INTEREST_COLORS,
  RESIDENT_TYPES,
} from '@/lib/constants';
import type { ResidentType } from '@/lib/constants';

interface Resident {
  id: string;
  name: string;
  email: string;
  street: string | null;
  unit: string | null;
  phone: string | null;
  interests: string[];
  avatar: string | null;
  isPublic: boolean;
  residentType?: ResidentType;
  role?: string;
}

interface DirectoryGridProps {
  residents: Resident[];
  viewMode?: 'grid' | 'list';
}

function getInterestColor(interest: string): string {
  return INTEREST_COLORS[interest] || 'bg-gray-500';
}

function getResidentLabel(residentType?: ResidentType, role?: string): string {
  if (residentType === RESIDENT_TYPES.OWNER) return 'Owner';
  if (residentType === RESIDENT_TYPES.RENTER) return 'Renter';
  return role || 'Resident';
}

export function DirectoryGrid({ residents, viewMode = 'grid' }: DirectoryGridProps) {
  if (residents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No residents found matching your criteria.</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {residents.map((resident, idx) => {
          const headerColor = CARD_HEADER_COLORS[idx % CARD_HEADER_COLORS.length];
          const avatarUrl =
            resident.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`;
          const interestList = Array.isArray(resident.interests) ? resident.interests : [];

          return (
            <div
              key={resident.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden flex hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer ${CARD_ANIMATIONS.transition}`}
            >
              <div className={`${headerColor} p-4 text-white w-64 shrink-0`}>
                <div className="flex items-center gap-3">
                  <img
                    src={avatarUrl}
                    alt={resident.name}
                    className="w-10 h-10 rounded-full bg-white/20"
                  />
                  <div>
                    <h3 className="font-bold text-lg">{resident.name}</h3>
                    <p className="text-sm opacity-90">
                      {resident.street}
                      {resident.unit && `, ${resident.unit}`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 flex items-center gap-8">
                <div>
                  <div className="flex items-center mb-2">
                    <i className="fas fa-home text-soralia-secondary mr-2" aria-hidden="true"></i>
                    <span className="text-sm text-gray-600">
                      {getResidentLabel(resident.residentType, resident.role)}
                    </span>
                  </div>
                  {resident.isPublic && (
                    <>
                      <div className="flex items-center mb-2">
                        <i
                          className="fas fa-envelope text-soralia-secondary mr-2"
                          aria-hidden="true"
                        ></i>
                        <span className="text-sm text-gray-600">{resident.email}</span>
                      </div>
                      {resident.phone && (
                        <div className="flex items-center mb-2">
                          <i
                            className="fas fa-phone text-soralia-secondary mr-2"
                            aria-hidden="true"
                          ></i>
                          <span className="text-sm text-gray-600">{resident.phone}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {interestList.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {interestList.map((interest, i) => (
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
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {residents.map((resident, idx) => {
        const headerColor = CARD_HEADER_COLORS[idx % CARD_HEADER_COLORS.length];
        const avatarUrl =
          resident.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name.replace(' ', '')}`;
        const interestList = Array.isArray(resident.interests) ? resident.interests : [];

        return (
          <div
            key={resident.id}
            className={`bg-white rounded-lg shadow-md overflow-hidden hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer ${CARD_ANIMATIONS.transition}`}
          >
            <div className={`${headerColor} p-4 text-white`}>
              <div className="flex items-center gap-3">
                <img
                  src={avatarUrl}
                  alt={resident.name}
                  className="w-10 h-10 rounded-full bg-white/20"
                />
                <div>
                  <h3 className="font-bold text-lg">{resident.name}</h3>
                  <p className="text-sm opacity-90">
                    {resident.street}
                    {resident.unit && `, ${resident.unit}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center mb-2">
                <i className="fas fa-home text-soralia-secondary mr-2" aria-hidden="true"></i>
                <span className="text-sm text-gray-600">
                  {getResidentLabel(resident.residentType, resident.role)}
                </span>
              </div>
              {resident.isPublic && (
                <>
                  <div className="flex items-center mb-2">
                    <i
                      className="fas fa-envelope text-soralia-secondary mr-2"
                      aria-hidden="true"
                    ></i>
                    <span className="text-sm text-gray-600">{resident.email}</span>
                  </div>
                  {resident.phone && (
                    <div className="flex items-center mb-2">
                      <i
                        className="fas fa-phone text-soralia-secondary mr-2"
                        aria-hidden="true"
                      ></i>
                      <span className="text-sm text-gray-600">{resident.phone}</span>
                    </div>
                  )}
                </>
              )}
              {interestList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {interestList.map((interest, i) => (
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
          </div>
        );
      })}
    </div>
  );
}
