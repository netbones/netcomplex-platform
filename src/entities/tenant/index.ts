// UI components - now safe to export with Zustand
export * from './ui/TenantProvider';
export * from './ui/TenantStyles';
export * from './lib/registry';
export * from './lib/navigation-config';
export * from './api/features/registry';
export * from './api/tenant';
export * from './model/types';
export * from './schema';
export { useTenant, useTenantLoading, useTenantActions, useTenantStore } from './api/context';

export type {
  CategoryConfig,
  EmergencyContactConfig,
  HourConfig,
  AdditionalServiceConfig,
  ServicesPageConfig,
} from './api/flags/services-config.types';

export type { CarouselItem, HeroCarouselConfig } from './api/flags/hero-carousel.types';

export type { FeatureKey, GateResult, GateContext, GateReason } from './api/gate/mappings';

// Server-only exports removed from barrel (causes client build errors).
// Import server-only modules directly from their module paths:
//   @entities/tenant/api/with-tenant
//   @entities/tenant/api/flags/platform-flags
//   @entities/tenant/api/flags/statsig-flags
//   @entities/tenant/api/settings
//   @entities/tenant/api/base
//   @entities/tenant/api/guards
//   @entities/tenant/api/assist-scope-guard
//   @entities/tenant/api/gate/gate
//   @entities/tenant/api/gate/feature-gate
