'use client';

import { useEffect } from 'react';
import { TenantStyles } from './TenantStyles';
import { useTenantStore } from '../api/context';
import type { Tenant } from '@shared/lib';

const FALLBACK_NAME = 'Netcomplex';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  address: string;
  telephone: string;
  email: string;
  governanceLabel: string;
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
  const setTenant = useTenantStore(state => state.setTenant);
  const setLoading = useTenantStore(state => state.setLoading);

  useEffect(() => {
    setTenant({
      id: tenant.id || '',
      name: tenant.name || FALLBACK_NAME,
      slug: tenant.slug || '',
      tagline: tenant.tagline || '',
      description: tenant.description || '',
      address: tenant.address || '',
      telephone: tenant.telephone || '',
      email: tenant.email || '',
      governanceLabel: tenant.governanceLabel || 'Homeowners Association',
      primaryColor: tenant.primaryColor || '#4F46E5',
      accentColor: tenant.accentColor || '#F59E0B',
      secondaryColor: tenant.secondaryColor || '#10B981',
      logoUrl: tenant.logoUrl || '',
      faviconUrl: tenant.faviconUrl || '',
      fontFamily: tenant.fontFamily || 'Inter',
    } as Tenant);
    setLoading(false);
  }, [tenant, setTenant, setLoading]);

  const tenantInfo = {
    id: tenant.id || '',
    name: tenant.name || FALLBACK_NAME,
    slug: tenant.slug || '',
    tagline: tenant.tagline || '',
    description: tenant.description || '',
    address: tenant.address || '',
    telephone: tenant.telephone || '',
    email: tenant.email || '',
    governanceLabel: tenant.governanceLabel || 'Homeowners Association',
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
