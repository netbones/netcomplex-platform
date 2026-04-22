import type { TierLevel } from '@api/features/registry';

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
  maxPages: number;
  pageCount: number;
  featureFlags: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date | null;
}
