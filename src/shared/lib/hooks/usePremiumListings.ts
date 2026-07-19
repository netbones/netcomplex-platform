import { trpc } from '@api/client';

export function usePremiumListings() {
  const query = trpc.marketplace.listPremiumListings.useQuery(undefined, {
    staleTime: 60_000,
  });

  return {
    data: query.data?.data,
    refetch: query.refetch,
    isLoading: query.isLoading,
  };
}
