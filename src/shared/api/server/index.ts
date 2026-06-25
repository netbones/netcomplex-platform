export { db, runWithRLS, notDeleted, assertAddressUnique } from '../db';
export type { RLSContext, DbSchema } from '../db';
export { getRLSContext } from '../rls-context';
export {
  messages,
  conversations,
  conversationParticipants,
  users,
  profiles,
  settings,
  albums,
  standardSeats,
  soloSeats,
  properties,
  households,
  premiumSeats,
  contents,
  propertyListings,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  groups,
  groupMembers,
  surveys,
  questions,
  responses,
  surveySections,
  externalSurveys,
  invitations,
  bookings,
  maintenanceRequests,
  notifications,
  agentProfiles,
  propertyPremiumSeats,
  verifications,
  accounts,
  sessions,
  passkeys,
  twoFactors,
  members,
  organizations,
  tenants,
  events,
  eventAttendees,
  announcements,
  agentAccesses,
  platformSuspensions,
  communityMerits,
  groupMembershipRequests,
  platformModules,
  tenantModules,
  assistSessions,
  resources,
  resourceVersions,
  competitions,
  competitionEntries,
  contentLikes,
  maintenanceTeams,
  serviceProviders,
  maintenanceCategories,
  requestNotes,
  requestHistories,
  providerVerifications,
  providerLegalAgreements,
  providerReputations,
  providerMerits,
  subscriptionTiers,
  providerSubscriptions,
  paymentTransactions,
  providerCharges,
  providerInvoices,
  revenueRecords,
  platformAiTierQuotas,
  aiCapabilityCosts,
  tenantAiUsages,
  aiUsageEvents,
} from '../db';
export { auth } from '../auth';
export {
  getSessionAndRole,
  requireNotSuspended,
  requireAnyPermission,
  throwIfSuspended,
} from '../auth-utils';
export type { SuspensionInfo, SessionAndRole } from '../auth-utils';
export {
  revalidateDashboard,
  revalidateDirectory,
  revalidateContent,
  revalidateConversations,
  revalidateAdminChanges,
  revalidateUserData,
  revalidateGate,
} from '../revalidation';
export { CACHE_TAGS } from '../revalidation';
export { rateLimitByKey, rateLimitByIP, rateLimitByUser } from '../rate-limit';
export { DEFAULT_RATE_LIMITS } from '../rate-limit';
export type { RateLimitConfig } from '../rate-limit';
export { writeAuditLog } from '../audit-log';
export type { AuditAction, AuditLogEntry } from '../audit-log';
export { supabase } from '../supabase';
export { getDashboardStats, getStaticStats, getUserContent } from '../data-fetching';
export {
  uploadImage,
  listUserImages,
  deleteImage,
  validateImage,
  uploadTenantImage,
  listTenantImages,
  deleteTenantImage,
} from '../storage';
export type { UploadResult, MediaItem } from '../storage';
export { verifyTurnstile } from '../turnstile';
export { emitEvent, onEvent, offEvent } from '../events';
export type { DomainEvent, EventType } from '../events';
export { now, setClock } from '../clock';
export { getRequestId, createLogContext, withTiming } from '../observability';
export type { RequestLogContext } from '../observability';
export {
  ERROR_CODES,
  apiSuccess,
  apiError,
  apiPaginated,
  apiCreated,
  apiNoContent,
  apiUnauthorized,
  apiForbidden,
  apiTenantRequired,
  apiTenantForbidden,
  apiValidationError,
  apiNotFound,
  apiSuspendedUser,
  apiConflict,
  apiGone,
  apiInternalError,
} from '../api-response';
export { withErrorHandler } from '../with-error-handler';
export type {
  CanonicalErrorCode,
  ApiPaginatedMeta,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
} from '../api-response';
export {
  createContext,
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  agentProcedure,
} from '../trpc/server';
export type { Context } from '../trpc/server';
// appRouter/AppRouter NOT re-exported here to avoid circular dependency:
//   identity.ts → @api/server → routers.ts → @server/routers → identity.ts
// Import them directly from '@api/trpc/routers' instead.
export { sendEmail } from '../email/resend';
export { templates } from '../email/templates';
export type { TemplateKey } from '../email/templates';
export { getTenantModule } from '@entities/tenant/server';
