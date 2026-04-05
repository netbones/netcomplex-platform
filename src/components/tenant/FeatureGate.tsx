'use client';

import { useTenant } from '@/lib/tenant/context'; // you'll create this
import { isFeatureEnabled } from '@/lib/features/registry';

export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const tenant = useTenant();
  if (!tenant || !isFeatureEnabled(tenant, feature)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
