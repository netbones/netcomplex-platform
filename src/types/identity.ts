// Identity-related type definitions

export interface Household {
  id: string;
  street: string;
  unit: string;
  homeImage?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
  standardSeats: StandardSeat[];
  profiles: Profile[];
}

export interface StandardSeat {
  id: string;
  userId: string;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
  };
  household: Household;
}

export interface Profile {
  id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  firstName: string;
  lastName: string;
  relationship: string;
  dateOfBirth?: Date;
  // Add other profile fields as needed
}

export interface AgentAccess {
  id: string;
  agentId: string;
  householdId: string;
  permissions: string[];
  expiresAt: Date;
  isActive: boolean;
  grantedBy: {
    id: string;
    name: string;
  };
  household: Household;
}

export interface SoloSeat {
  id: string;
  userId: string;
  seatType: 'BOARD' | 'COMMITTEE' | 'ADMIN';
  householdId?: string;
  complimentary: boolean;
  createdAt: Date;
  updatedAt: Date;
  household?: {
    id: string;
    street: string;
    unit: string;
    homeImage?: string;
  };
}

export interface ManagedHousehold extends Household {
  accessExpiresAt: Date;
  grantedBy: {
    id: string;
    name: string;
  };
}
