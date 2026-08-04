import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';
import type { AdminUser } from '@/entities/user/model/types';

export type UserProfile = AdminUser & {
  avatar?: string | null;
  notificationPreferences?: Record<string, { inApp: boolean; email: boolean }>;
  standardSeats?: Array<
    AdminUser['standardSeats'][number] & {
      household?: { id: string; name: string; homeImage?: string } | null;
    }
  >;
};

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async (): Promise<UserProfile> =>
      (await apiGet<UserProfile>(`/api/users/${userId!}`)).data,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
