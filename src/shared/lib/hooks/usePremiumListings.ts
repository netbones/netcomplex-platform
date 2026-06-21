import { useQuery } from '@tanstack/react-query';

interface PremiumListing {
  id: string;
  title: string;
  listingType: string;
  price?: number;
  status: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  householdId?: string;
  assignedAgent?: { name: string } | null;
  household: { street: string; unit: string };
}

interface PremiumListingsResponse {
  listings?: PremiumListing[];
}

export function usePremiumListings() {
  return useQuery<PremiumListingsResponse>({
    queryKey: ['premium', 'listings'],
    queryFn: () => fetch('/api/premium/listings').then(r => r.json()),
    staleTime: 60_000,
  });
}
