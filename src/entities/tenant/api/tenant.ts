/**
 * Tenant-specific configuration
 * Re-exported from @shared/lib/config/tenant to break FSD layer inversion.
 * The canonical definition lives in shared/lib where it's accessible to all layers.
 */
import { tenantConfig, type TenantConfig } from '@shared/lib';

export { tenantConfig, type TenantConfig };
