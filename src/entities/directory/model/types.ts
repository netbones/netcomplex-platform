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
  role?: string;
  standardSeats?: Array<{
    property: Property;
    isPrimaryOwner: boolean;
  }>;
  soloSeat?: {
    seatType: string;
    property?: Property;
  } | null;
  profiles?: Array<{
    householdId: string;
    occupantType: string;
    residencyType: string;
    rentalImage: string | null;
    occupantImage: string | null;
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
