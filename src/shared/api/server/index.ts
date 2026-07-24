export { db, runWithRLS, notDeleted, assertAddressUnique } from '../db';
export type { RLSContext, DbSchema } from '../db';
export { getRLSContext } from '../rls-context';
export { requireTenantRLS } from '../require-tenant-rls';

// ── Zod DTO schemas (ADR-024 — consolidated from server/dto) ──
export * from '../dto';

// ---------------------------------------------------------------------------
// Address Registry — service layer (Phase 46.2)
// ---------------------------------------------------------------------------

export {
  AddressService,
  AddressConflictError,
  AddressValidationError,
  AddressNotFoundError,
} from '../address-service';
export { HandleService, HandleConflictError, HandleNotFoundError } from '../handle-service';
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
  contentVersions,
  contentAuditLogs,
  dataConsents,
  dataRevenueStreams,
  dataShareBatches,
  dWallets,
  propertyListings,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  serviceBookings,
  groups,
  groupMembers,
  surveys,
  questions,
  responses,
  surveySections,
  supports,
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
  payoutRequests,
  tenants,
  events,
  eventAttendees,
  announcements,
  agentAccesses,
  platformSuspensions,
  communityMerits,
  groupMembershipRequests,
  platformModules,
  tenantFeatureFlags,
  tenantModules,
  assistSessions,
  resources,
  resourceVersions,
  competitions,
  competitionEntries,
  contentLikes,
  maintenanceTeams,
  maintenanceTeamMembers,
  serviceProviders,
  maintenanceCategories,
  bursaryFields,
  bursaries,
  requestNotes,
  internalMaintenanceNotes,
  requestHistories,
  providerVerifications,
  providerLegalAgreements,
  providerReputations,
  providerMerits,
  subscriptionTiers,
  providerSubscriptions,
  paymentTransactions,
  walletTransactions,
  providerCharges,
  providerInvoices,
  revenueRecords,
  platformAiTierQuotas,
  aiCapabilityCosts,
  tenantAiUsages,
  aiUsageEvents,
  disputeCases,
  disputeEvents,
  disputeEvidences,
  disputeMessageVersions,
  disputeMessages,
  disputeNotifications,
  mediaUploads,
  outboxes,
  outboxDeadLetters,
  residentDelegations,
  agentTokens,
  delegationActions,
  addresses,
  handles,
  addressEndpoints,
  tenantSetups,
  setupMissions,
  setupSettings,
  meetingProxies,
} from '../db';
export { auth } from '../auth';
export {
  getSessionAndRole,
  guardSuspension,
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
export { rateLimitByKey, rateLimitByIP, rateLimitByUser, DEFAULT_RATE_LIMITS } from '../rate-limit';
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
  uploadDocument,
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
} from '../storage';
export type { UploadResult, MediaItem } from '../storage';
export { verifyTurnstile } from '../turnstile';
export {
  emitEvent,
  onEvent,
  offEvent,
  emitDomainEvent,
  dispatchOutbox,
  registerHandler,
} from '../events';
export type {
  DomainEvent,
  EventType,
  DomainEventEnvelope,
  EventHandler,
  EmitContext,
} from '../events';
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
  toEnvelope,
  toEnvelopeSchema,
  toPaginatedEnvelope,
  toErrorEnvelope,
  tRPCCodeToCanonical,
} from '../envelope';
export type { ApiEnvelope, ApiErrorEnvelope, ApiResult, PaginatedMeta } from '../envelope';
export {
  createContext,
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  agentProcedure,
  tenantProcedure,
  privilegedProcedure,
  moduleProcedure,
  privilegedModuleProcedure,
  rateLimitMiddleware,
} from '../trpc/server';
export type { Context, TRPCMeta } from '../trpc/server';
// appRouter/AppRouter NOT re-exported here to avoid circular dependency:
//   identity.ts → @api/server → routers.ts → @server/routers → identity.ts
// Import them directly from '@api/trpc/routers' instead.
export { sendEmail } from '../email/resend';
export { templates } from '../email/templates';
export type { TemplateKey } from '../email/templates';
export { getTenantModule } from '@entities/tenant/server';

// Tenant billing
export type {
  TenantBillingActionError,
  TenantBillingActionSuccess,
  TenantBillingActionResult,
} from '../tenant-billing';
export {
  createTenantSubscriptionCheckout,
  cancelTenantSubscription,
  upgradeTenantSubscription,
  downgradeTenantSubscription,
  getTenantBillingSnapshot,
  markTransactionCompletedByReference,
  markTransactionFailedByReference,
  syncTierToTenant,
  recordBillingEvent,
  ensureOverageInvoiceRecord,
  getOrCreateDefaultBillingPlans,
} from '../tenant-billing';

// AI Provider — platform pool
export {
  getAiProvider,
  getPoolProviderConfig,
  isAiCapabilityEnabled,
  checkQuota,
  recordUsage,
  getCurrentBillingMonth,
} from '../ai';
export type { AiProvider, AiCompletionOptions, AiCompletionResult, AiCapabilityKey } from '../ai';
export { AI_MODELS } from '../ai';
