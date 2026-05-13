import type { TierLevel } from '@shared/lib/constants/tiers';
import type { Facility } from '@entities/booking';

export type TenantTier = 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

export interface TenantFacilityConfig {
  id: string;
  name: string;
  type: Facility;
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
