import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export interface AdminUsersResponse<TUser = unknown> {
  users: TUser[];
  total: number;
}

/**
 * Hook returns the page of admin users + total count.
 * `/api/users` is a paginated response; the http-client unwraps the success envelope,
 * so this hook returns the unwrapped `users` array AND the `total` from meta.
 *
 * Pass a type param to constrain the user shape: `useAdminUsers<AdminUser>()`.
 */
export function useAdminUsers<TUser = unknown>() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async (): Promise<AdminUsersResponse<TUser>> => {
      const { data, meta } = await apiGet<TUser[]>('/api/users');
      const users = data ?? [];
      const total = (meta?.total as number | undefined) ?? users.length;
      return { users, total };
    },
    staleTime: 10 * 60 * 1000,
  });
}
