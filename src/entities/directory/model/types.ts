/** @property-consolidation-plan (44-03 findings)
 * Directory-specific display view. No `id` field — intentionally minimal.
 * Do NOT consolidate with PropertySummaryDTO unless directory consumers
 * need the `id` field. Per C1 resolution: leave as-is (no shared lite type needed).
 * Fields: street, unit, homeImage — all match Prisma field names.
 * Last audit: 2026-06-08
 */
export interface Property {
  street: string;
  unit: string;
  homeImage: string | null;
}

export interface Landlord {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Resident {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  interests: string[];
  avatar: string | null;
  isPublic: boolean;
  profileSlug: string | null;
  role?: string;
  standing?: number | null;
  standardSeats?: Array<{
    property: Property;
    isPrimaryOwner: boolean;
  }>;
  soloSeats?: Array<{
    seatType: string;
    property?: Property;
  }> | null;
  profiles?: Array<{
    householdId: string;
    householdRole: string;
    residencyType: string;
    rentalImage: string | null;
    occupantImage: string | null;
    property: Property;
    landlord?: Landlord;
  }>;
}

export type ViewMode = 'grid' | 'list';

export type FilterType =
  | 'All Residents'
  | 'Board Members'
  | 'Committee Members'
  | 'Renters'
  | 'Owners';

export interface ResidentFilterState {
  searchQuery: string;
  filterType: FilterType;
  filterStreet: string;
  page: number;
  viewMode: ViewMode;
}

export interface UseResidentFilterReturn {
  residents: Resident[];
  loading: boolean;
  searchQuery: string;
  filterType: string;
  filterStreet: string;
  page: number;
  total: number;
  limit: number;
  viewMode: ViewMode;
  setSearchQuery: (query: string) => void;
  setFilterType: (type: string) => void;
  setFilterStreet: (street: string) => void;
  setPage: (page: number | ((p: number) => number)) => void;
  setViewMode: (mode: ViewMode) => void;
  filteredCount: number;
  totalPages: number;
  refetch: () => void;
}
