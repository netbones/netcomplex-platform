import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => (await apiGet(`/api/users/${userId!}`)).data,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
