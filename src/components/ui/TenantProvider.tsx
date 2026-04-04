'use client';

import { headers } from 'next/headers';
import { TenantStyles } from '@/components/ui/TenantStyles';
import { use } from 'react';

interface TenantProviderProps {
  children: React.ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const headersList = use(headers());

  const tenantInfo = {
    id: headersList.get('x-tenant-id') || '',
    name: headersList.get('x-tenant-name') || 'Soralia Village',
    slug: headersList.get('x-tenant-slug') || 'soralia',
    primaryColor: headersList.get('x-primary-color') || '#4F46E5',
    accentColor: headersList.get('x-accent-color') || '#F59E0B',
    secondaryColor: headersList.get('x-secondary-color') || '#10B981',
    logoUrl: headersList.get('x-logo-url') || '',
    faviconUrl: headersList.get('x-favicon-url') || '',
    fontFamily: headersList.get('x-font-family') || 'Inter',
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
