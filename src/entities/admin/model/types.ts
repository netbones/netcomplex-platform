import type { Tenant } from '@entities/tenant';
import type { TierLevel } from '@api/features/registry';

export type { Tenant, TierLevel };

export interface TenantFormData {
  name: string;
  slug: string;
  customDomain: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  fontFamily: string;
  customCss?: string;
  active: boolean;
}

export interface TenantBrandingFormProps {
  tenant: {
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
  };
}

export interface TenantFeaturesFormProps {
  tenant: {
    id: string;
    name: string;
    subscriptionTier: string;
    featureFlags: Record<string, boolean>;
  };
  allFeatures: Array<{
    key: string;
    tier: string;
    category: string;
    label: string;
    description: string;
  }>;
}

export interface FeatureCategory {
  name: string;
  features: TenantFeaturesFormProps['allFeatures'];
}

export type FeatureAccessLevel = 'allowed' | 'upgrade' | 'locked';
export type FeatureStatus = 'enabled' | 'disabled' | 'locked' | 'tier-allowed';
