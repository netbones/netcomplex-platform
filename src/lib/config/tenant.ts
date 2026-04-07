/**
 * Tenant-specific configuration
 * These values should be loaded from tenant settings in a multi-tenant deployment
 */

export const tenantConfig = {
  // Default tenant slug for local development
  defaultSlug: process.env.LOCAL_TENANT_SLUG || 'soralia',

  // Auth configuration
  auth: {
    cookiePrefix: process.env.AUTH_COOKIE_PREFIX || 'soralia',
    issuer: 'Soralia Village',
    // Allow dev origins in development, configurable in production
    allowedHosts:
      process.env.NODE_ENV === 'production'
        ? process.env.AUTH_ALLOWED_HOSTS?.split(',') || []
        : [
            'soralia.com',
            'www.soralia.com',
            'soralia.org',
            '*.vercel.app',
            'localhost:3000',
            'localhost:3001',
          ],
  },

  // Storage configuration
  storage: {
    region: process.env.STORAGE_REGION || 'eu-west-3',
    bucket: process.env.STORAGE_BUCKET || 'content-images',
  },
} as const;

export type TenantConfig = typeof tenantConfig;
