export {
  signUpEmailSchema,
  signInEmailSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
} from '../auth-schemas';

export {
  generateWordSlug,
  generateNameSlug,
  generateUniqueNameSlug,
  generateHybridSlug,
  generateProfileSlug,
} from '../slug';
export type { ContentCategory, ContentLicense, ModerationStatus } from '../types';
export { ContentCategoryEnum, ContentLicenseEnum, ModerationStatusEnum } from '../types';
export { apiGet, apiPost, apiPatch, apiDelete } from '../http-client';
export { ApiClientError } from '../http-client';
export { supabase } from '../supabase';
// NOTE: DTO exports moved to @api/server (server-only). Client code must not import
// Zod schemas that depend on drizzle tables via db.ts (which requires server-only).
// Server: import { contentDto } from '@api/server'
// NOTE: logDelegationAction is server-only (db dependency).
// Server: import { logDelegationAction } from '@api/shared/delegations'
