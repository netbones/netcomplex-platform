import { useQuery } from '@tanstack/react-query';

export function useSettings(userId: string | undefined) {
  return useQuery({
    queryKey: ['settings', 'user-data', userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId!}`);
      if (!res.ok) throw new Error('Failed to fetch user data');
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
