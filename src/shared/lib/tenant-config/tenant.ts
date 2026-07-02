/**
 * Tenant-specific configuration
 * These values should be loaded from tenant settings in a multi-tenant deployment
 */

export const tenantConfig = {
  // Default tenant slug for local development
  defaultSlug: process.env.LOCAL_TENANT_SLUG || 'soralia',

  // Location for weather widgets (e.g., WeatherWidget uses Open-Meteo API)
  location: {
    latitude: parseFloat(process.env.TENANT_LATITUDE || '26.6619'),
    longitude: parseFloat(process.env.TENANT_LONGITUDE || '-80.6128'),
    name: process.env.TENANT_LOCATION_NAME || 'Soralia Village',
  },

  // Auth configuration
  auth: {
    cookiePrefix: process.env.AUTH_COOKIE_PREFIX || 'soralia',
    issuer: 'Soralia Village',
    // Allow dev origins in development, configurable in production
    allowedHosts:
      process.env.NODE_ENV === 'production'
        ? (() => {
            const envHosts = (process.env.AUTH_ALLOWED_HOSTS || '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);

            const vercelHost = (() => {
              const url = process.env.NEXT_PUBLIC_VERCEL_URL || '';
              if (!url) return null;
              try {
                return new URL(url.startsWith('http') ? url : `https://${url}`).host;
              } catch {
                return null;
              }
            })();

            // Better Auth requires at least one allowed host.
            return envHosts.length > 0
              ? envHosts
              : ([vercelHost, '*.vercel.app', 'localhost:3000'].filter(Boolean) as string[]);
          })()
        : [
            'soralia.com',
            'www.soralia.com',
            'soralia.org',
            'soralia.co.za',
            'solaris.co.za',
            '*.vercel.app',
            '*.netbones.co.za',
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
