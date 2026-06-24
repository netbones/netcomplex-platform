// Server-only public API barrel for @entities/tenant.
// Import from here in API routes, server components, and server-side utilities.
// Client components must use the default barrel (@entities/tenant).
//
// See ADR-020 and docs/advisories/ADVISORY-008.md for rationale.

export {
  getCurrentTenant,
  getTenantById,
  getTenantBySlug,
  getTenantByDomain,
  getTenantByUserId,
  listTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  drizzleTenantFilter,
  tenantQueries,
} from './api/base';

export { withTenant, withTenantOptional } from './api/with-tenant';

export { requirePlatformAdmin } from './api/guards';
export { requireAssistScope } from './api/assist-scope-guard';

// Types and mapping tables — importable by client code without server deps.
// See @entities/tenant/api/gate/mappings.ts for the canonical definitions.
export {
  type FeatureKey,
  type GateResult,
  type GateContext,
  type GateReason,
  FEATURE_TO_FLAG,
  FEATURE_TO_REGISTRY,
  FEATURE_TO_MODULE,
  GATE_REASON_TO_ERROR,
} from './api/gate/mappings';

export { canAccess, resolveGateContext } from './api/gate/gate';

export { assertModuleEnabled } from './api/gate/feature-gate';
export { isModuleEnabled } from './lib/modules';

export {
  getPlatformPageFlags,
  setPlatformPageFlag,
  type PlatformPageFlags,
  getPlatformPageFlagsWithTx,
  setPlatformPageFlagWithTx,
} from './api/flags/platform-flags';

export { getStatsigExperimentFlags } from './api/flags/statsig-flags';

export {
  getServicesConfig,
  getServicesConfigWithTx,
  upsertServicesConfig,
  defaultServicesConfig,
  type ServicesPageConfig,
  type CategoryConfig,
  type EmergencyContactConfig,
  type HourConfig,
  type AdditionalServiceConfig,
} from './api/flags/services-config';

export { SETTINGS_KEYS } from './api/settings';
export {
  getProviderRegistrationMode,
  getProviderRegistrationModeImpl,
  setProviderRegistrationMode,
} from './api/provider-registration-mode';

export { servicesConfigSchema, type ServicesConfigFormData } from './schema';
