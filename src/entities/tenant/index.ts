export * from './ui/FeatureGate';
export * from './ui/TenantProvider';
export * from './ui/TenantStyles';
export * from './lib/registry';
// Client-safe API exports only
export * from './api/context';
export * from './api/use-enabled-modules';
export * from './api/types';
// NOTE: Server-only API functions (base.ts, with-tenant.ts) are not exported here
// They should be imported directly in server components or API routes to avoid
// client-side import issues with server-only dependencies
