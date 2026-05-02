'use client';

import { TenantStyles } from './TenantStyles';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  fontFamily: string;
}

interface TenantProviderProps {
  tenant: TenantInfo;
  children: React.ReactNode;
}

export function TenantProvider({ tenant, children }: TenantProviderProps) {
  const tenantInfo = {
    id: tenant.id || '',
    name: tenant.name || 'Soralia Village',
    slug: tenant.slug || 'soralia',
    primaryColor: tenant.primaryColor || '#4F46E5',
    accentColor: tenant.accentColor || '#F59E0B',
    secondaryColor: tenant.secondaryColor || '#10B981',
    logoUrl: tenant.logoUrl || '',
    faviconUrl: tenant.faviconUrl || '',
    fontFamily: tenant.fontFamily || 'Inter',
  };

  return (
    <TenantStyles
      primaryColor={tenantInfo.primaryColor}
      accentColor={tenantInfo.accentColor}
      secondaryColor={tenantInfo.secondaryColor}
      fontFamily={tenantInfo.fontFamily}
    >
      {children}
    </TenantStyles>
  );
}
