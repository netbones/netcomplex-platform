// UI components - now safe to export with Zustand
export * from './ui/FeatureGate';
export * from './ui/TenantProvider';
export * from './ui/TenantStyles';
export * from './lib/registry';
export * from './lib/navigation-config';
export { isModuleEnabled, getEnabledModules } from './lib/modules';
export * from './api/features/registry';
export * from './api/tenant';
export * from './model/types';
export * from './schema';

// Server-only exports (keep grouped for clarity)
// Note: importing these from the barrel in client components will cause build errors.
export * from './api/with-tenant';
export * from './api/flags/platform-flags';
export * from './api/flags/statsig-flags';
export * from './api/settings';
export * from './api/base';
export * from './api/guards';
export * from './api/assist-scope-guard';
export * from './api/gate/gate';
export { assertModuleEnabled } from './api/gate/feature-gate';

import type { PlatformPageFlags } from './api/flags/platform-flags';
export type { PlatformPageFlags };
