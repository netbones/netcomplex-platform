// Identity-related type definitions

export type OccupancyType = 'OWNER_OCCUPIED' | 'RENTAL' | 'VACANT';
export type HouseholdStatus = 'ACTIVE' | 'ARCHIVED';

/** @property-consolidation-plan (44-03 findings)
 * Full internal domain model — load-bearing for entity relations.
 * Per C1 resolution: STAYS as-is (not consolidated with DTOs).
 * Date objects (not ISO strings — intentional, tRPC handles serialization).
 * Fields: id, tenantId, platformAddress, street, unit, ownerId?, homeImage?,
 *         createdAt (Date), updatedAt (Date), activeHousehold?, households?
 * Last audit: 2026-06-08
 */
export interface Property {
  id: string;
  tenantId: string;
  platformAddress: string;
  street: string;
  unit: string;
  ownerId?: string;
  homeImage?: string;
  createdAt: Date;
  updatedAt: Date;
  activeHousehold?: Household;
  households?: Household[];
}

export interface Household {
  id: string;
  tenantId: string;
  propertyId: string;
  organizationId?: string;
  occupancyType: OccupancyType;
  status: HouseholdStatus;
  moveInDate?: Date;
  moveOutDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  property?: Property;
  profiles?: Profile[];
}

export interface StandardSeat {
  id: string;
  userId: string;
  propertyId: string;
  isPrimaryOwner: boolean;
  platformAddress: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
  };
  property?: Property;
}

export interface Profile {
  id: string;
  householdId: string;
  displayName: string;
  profileAddress: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  occupantType: 'OCCUPANT' | 'MINOR' | 'FAMILY';
  residencyType: 'FAMILY' | 'RENTER' | 'OWNER_RESIDENT';
  occupantSince: Date;
  household?: Household;
}

export interface AgentAccess {
  id: string;
  agentId: string;
  propertyId: string;
  permissions: string[];
  expiresAt: Date;
  isActive: boolean;
  grantedBy?: {
    id: string;
    name: string;
  };
  property?: Property;
}

export interface SoloSeat {
  id: string;
  userId: string;
  platformAddress: string;
  propertyId?: string;
  seatType: 'RESIDENT' | 'MEMBER';
  isComplimentary: boolean;
  createdAt: Date;
  updatedAt: Date;
  property?: Property;
}

export interface ManagedProperty extends Property {
  accessExpiresAt: Date;
  grantedBy: {
    id: string;
    name: string;
  };
}
