import type { TierLevel } from '@shared/lib';

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
