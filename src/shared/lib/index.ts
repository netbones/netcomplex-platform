export {
  hasPermission,
  isAdmin,
  canManageUsers,
  canManageRequests,
  canManageContent,
  canManageGroups,
  canManageOwnGroupOnly,
  canManageEvents,
  canManageBookings,
  canAccessDirectory,
  canManageSettings,
  canAccessHouseholds,
  getPermissions,
  canPublishAnnouncements,
  requireRole,
  ROLE_PERMISSIONS,
  type Permission,
} from './permissions';
export * from './types';
export type { PlatformPageFlags, HeaderLinkId } from './types/platform-page-flags';
export * from './utils';
export * from './logger';
export {
  supportedLanguages,
  defaultLanguage,
  getLocalizedValue,
  getLocalizedContent,
  languageNames,
  getContentLocales,
  type SupportedLanguage,
} from './i18n/config';
export * from './constants';
export * from './constants/tiers';
// NOTE: Do NOT export './i18n' here — it imports react-i18next (createContext) and
// i18next-browser-languagedetector which are client-only. Import directly:
//   import { supportedLanguages, ... } from '@shared/lib/i18n'
// NOTE: useContactSettings and useApiToast are client-only hooks.
export { tenantConfig, type TenantConfig } from './tenant-config/tenant';
export { useSafeTranslation } from './hooks/useSafeTranslation';
export { userProfileSchema, type UserProfileFormData } from './schemas/user-profile';
export {
  signAgentToken,
  hashToken,
  validateToken,
  parseAgentToken,
  verifyAndDecodeToken,
  selectVerifier,
  jwtVerifier,
  type CredentialVerifier,
} from './agent-token';
// NOTE: Client-only hooks (useApiToast, usePageFlags, usePageLoading) are
// in @shared/lib/hooks — import from that sub-barrel to avoid pulling
// client-side code (sonner, react context) into server bundles:
//   import { useApiToast } from '@shared/lib/hooks'
// NOTE: Do NOT export sanitizeHtml here.
// Client: import { sanitizeHtml } from '@shared/lib/sanitize'
// Server: import { sanitizeHtml } from '@shared/lib/sanitize/server'
// Import them directly from their source files to avoid pulling
// client-side code (sonner, react context) into server bundles:
//   import { useContactSettings } from '@shared/lib/hooks/useContactSettings'
