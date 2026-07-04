import type { TierLevel } from '../constants/tiers';

export type TenantTier = 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

export interface TenantFacilityConfig {
  id: string;
  name: string;
  type: string;
  externalApiUrl?: string;
}

export interface TenantModuleConfig {
  enabled: boolean;
  config?: Record<string, unknown>;
  enabledAt?: Date;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  tagline: string | null;
  description: string | null;
  address: string | null;
  telephone: string | null;
  email: string | null;
  governanceLabel: string | null;
  primaryColor: string;
  accentColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  customCss: string | null;
  active: boolean;
  subscriptionTier: TierLevel;
  tier: TenantTier;
  maxPages: number;
  pageCount: number;
  featureFlags: Record<string, boolean>;
  modules?: Record<string, TenantModuleConfig>;
  facilities?: TenantFacilityConfig[];
  createdAt: Date;
  updatedAt: Date | null;
}

export interface SeatProperty {
  id: string;
  street: string;
  unit: string;
  platformAddress: string;
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
  property?: SeatProperty;
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
  property?: SeatProperty;
}

export type FeatureCheckFn = (tenant: Tenant, featureKey: string) => boolean;
