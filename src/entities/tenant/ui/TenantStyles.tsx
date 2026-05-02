'use client';

import { useEffect, ReactNode } from 'react';

interface TenantStylesProps {
  children?: ReactNode;
  primaryColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
}

export function TenantStyles({
  children,
  primaryColor = '#4F46E5',
  accentColor = '#F59E0B',
  secondaryColor = '#10B981',
  fontFamily = 'Inter',
}: TenantStylesProps) {
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
    document.documentElement.style.setProperty('--font-family', fontFamily);
  }, [primaryColor, accentColor, secondaryColor, fontFamily]);

  return <>{children}</>;
}
