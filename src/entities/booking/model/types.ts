export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export type Facility = 'POOL' | 'GYM' | 'COMMUNITY_CENTER' | 'TENNIS' | 'BBQ_AREA';

export interface Booking {
  id: string;
  userId: string;
  facility: Facility;
  date: string | Date;
  startTime: string;
  endTime: string;
  purpose: string | null;
  status: BookingStatus;
  createdAt: string | Date;
  updatedAt: string | Date | null;
  user?: {
    id: string;
    name: string;
    unit: string | null;
  };
}

export interface BookingFormData {
  facility: Facility;
  date: string;
  startTime: string;
  endTime: string;
  purpose?: string;
}

export interface BookingListItem {
  id: string;
  facility: Facility;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string | null;
  status: BookingStatus;
  user?: {
    id: string;
    name: string;
  };
}

export interface BookingCreateInput {
  facility: Facility;
  date: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  userId?: string;
}
