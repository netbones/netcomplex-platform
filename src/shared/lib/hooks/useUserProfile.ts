import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export interface UserProfile {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  avatar?: string | null;
  isPublic?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  standardSeats?: Array<{
    id: string;
    userId: string;
    propertyId: string;
    isPrimaryOwner: boolean;
    household?: { id: string; name: string; homeImage?: string } | null;
  }>;
  soloSeats?: Array<{
    id: string;
    userId: string;
    propertyId?: string;
    seatType: 'RESIDENT' | 'MEMBER';
  }>;
  premiumSeat?: { id: string; userId: string } | null;
  notificationPreferences?: Record<string, { inApp: boolean; email: boolean }>;
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async (): Promise<UserProfile> =>
      (await apiGet<UserProfile>(`/api/users/${userId!}`)).data,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
