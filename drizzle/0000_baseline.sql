CREATE TYPE "public"."AchievementCategory" AS ENUM('ENGAGEMENT', 'CONTRIBUTION', 'MILESTONE');--> statement-breakpoint
CREATE TYPE "public"."AddressKind" AS ENUM('STANDARD', 'ALIAS', 'SOLO', 'PREMIUM', 'PROVIDER', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."AddressOwnerType" AS ENUM('STANDARD_SEAT', 'PROFILE', 'SOLO_SEAT', 'PREMIUM_SEAT', 'PROPERTY', 'PROVIDER', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."AddressStatus" AS ENUM('ACTIVE', 'RESERVED', 'COOLING_OFF', 'ARCHIVED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."AgentAccessLevel" AS ENUM('VIEW_ONLY', 'MANAGEMENT', 'FULL_ACCESS');--> statement-breakpoint
CREATE TYPE "public"."AiOveragePolicy" AS ENUM('HARD_STOP', 'THROTTLE', 'SURCHARGE');--> statement-breakpoint
CREATE TYPE "public"."AiUsageStatus" AS ENUM('ACTIVE', 'SETTLED', 'OVERRIDDEN');--> statement-breakpoint
CREATE TYPE "public"."BatchStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."BehaviorCategory" AS ENUM('COMMUNITY_SERVICE', 'VOLUNTEERISM', 'MAINTENANCE', 'NOISE', 'PARKING', 'SECURITY', 'PETS', 'COMPLIANCE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."BehaviorRecordStatus" AS ENUM('ACTIVE', 'DISPUTED', 'UPHELD', 'OVERTURNED');--> statement-breakpoint
CREATE TYPE "public"."BehaviorType" AS ENUM('MERIT', 'WARNING', 'INFRACTION');--> statement-breakpoint
CREATE TYPE "public"."BillingAdjustmentType" AS ENUM('CREDIT', 'DEBIT', 'DISCOUNT');--> statement-breakpoint
CREATE TYPE "public"."BillingEventType" AS ENUM('SUBSCRIPTION_CREATED', 'SUBSCRIPTION_RENEWED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PLAN_UPGRADED', 'PLAN_DOWNGRADED', 'AI_OVERAGE_CHARGED');--> statement-breakpoint
CREATE TYPE "public"."BillingPlanInterval" AS ENUM('MONTHLY', 'ANNUAL');--> statement-breakpoint
CREATE TYPE "public"."BookingPaymentStatus" AS ENUM('PENDING', 'COMPLETED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."BookingStatus" AS ENUM('CONFIRMED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."BursaryStatus" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."CommentStatus" AS ENUM('PUBLISHED', 'HIDDEN', 'FLAGGED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."CommentVoteType" AS ENUM('UPVOTE', 'DOWNVOTE');--> statement-breakpoint
CREATE TYPE "public"."CompetitionStatus" AS ENUM('DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."CompetitionType" AS ENUM('RAFFLE', 'PHOTO', 'SCORE');--> statement-breakpoint
CREATE TYPE "public"."ContentAuditAction" AS ENUM('CREATED', 'UPDATED', 'PUBLISHED', 'UNPUBLISHED', 'FLAGGED', 'DELETED', 'RESTORED');--> statement-breakpoint
CREATE TYPE "public"."ContentCategory" AS ENUM('ANNOUNCEMENT', 'NEWS', 'EVENT', 'BLOG', 'CONSERVATION', 'SERVICES', 'CAMPAIGN', 'LEGAL');--> statement-breakpoint
CREATE TYPE "public"."ContentLicense" AS ENUM('CC0', 'CC_BY', 'CC_BY_SA', 'CC_BY_NC', 'ALL_RIGHTS_RESERVED');--> statement-breakpoint
CREATE TYPE "public"."ConversationType" AS ENUM('DIRECT', 'GROUP', 'SECURE_DIRECT', 'SECURE_GROUP');--> statement-breakpoint
CREATE TYPE "public"."CouponDiscountType" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."CredentialType" AS ENUM('EMAIL', 'PASSKEY', 'NOSTR', 'LNURL', 'OIDC');--> statement-breakpoint
CREATE TYPE "public"."DelegationStatus" AS ENUM('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."DisputeCategory" AS ENUM('NOISE', 'PETS', 'PARKING', 'BOUNDARIES', 'COMMON_PROPERTY', 'LEVY_DISPUTE', 'RULE_ENFORCEMENT', 'GOVERNANCE', 'CONDUCT', 'DAMAGE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."DisputeEventType" AS ENUM('CREATED', 'SUBMITTED', 'ASSIGNED', 'MEDIATION_OFFERED', 'MEDIATION_ACCEPTED', 'MEDIATION_DECLINED', 'MEDIATION_CONCLUDED', 'RULING_ISSUED', 'RESOLVED', 'WITHDRAWN', 'ESCALATED_CSOS', 'CSOS_CLOSED', 'NOTE_ADDED', 'EVIDENCE_ADDED', 'STATUS_CHANGED');--> statement-breakpoint
CREATE TYPE "public"."DisputeRespondent" AS ENUM('RESIDENT', 'HOA', 'BOARD_MEMBER', 'TENANT_PROVIDER');--> statement-breakpoint
CREATE TYPE "public"."DisputeSeverity" AS ENUM('MINOR', 'MODERATE', 'SERIOUS', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."DisputeStatus" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MEDIATION_OFFERED', 'MEDIATION_ACTIVE', 'MEDIATED_RESOLVED', 'FORMAL_RULING', 'RESOLVED', 'WITHDRAWN', 'ESCALATED_CSOS', 'CSOS_CLOSED');--> statement-breakpoint
CREATE TYPE "public"."DueDiligenceDocumentCategory" AS ENUM('IDENTITY_DOC', 'BUSINESS_LICENSE', 'INSURANCE', 'REFERENCE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."DueDiligenceItemStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."EndpointType" AS ENUM('INTERNAL_CHAT', 'EMAIL', 'WEBFORM', 'API', 'SMS', 'WHATSAPP', 'PUSH');--> statement-breakpoint
CREATE TYPE "public"."EntryStatus" AS ENUM('JOINED', 'WITHDRAWN', 'WINNER', 'RUNNER_UP');--> statement-breakpoint
CREATE TYPE "public"."ForwardStrategy" AS ENUM('DIRECT', 'HOUSEHOLD');--> statement-breakpoint
CREATE TYPE "public"."GroupAccess" AS ENUM('OPEN', 'INVITE_ONLY', 'APPLICATION');--> statement-breakpoint
CREATE TYPE "public"."GroupRole" AS ENUM('MEMBER', 'MODERATOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."HandleStatus" AS ENUM('ACTIVE', 'RESERVED', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."HouseholdRole" AS ENUM('OCCUPANT', 'MINOR', 'FAMILY');--> statement-breakpoint
CREATE TYPE "public"."HouseholdStatus" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."InquiryStatus" AS ENUM('PENDING', 'RESPONDED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."InvitationStatus" AS ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."InvoiceStatus" AS ENUM('PENDING', 'PAID', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."ListingStatus" AS ENUM('DRAFT', 'ACTIVE', 'PENDING', 'SOLD', 'RENTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."ListingType" AS ENUM('SALE', 'RENT', 'LEASE');--> statement-breakpoint
CREATE TYPE "public"."MaintenanceRouting" AS ENUM('HOA', 'LANDLORD');--> statement-breakpoint
CREATE TYPE "public"."MembershipStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."MessageType" AS ENUM('TEXT', 'IMAGE', 'SYSTEM', 'VOICE', 'FILE');--> statement-breakpoint
CREATE TYPE "public"."ModerationStatus" AS ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'FLAGGED');--> statement-breakpoint
CREATE TYPE "public"."NotificationType" AS ENUM('info', 'warning', 'success', 'error');--> statement-breakpoint
CREATE TYPE "public"."OccupancyType" AS ENUM('OWNER_OCCUPIED', 'RENTAL', 'VACANT');--> statement-breakpoint
CREATE TYPE "public"."PaymentGateway" AS ENUM('PAYSTACK', 'PAYPAL');--> statement-breakpoint
CREATE TYPE "public"."PayoutStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."PriceType" AS ENUM('FIXED', 'HOURLY', 'QUOTE', 'FREE');--> statement-breakpoint
CREATE TYPE "public"."Priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');--> statement-breakpoint
CREATE TYPE "public"."ProfileStatus" AS ENUM('ACTIVE', 'UPGRADED', 'REMOVED', 'EVICTED', 'LEASE_ENDED');--> statement-breakpoint
CREATE TYPE "public"."ProviderChargeStatus" AS ENUM('PENDING', 'PAID', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."ProviderDueDiligenceStatus" AS ENUM('PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."ProviderEmploymentType" AS ENUM('IN_HOUSE', 'EXTERNAL');--> statement-breakpoint
CREATE TYPE "public"."ProviderMeritType" AS ENUM('RESPONSE_TIME', 'SERVICE_QUALITY', 'REVIEW_RATING', 'COMPLIANCE', 'ENGAGEMENT', 'REFERENCE');--> statement-breakpoint
CREATE TYPE "public"."ProviderType" AS ENUM('COMMUNITY', 'THIRD_PARTY');--> statement-breakpoint
CREATE TYPE "public"."ProviderVerificationStatus" AS ENUM('PENDING', 'PROBATION', 'VERIFIED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."ProxyStatus" AS ENUM('Draft', 'WaitingForUpload', 'WaitingForProxy', 'PendingHoaReview', 'Approved', 'Rejected', 'Withdrawn');--> statement-breakpoint
CREATE TYPE "public"."QuestionType" AS ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'RATING', 'YES_NO', 'LINEAR_SCALE');--> statement-breakpoint
CREATE TYPE "public"."ReportReason" AS ENUM('SPAM', 'HARASSMENT', 'MISINFORMATION', 'HATE_SPEECH', 'VIOLENCE', 'NSFW', 'IMPERSONATION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."ReportResolution" AS ENUM('DISMISSED', 'COMMENT_REMOVED', 'USER_WARNED', 'USER_SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."RequestStatus" AS ENUM('SUBMITTED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'PENDING_PARTS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."ResidencyType" AS ENUM('FAMILY', 'RENTER', 'OWNER');--> statement-breakpoint
CREATE TYPE "public"."ResidentFilter" AS ENUM('ALL', 'OWNERS_ONLY', 'RENTERS_ONLY');--> statement-breakpoint
CREATE TYPE "public"."ResourceCategory" AS ENUM('ARCHITECTURAL', 'ENGINEERING', 'GOVERNANCE', 'BOARD_REPORT', 'DIY', 'FINANCIAL', 'LEGAL', 'OTHER', 'EDUCATION');--> statement-breakpoint
CREATE TYPE "public"."ResourceMediaType" AS ENUM('BOOK', 'COURSE', 'JOURNAL', 'VIDEO');--> statement-breakpoint
CREATE TYPE "public"."ResourceVisibility" AS ENUM('ALL_RESIDENTS', 'OWNERS_ONLY', 'BOARD_ONLY', 'COMMITTEE_ONLY');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('RESIDENT', 'GROUP_ADMIN', 'COMMITTEE', 'BOARD', 'ADMIN', 'AGENT', 'MANAGER', 'ASSOCIATE', 'PROVIDER', 'USER');--> statement-breakpoint
CREATE TYPE "public"."SeatStatus" AS ENUM('ACTIVE', 'ARCHIVED', 'COOLING_OFF');--> statement-breakpoint
CREATE TYPE "public"."ServiceBookingStatus" AS ENUM('PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."SettingValueType" AS ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON');--> statement-breakpoint
CREATE TYPE "public"."SignatureProvider" AS ENUM('INTERNAL', 'DOCUSIGN', 'ADOBE_SIGN', 'PGP', 'GOV_EID');--> statement-breakpoint
CREATE TYPE "public"."SoloSeatType" AS ENUM('RESIDENT', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionStatus" AS ENUM('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."SupportTarget" AS ENUM('CONTENT', 'RESOURCE', 'EVENT', 'GROUP', 'SERVICE', 'PROJECT', 'CAMPAIGN', 'PROFILE');--> statement-breakpoint
CREATE TYPE "public"."SurveyStatus" AS ENUM('DRAFT', 'ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."SurveyType" AS ENUM('INTERNAL', 'EXTERNAL');--> statement-breakpoint
CREATE TYPE "public"."SuspensionType" AS ENUM('NON_PAYMENT', 'VIOLATION', 'DISRUPTION', 'PROPERTY', 'BEHAVIOR', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."TenantSubscriptionStatus" AS ENUM('ACTIVE', 'PENDING', 'CANCELLED', 'EXPIRED', 'TRIALING', 'PAST_DUE');--> statement-breakpoint
CREATE TYPE "public"."Tier" AS ENUM('STANDARD', 'PREMIUM', 'ENTERPRISE');--> statement-breakpoint
CREATE TYPE "public"."TransactionSource" AS ENUM('RESIDENT_DATA_SHARE', 'COMMUNITY_MERITS', 'REFERRAL_REWARD', 'VOLUNTEER_CREDIT', 'AI_CREDIT', 'MARKETPLACE_CREDIT', 'COMMUNITY_SUPPORT');--> statement-breakpoint
CREATE TYPE "public"."TransactionStatus" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."TransactionType" AS ENUM('CREDIT', 'DEBIT', 'ROLLOVER', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."WalletStatus" AS ENUM('ACTIVE', 'FROZEN', 'CLOSED');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp (3),
	"refreshTokenExpiresAt" timestamp (3),
	"scope" text,
	"password" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AchievementDefinition" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"icon" text,
	"eventType" text NOT NULL,
	"threshold" integer DEFAULT 1 NOT NULL,
	"category" "AchievementCategory" DEFAULT 'ENGAGEMENT' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "AddressEndpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"addressId" text NOT NULL,
	"type" "EndpointType" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Address" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"address" text NOT NULL,
	"localPart" text NOT NULL,
	"domain" text NOT NULL,
	"kind" "AddressKind" NOT NULL,
	"status" "AddressStatus" DEFAULT 'ACTIVE' NOT NULL,
	"ownerType" "AddressOwnerType",
	"ownerId" text,
	"canonicalAddressId" text,
	"forwardStrategy" "ForwardStrategy",
	"receiveExternal" boolean DEFAULT false NOT NULL,
	"coolingUntil" timestamp (3),
	"archivedUntil" timestamp (3),
	"releasedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AgentAccess" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"agentId" text NOT NULL,
	"propertyId" text NOT NULL,
	"grantedById" text NOT NULL,
	"accessLevel" "AgentAccessLevel" DEFAULT 'MANAGEMENT' NOT NULL,
	"startedAt" timestamp (3) DEFAULT now() NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"commissionRate" numeric(65, 30),
	"contractTerms" text,
	"organizationId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3),
	"acceptedAt" timestamp (3),
	"originalPermissions" text[] NOT NULL,
	"rejectedAt" timestamp (3),
	"revokedAt" timestamp (3),
	"status" "DelegationStatus" DEFAULT 'PENDING' NOT NULL,
	"permissions" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AgentProfile" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"agentId" text NOT NULL,
	"agencyName" text,
	"licenseNumber" text,
	"experienceYears" integer DEFAULT 0 NOT NULL,
	"specializations" text[] NOT NULL,
	"serviceAreas" text[] NOT NULL,
	"totalListings" integer DEFAULT 0 NOT NULL,
	"activeListings" integer DEFAULT 0 NOT NULL,
	"salesCompleted" integer DEFAULT 0 NOT NULL,
	"avgSalePrice" numeric(65, 30),
	"rating" double precision DEFAULT 0 NOT NULL,
	"reviewCount" integer DEFAULT 0 NOT NULL,
	"commissionRate" numeric(65, 30),
	"responseTime" integer DEFAULT 24 NOT NULL,
	"isVerified" boolean DEFAULT false NOT NULL,
	"verificationDate" timestamp (3),
	"organizationId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "AgentReview" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"agentProfileId" text NOT NULL,
	"reviewerId" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"serviceDate" timestamp (3),
	"responseQuality" integer,
	"isPublished" boolean DEFAULT true NOT NULL,
	"moderatedBy" text,
	"moderatedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "AgentToken" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"agentId" text NOT NULL,
	"issuedById" text NOT NULL,
	"accessId" text,
	"name" text NOT NULL,
	"tokenHash" text NOT NULL,
	"scope" jsonb NOT NULL,
	"credentialType" text DEFAULT 'jwt_es256' NOT NULL,
	"credentialMeta" jsonb,
	"expiresAt" timestamp (3) NOT NULL,
	"lastUsedAt" timestamp (3),
	"revokedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AiCapabilityCost" (
	"id" text PRIMARY KEY NOT NULL,
	"capability" text NOT NULL,
	"estimatedTokens" integer NOT NULL,
	"maxTokens" integer NOT NULL,
	"notes" text,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AiUsageEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"usageId" text NOT NULL,
	"capability" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"inputTokens" integer NOT NULL,
	"outputTokens" integer NOT NULL,
	"totalTokens" integer NOT NULL,
	"userId" text,
	"referenceId" text,
	"durationMs" integer,
	"success" boolean DEFAULT true NOT NULL,
	"errorCode" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"estimatedCostUSD" numeric(65, 30) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Album" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"isPublic" boolean DEFAULT false NOT NULL,
	"mediaIds" text[] NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Announcement" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"title" jsonb NOT NULL,
	"content" text NOT NULL,
	"author" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"targetFilter" "ResidentFilter" DEFAULT 'ALL' NOT NULL,
	"targetRoles" "Role"[] NOT NULL,
	"resourceId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"expiresAt" timestamp (3),
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "AssistSession" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"staffId" text NOT NULL,
	"scope" text DEFAULT 'metadata' NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"revokedAt" timestamp (3),
	"revokedBy" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "BillingAdjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"subscriptionId" text,
	"invoiceId" text,
	"type" "BillingAdjustmentType" NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"reason" text,
	"appliedAt" timestamp (3) DEFAULT now() NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BillingEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"subscriptionId" text,
	"planId" text,
	"eventType" "BillingEventType" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BillingPlan" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"monthlyPrice" numeric(65, 30) DEFAULT '0' NOT NULL,
	"annualPrice" numeric(65, 30) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"interval" "BillingPlanInterval" DEFAULT 'MONTHLY' NOT NULL,
	"modulesIncluded" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pageLimits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seatLimits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"aiQuota" integer DEFAULT 0 NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tier" "Tier" DEFAULT 'STANDARD' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Booking" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"propertyId" text,
	"userId" text NOT NULL,
	"facility" text NOT NULL,
	"date" timestamp (3) NOT NULL,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"purpose" text,
	"status" "BookingStatus" DEFAULT 'CONFIRMED' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Bursary" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"title" text NOT NULL,
	"funder" text NOT NULL,
	"fieldId" text NOT NULL,
	"amount" text NOT NULL,
	"description" text NOT NULL,
	"applyUrl" text,
	"deadline" timestamp (3) NOT NULL,
	"status" "BursaryStatus" DEFAULT 'DRAFT' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "BursaryField" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "CommentReport" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"commentId" text NOT NULL,
	"reporterId" text NOT NULL,
	"reason" "ReportReason" NOT NULL,
	"note" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"resolvedAt" timestamp (3),
	"resolvedBy" text,
	"resolution" "ReportResolution"
);
--> statement-breakpoint
CREATE TABLE "CommentVote" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"commentId" text NOT NULL,
	"userId" text NOT NULL,
	"type" "CommentVoteType" NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Comment" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"contentId" text NOT NULL,
	"authorId" text NOT NULL,
	"parentId" text,
	"rootId" text,
	"body" text NOT NULL,
	"status" "CommentStatus" DEFAULT 'PUBLISHED' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"moderatedBy" text,
	"moderatedAt" timestamp (3),
	"moderationNotes" text,
	"editedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "CommunityMerit" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"behaviorType" "BehaviorType" NOT NULL,
	"category" "BehaviorCategory" DEFAULT 'OTHER' NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"recognitionPoints" integer DEFAULT 0 NOT NULL,
	"disciplinaryPoints" integer DEFAULT 0 NOT NULL,
	"standingBefore" integer,
	"standingAfter" integer,
	"status" "BehaviorRecordStatus" DEFAULT 'ACTIVE' NOT NULL,
	"disputeReason" text,
	"disputedAt" timestamp (3),
	"resolvedById" text,
	"resolvedAt" timestamp (3),
	"createdById" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"expiresAt" timestamp (3),
	"deletedAt" timestamp (3),
	"disputeHistory" jsonb
);
--> statement-breakpoint
CREATE TABLE "CommunityServiceInquiry" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"listingId" text NOT NULL,
	"inquirerId" text NOT NULL,
	"serviceType" text,
	"preferredDate" timestamp (3),
	"preferredTime" text,
	"location" text,
	"description" text NOT NULL,
	"contactMethod" text DEFAULT 'PLATFORM_MESSAGE' NOT NULL,
	"status" "InquiryStatus" DEFAULT 'PENDING' NOT NULL,
	"providerResponse" text,
	"respondedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "CommunityServiceListing" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"providerId" text NOT NULL,
	"providerType" "ProviderType" DEFAULT 'COMMUNITY' NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb,
	"category" text NOT NULL,
	"subcategory" text,
	"priceType" "PriceType" NOT NULL,
	"price" numeric(65, 30),
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"serviceAreas" text[] NOT NULL,
	"availability" jsonb,
	"licenseNumber" text,
	"insuranceExpiry" timestamp (3),
	"verified" boolean DEFAULT false NOT NULL,
	"verificationDate" timestamp (3),
	"responseTime" integer DEFAULT 24 NOT NULL,
	"contactMethods" text[] NOT NULL,
	"images" text[] NOT NULL,
	"portfolio" text[] NOT NULL,
	"status" "ListingStatus" DEFAULT 'DRAFT' NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"isFeatured" boolean DEFAULT false NOT NULL,
	"moderatedBy" text,
	"moderatedAt" timestamp (3),
	"moderationNotes" text,
	"rating" double precision DEFAULT 0 NOT NULL,
	"reviewCount" integer DEFAULT 0 NOT NULL,
	"termsAndConditions" text,
	"cancellationPolicy" text,
	"organizationId" text,
	"slug" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "CommunityServiceReview" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"listingId" text NOT NULL,
	"reviewerId" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"serviceDate" timestamp (3),
	"responseQuality" integer,
	"isPublished" boolean DEFAULT true NOT NULL,
	"moderatedBy" text,
	"moderatedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "CompetitionEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"competitionId" text NOT NULL,
	"userId" text NOT NULL,
	"status" "EntryStatus" DEFAULT 'JOINED' NOT NULL,
	"joinedAt" timestamp (3) DEFAULT now() NOT NULL,
	"submissionUrl" text,
	"submissionText" text,
	"score" double precision,
	"winnerAt" timestamp (3),
	"prize" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Competition" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"rules" text,
	"prizeInfo" text,
	"startDate" timestamp (3) NOT NULL,
	"endDate" timestamp (3) NOT NULL,
	"status" "CompetitionStatus" DEFAULT 'DRAFT' NOT NULL,
	"entryCount" integer DEFAULT 0 NOT NULL,
	"type" "CompetitionType" DEFAULT 'RAFFLE' NOT NULL,
	"winnersCount" integer DEFAULT 1 NOT NULL,
	"maxParticipants" integer,
	"image" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ContentAuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"contentId" text NOT NULL,
	"userId" text,
	"action" "ContentAuditAction" NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ContentLike" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"contentId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ContentVersion" (
	"id" text PRIMARY KEY NOT NULL,
	"contentId" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"userId" text,
	"changeSummary" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Content" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"title" jsonb NOT NULL,
	"content" jsonb NOT NULL,
	"excerpt" jsonb,
	"image" text,
	"category" "ContentCategory" NOT NULL,
	"tags" text[] NOT NULL,
	"authorId" text,
	"groupId" text,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"defaultLocale" text DEFAULT 'en' NOT NULL,
	"contentType" text DEFAULT 'article' NOT NULL,
	"license" "ContentLicense" DEFAULT 'ALL_RIGHTS_RESERVED' NOT NULL,
	"copyrightHolder" text,
	"moderationStatus" "ModerationStatus" DEFAULT 'DRAFT' NOT NULL,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"commentsEnabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"publishedAt" timestamp (3),
	"expiresAt" timestamp (3),
	"deletedAt" timestamp (3),
	"commentCount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ConversationParticipant" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"conversationId" text NOT NULL,
	"userId" text NOT NULL,
	"joinedAt" timestamp (3) DEFAULT now() NOT NULL,
	"lastReadAt" timestamp (3),
	"lastReadMessageId" text,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text,
	"type" "ConversationType" DEFAULT 'DIRECT' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3),
	"capabilities" jsonb
);
--> statement-breakpoint
CREATE TABLE "CouponRedemption" (
	"id" text PRIMARY KEY NOT NULL,
	"couponId" text NOT NULL,
	"tenantId" text NOT NULL,
	"subscriptionId" text,
	"paymentId" text,
	"redeemedAt" timestamp (3) DEFAULT now() NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"code" text NOT NULL,
	"discountType" "CouponDiscountType" NOT NULL,
	"discountValue" numeric(65, 30) NOT NULL,
	"maxRedemptions" integer DEFAULT 0 NOT NULL,
	"currentRedemptions" integer DEFAULT 0 NOT NULL,
	"validFrom" timestamp (3),
	"validUntil" timestamp (3),
	"isActive" boolean DEFAULT true NOT NULL,
	"planId" text,
	"minPlanPrice" numeric(65, 30),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"identityId" text NOT NULL,
	"type" "CredentialType" NOT NULL,
	"email" text,
	"publicKey" text,
	"fingerprint" text,
	"metadata" jsonb,
	"revokedAt" timestamp (3),
	"lastUsedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "DWallet" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"balance" numeric(65, 30) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"lifetimeEarned" numeric(65, 30) DEFAULT '0' NOT NULL,
	"lifetimePaid" numeric(65, 30) DEFAULT '0' NOT NULL,
	"status" "WalletStatus" DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DataConsent" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"walletId" text NOT NULL,
	"userId" text NOT NULL,
	"streamKey" text NOT NULL,
	"granted" boolean NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"grantedAt" timestamp (3),
	"revokedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DataRevenueStream" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"residentSharePct" numeric(65, 30) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DataShareBatch" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"periodStart" timestamp (3) NOT NULL,
	"periodEnd" timestamp (3) NOT NULL,
	"streamKey" text NOT NULL,
	"totalRevenue" numeric(65, 30) NOT NULL,
	"residentPool" numeric(65, 30) NOT NULL,
	"participantCount" integer NOT NULL,
	"status" "BatchStatus" DEFAULT 'PENDING' NOT NULL,
	"processedAt" timestamp (3),
	"processedBy" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DelegationAction" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"delegationId" text NOT NULL,
	"action" text NOT NULL,
	"actorId" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DisputeCase" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"referenceNumber" text NOT NULL,
	"complainantId" text NOT NULL,
	"respondentId" text,
	"respondentType" "DisputeRespondent" DEFAULT 'RESIDENT' NOT NULL,
	"category" "DisputeCategory" NOT NULL,
	"subcategory" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"desiredOutcome" text,
	"severity" "DisputeSeverity" DEFAULT 'MODERATE' NOT NULL,
	"status" "DisputeStatus" DEFAULT 'DRAFT' NOT NULL,
	"intakeCompletedAt" timestamp (3),
	"coolingOffEndsAt" timestamp (3),
	"submittedAt" timestamp (3),
	"assignedModeratorId" text,
	"mediationOfferedAt" timestamp (3),
	"mediationAcceptedAt" timestamp (3),
	"rulingIssuedAt" timestamp (3),
	"rulingDescription" text,
	"csosReferenceNumber" text,
	"csosEscalatedAt" timestamp (3),
	"csosClosedAt" timestamp (3),
	"resolvedAt" timestamp (3),
	"closedById" text,
	"closedReason" text,
	"isConfidential" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "DisputeEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"disputeId" text NOT NULL,
	"actorId" text,
	"eventType" "DisputeEventType" NOT NULL,
	"fromStatus" "DisputeStatus",
	"toStatus" "DisputeStatus",
	"note" text,
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "DisputeEvidence" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"disputeId" text NOT NULL,
	"uploadedBy" text NOT NULL,
	"fileUrl" text NOT NULL,
	"fileType" text NOT NULL,
	"fileName" text NOT NULL,
	"description" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "DisputeMessageVersion" (
	"id" text PRIMARY KEY NOT NULL,
	"messageId" text NOT NULL,
	"originalContent" text NOT NULL,
	"editedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "DisputeMessage" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"disputeId" text NOT NULL,
	"senderId" text NOT NULL,
	"content" text NOT NULL,
	"isInternal" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"editedAt" timestamp (3),
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "DisputeNotification" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"disputeId" text NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "EventAttendee" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"eventId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Event" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"date" timestamp (3) NOT NULL,
	"location" text NOT NULL,
	"organizer" text NOT NULL,
	"image" text,
	"isPublic" boolean DEFAULT true NOT NULL,
	"category" text,
	"maxAttendees" integer,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ExternalSurvey" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"externalId" text NOT NULL,
	"embedUrl" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "GroupMember" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"groupId" text NOT NULL,
	"role" "GroupRole" DEFAULT 'MEMBER' NOT NULL,
	"joinedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "GroupMembershipRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"groupId" text NOT NULL,
	"status" "MembershipStatus" DEFAULT 'PENDING' NOT NULL,
	"message" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Group" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"image" text,
	"color" text DEFAULT '#4F46E5' NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"accessType" "GroupAccess" DEFAULT 'OPEN' NOT NULL,
	"residentFilter" "ResidentFilter" DEFAULT 'ALL' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3),
	"ownerId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Handle" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"handle" text NOT NULL,
	"addressId" text NOT NULL,
	"status" "HandleStatus" DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Household" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"propertyId" text NOT NULL,
	"organizationId" text,
	"occupancyType" "OccupancyType" DEFAULT 'OWNER_OCCUPIED' NOT NULL,
	"status" "HouseholdStatus" DEFAULT 'ACTIVE' NOT NULL,
	"moveInDate" timestamp (3),
	"moveOutDate" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "InternalMaintenanceNote" (
	"id" text PRIMARY KEY NOT NULL,
	"requestId" text NOT NULL,
	"userId" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"deletedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"street" text,
	"unit" text,
	"residencyType" "ResidencyType" DEFAULT 'OWNER' NOT NULL,
	"role" "Role" DEFAULT 'RESIDENT' NOT NULL,
	"token" text NOT NULL,
	"status" "InvitationStatus" DEFAULT 'PENDING' NOT NULL,
	"expiresAt" timestamp (3) DEFAULT now() NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3),
	"organizationId" text NOT NULL,
	"inviterId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MaintenanceCategory" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "MaintenanceRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"propertyId" text,
	"userId" text NOT NULL,
	"category" text NOT NULL,
	"priority" "Priority" NOT NULL,
	"description" text NOT NULL,
	"status" "RequestStatus" DEFAULT 'SUBMITTED' NOT NULL,
	"images" text[] NOT NULL,
	"assignedTo" text,
	"vendor" text,
	"scheduledDate" timestamp (3),
	"estimatedCost" numeric(65, 30),
	"actualCost" numeric(65, 30),
	"resolution" text,
	"completedAt" timestamp (3),
	"deletedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"ticketNumber" text NOT NULL,
	"preferredDate" timestamp (3),
	"preferredTime" text,
	"assignedTeamId" text,
	"assignedProviderId" text,
	"routingType" "MaintenanceRouting" DEFAULT 'HOA' NOT NULL,
	"landlordId" text
);
--> statement-breakpoint
CREATE TABLE "MaintenanceTeamMember" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"teamId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MaintenanceTeam" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"trade" text NOT NULL,
	"contactName" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "MediaUpload" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"tenantId" text NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"fileName" text NOT NULL,
	"fileSize" integer NOT NULL,
	"mimeType" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_proxies" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"meetingId" text NOT NULL,
	"ownerUserId" text NOT NULL,
	"ownerHouseholdId" text NOT NULL,
	"proxyUserId" text,
	"proxyName" text,
	"proxyEmail" text,
	"proxyPhone" text,
	"formDocumentId" text,
	"ownerSignedAt" timestamp (3),
	"proxySignedAt" timestamp (3),
	"approvedBy" text,
	"approvedAt" timestamp (3),
	"status" "ProxyStatus" DEFAULT 'Draft' NOT NULL,
	"notes" text,
	"signatureProvider" "SignatureProvider" DEFAULT 'INTERNAL' NOT NULL,
	"signatureEvidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"credentialId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3),
	"referenceCode" text
);
--> statement-breakpoint
CREATE TABLE "Member" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Message" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"conversationId" text NOT NULL,
	"senderId" text NOT NULL,
	"content" text NOT NULL,
	"type" "MessageType" DEFAULT 'TEXT' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"expiresAt" timestamp (3),
	"deletedAt" timestamp (3),
	"mediaUrl" text,
	"messageVersion" integer DEFAULT 1 NOT NULL,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "NotificationType" DEFAULT 'info' NOT NULL,
	"link" text,
	"read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3),
	"senderId" text,
	"readAt" timestamp (3),
	"payload" jsonb,
	"deliveryStatus" text DEFAULT 'PENDING' NOT NULL,
	"category" text
);
--> statement-breakpoint
CREATE TABLE "Organization" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"createdAt" timestamp (3) NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "OutboxDeadLetter" (
	"id" text PRIMARY KEY NOT NULL,
	"outboxId" text,
	"type" text NOT NULL,
	"version" integer NOT NULL,
	"tenantId" text NOT NULL,
	"correlationId" text,
	"payload" jsonb NOT NULL,
	"error" text,
	"handler" text,
	"attempts" integer,
	"deadLetteredAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"tenantId" text NOT NULL,
	"correlationId" text NOT NULL,
	"causationId" text,
	"actorId" text,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"processedAt" timestamp (3),
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text,
	"publicKey" text NOT NULL,
	"userId" text NOT NULL,
	"credentialID" text NOT NULL,
	"counter" integer NOT NULL,
	"deviceType" text NOT NULL,
	"backedUp" boolean NOT NULL,
	"transports" text,
	"createdAt" timestamp (3),
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "PaymentTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"tenantId" text NOT NULL,
	"subscriptionId" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"platformFee" numeric(65, 30) NOT NULL,
	"processorFee" numeric(65, 30) NOT NULL,
	"netAmount" numeric(65, 30) NOT NULL,
	"status" "TransactionStatus" DEFAULT 'PENDING' NOT NULL,
	"gateway" "PaymentGateway" NOT NULL,
	"externalRef" text,
	"invoiceUrl" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "PayoutRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"walletId" text NOT NULL,
	"userId" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"status" "PayoutStatus" DEFAULT 'PENDING' NOT NULL,
	"method" text,
	"bankReference" text,
	"processedAt" timestamp (3),
	"processedBy" text,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PlatformAiTierQuota" (
	"id" text PRIMARY KEY NOT NULL,
	"tier" "Tier" NOT NULL,
	"monthlyTokens" integer NOT NULL,
	"overagePolicy" "AiOveragePolicy" DEFAULT 'HARD_STOP' NOT NULL,
	"overageTokens" integer DEFAULT 0 NOT NULL,
	"overagePriceZAR" numeric(65, 30) DEFAULT '0' NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"updatedById" text
);
--> statement-breakpoint
CREATE TABLE "PlatformModule" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"minTier" "Tier" DEFAULT 'STANDARD' NOT NULL,
	"defaultEnabled" boolean DEFAULT false NOT NULL,
	"description" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PlatformSuspension" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"suspensionType" "SuspensionType" NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"startDate" timestamp (3) DEFAULT now() NOT NULL,
	"endDate" timestamp (3),
	"isPermanent" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdById" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "PremiumSeat" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"portfolioName" text,
	"subscriptionTier" text DEFAULT 'basic' NOT NULL,
	"maxProperties" integer DEFAULT 5 NOT NULL,
	"platformAddress" text NOT NULL,
	"organizationId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"messageRetentionDays" integer DEFAULT 30 NOT NULL,
	"tier" text DEFAULT 'core' NOT NULL,
	"archivedAt" timestamp (3),
	"status" "SeatStatus" DEFAULT 'ACTIVE' NOT NULL,
	"addressId" text
);
--> statement-breakpoint
CREATE TABLE "Profile" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"householdId" text NOT NULL,
	"displayName" text NOT NULL,
	"profileAddress" text NOT NULL,
	"userId" text,
	"avatar" text,
	"isPublic" boolean DEFAULT true NOT NULL,
	"showEmail" boolean DEFAULT true NOT NULL,
	"showPhone" boolean DEFAULT true NOT NULL,
	"occupantSince" timestamp (3) DEFAULT now() NOT NULL,
	"householdRole" "HouseholdRole" DEFAULT 'OCCUPANT' NOT NULL,
	"leaseStartDate" timestamp (3),
	"leaseEndDate" timestamp (3),
	"status" "ProfileStatus" DEFAULT 'ACTIVE' NOT NULL,
	"organizationId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3),
	"occupantImage" text,
	"rentalImage" text,
	"landlordId" text,
	"residencyType" "ResidencyType" DEFAULT 'FAMILY' NOT NULL,
	"aliasAddressId" text
);
--> statement-breakpoint
CREATE TABLE "Property" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"platformAddress" text NOT NULL,
	"street" text NOT NULL,
	"unit" text NOT NULL,
	"ownerId" text,
	"homeImage" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3),
	"addressId" text
);
--> statement-breakpoint
CREATE TABLE "PropertyListing" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"propertyId" text NOT NULL,
	"ownerId" text NOT NULL,
	"listingType" "ListingType" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price" numeric(65, 30),
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"bedrooms" integer,
	"bathrooms" integer,
	"parkingSpaces" integer,
	"gardenSize" double precision,
	"petFriendly" boolean DEFAULT false NOT NULL,
	"status" "ListingStatus" DEFAULT 'DRAFT' NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"isFeatured" boolean DEFAULT false NOT NULL,
	"assignedAgentId" text,
	"marketingBudget" numeric(65, 30),
	"featuredUntil" timestamp (3),
	"organizationId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "PropertyPremiumSeat" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"propertyId" text NOT NULL,
	"premiumSeatId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProviderCharge" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"tenantId" text NOT NULL,
	"subscriptionId" text NOT NULL,
	"transactionId" text,
	"description" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"status" "ProviderChargeStatus" DEFAULT 'PENDING' NOT NULL,
	"gateway" "PaymentGateway",
	"externalRef" text,
	"dueDate" timestamp (3) NOT NULL,
	"paidAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ProviderDueDiligenceDocument" (
	"id" text PRIMARY KEY NOT NULL,
	"workflowId" text NOT NULL,
	"itemId" text,
	"fileName" text NOT NULL,
	"fileType" text NOT NULL,
	"storageKey" text NOT NULL,
	"category" "DueDiligenceDocumentCategory" DEFAULT 'OTHER' NOT NULL,
	"uploadedBy" text NOT NULL,
	"fileSize" integer,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ProviderDueDiligenceEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"workflowId" text NOT NULL,
	"action" text NOT NULL,
	"actorId" text NOT NULL,
	"oldValue" text,
	"newValue" text,
	"description" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProviderDueDiligenceItem" (
	"id" text PRIMARY KEY NOT NULL,
	"workflowId" text NOT NULL,
	"itemKey" text NOT NULL,
	"status" "DueDiligenceItemStatus" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"reviewedBy" text,
	"reviewedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProviderDueDiligenceWorkflow" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"tenantId" text NOT NULL,
	"status" "ProviderDueDiligenceStatus" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"assignedTo" text,
	"submittedAt" timestamp (3),
	"startedAt" timestamp (3),
	"completedAt" timestamp (3),
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ProviderInvoice" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"tenantId" text NOT NULL,
	"subscriptionId" text NOT NULL,
	"transactionId" text NOT NULL,
	"invoiceNumber" text NOT NULL,
	"items" jsonb NOT NULL,
	"total" numeric(65, 30) NOT NULL,
	"platformFee" numeric(65, 30) NOT NULL,
	"processorFee" numeric(65, 30) NOT NULL,
	"netAmount" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"status" "InvoiceStatus" DEFAULT 'PENDING' NOT NULL,
	"paidAt" timestamp (3),
	"pdfUrl" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ProviderLegalAgreement" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"tenantId" text NOT NULL,
	"agreementType" text NOT NULL,
	"version" text NOT NULL,
	"acceptedAt" timestamp (3) DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ProviderMerit" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"tenantId" text NOT NULL,
	"meritType" "ProviderMeritType" NOT NULL,
	"points" integer NOT NULL,
	"description" text,
	"referenceId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"evidenceUrl" text,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ProviderReputation" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"tenantId" text NOT NULL,
	"totalScore" integer DEFAULT 0 NOT NULL,
	"responseTimeScore" integer,
	"qualityScore" integer,
	"reviewScore" integer,
	"complianceScore" integer,
	"engagementScore" integer,
	"lastCalculatedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ProviderSubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"tenantId" text NOT NULL,
	"tierId" text NOT NULL,
	"status" "SubscriptionStatus" DEFAULT 'ACTIVE' NOT NULL,
	"startDate" timestamp (3) NOT NULL,
	"endDate" timestamp (3),
	"nextBillingDate" timestamp (3),
	"price" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"paymentGateway" "PaymentGateway",
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ProviderVerification" (
	"id" text PRIMARY KEY NOT NULL,
	"providerId" text NOT NULL,
	"tenantId" text NOT NULL,
	"status" "ProviderVerificationStatus" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"startDate" timestamp (3) DEFAULT now() NOT NULL,
	"endDate" timestamp (3),
	"verificationThreshold" integer DEFAULT 300 NOT NULL,
	"probationThreshold" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"dueDiligenceItems" jsonb,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Question" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"surveyId" text NOT NULL,
	"sectionId" text,
	"text" text NOT NULL,
	"type" "QuestionType" NOT NULL,
	"options" text[] NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "RequestHistory" (
	"id" text PRIMARY KEY NOT NULL,
	"requestId" text NOT NULL,
	"userId" text NOT NULL,
	"field" text NOT NULL,
	"oldValue" text,
	"newValue" text,
	"comment" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RequestNote" (
	"id" text PRIMARY KEY NOT NULL,
	"requestId" text NOT NULL,
	"userId" text NOT NULL,
	"content" text NOT NULL,
	"isInternal" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ResidentDelegation" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"propertyId" text NOT NULL,
	"ownerId" text NOT NULL,
	"profileId" text NOT NULL,
	"scopes" text[] NOT NULL,
	"grantedAt" timestamp (3) DEFAULT now() NOT NULL,
	"expiresAt" timestamp (3),
	"revokedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ResourceVersion" (
	"id" text PRIMARY KEY NOT NULL,
	"resourceId" text NOT NULL,
	"fileUrl" text,
	"fileType" text,
	"fileSize" integer,
	"version" text,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Resource" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" "ResourceCategory" NOT NULL,
	"fileUrl" text,
	"fileType" text,
	"fileSize" integer,
	"externalUrl" text,
	"bodyContent" jsonb,
	"version" text,
	"downloadCount" integer DEFAULT 0 NOT NULL,
	"visibility" "ResourceVisibility" DEFAULT 'ALL_RESIDENTS' NOT NULL,
	"authorId" text,
	"publishedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3),
	"featured" boolean DEFAULT false NOT NULL,
	"mediaType" "ResourceMediaType",
	"provider" text,
	"tags" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Response" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"surveyId" text NOT NULL,
	"userId" text,
	"answers" jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "RevenueRecord" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"providerId" text NOT NULL,
	"transactionId" text NOT NULL,
	"grossAmount" numeric(65, 30) NOT NULL,
	"platformFee" numeric(65, 30) NOT NULL,
	"processorFee" numeric(65, 30) NOT NULL,
	"netAmount" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"period" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ServiceBooking" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"listingId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"date" timestamp (3) NOT NULL,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"price" numeric(65, 30),
	"platformFee" numeric(65, 30),
	"paymentStatus" "BookingPaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"status" "ServiceBookingStatus" DEFAULT 'PENDING_CONFIRMATION' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "ServiceProvider" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"companyName" text NOT NULL,
	"contactName" text,
	"phone" text,
	"email" text,
	"trade" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"employmentType" "ProviderEmploymentType" DEFAULT 'EXTERNAL' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3),
	"userId" text,
	"website" text,
	"addressId" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text,
	"expiresAt" timestamp (3) NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"activeOrganizationId" text,
	"impersonatedBy" text
);
--> statement-breakpoint
CREATE TABLE "Setting" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"type" "SettingValueType" DEFAULT 'STRING' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"schemaVersion" integer DEFAULT 1 NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "SetupMission" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantSetupId" text NOT NULL,
	"section" text NOT NULL,
	"missionKey" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"isRequired" boolean DEFAULT false NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp (3),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "SetupSetting" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantSetupId" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "SoloSeat" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"platformAddress" text NOT NULL,
	"propertyId" text,
	"seatType" "SoloSeatType" NOT NULL,
	"isComplimentary" boolean DEFAULT false NOT NULL,
	"linkedFromProfileId" text,
	"organizationId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"archivedAt" timestamp (3),
	"status" "SeatStatus" DEFAULT 'ACTIVE' NOT NULL,
	"addressId" text
);
--> statement-breakpoint
CREATE TABLE "StandardSeat" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"propertyId" text NOT NULL,
	"isPrimaryOwner" boolean DEFAULT true NOT NULL,
	"platformAddress" text NOT NULL,
	"organizationId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"archivedAt" timestamp (3),
	"status" "SeatStatus" DEFAULT 'ACTIVE' NOT NULL,
	"addressId" text
);
--> statement-breakpoint
CREATE TABLE "SubscriptionTier" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"maxListings" integer,
	"features" jsonb,
	"platformFeePercent" numeric(65, 30) DEFAULT '8' NOT NULL,
	"verificationRequired" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Support" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"senderUserId" text NOT NULL,
	"recipientUserId" text NOT NULL,
	"targetType" "SupportTarget" NOT NULL,
	"targetId" text NOT NULL,
	"chips" integer DEFAULT 0 NOT NULL,
	"message" text,
	"isAnonymous" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SurveySection" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"surveyId" text NOT NULL,
	"title" text,
	"description" text,
	"image" text,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Survey" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "SurveyType" DEFAULT 'INTERNAL' NOT NULL,
	"status" "SurveyStatus" DEFAULT 'DRAFT' NOT NULL,
	"startDate" timestamp (3),
	"endDate" timestamp (3),
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "TaxJurisdiction" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text DEFAULT 'ZA' NOT NULL,
	"region" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaxRate" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rate" numeric(65, 30) NOT NULL,
	"country" text DEFAULT 'ZA' NOT NULL,
	"jurisdictionId" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TenantAchievement" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"definitionId" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"customThreshold" integer,
	"icon" text
);
--> statement-breakpoint
CREATE TABLE "TenantAiUsage" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"billingMonth" text NOT NULL,
	"tokensAllotted" integer NOT NULL,
	"tokensUsed" integer DEFAULT 0 NOT NULL,
	"overageTokens" integer DEFAULT 0 NOT NULL,
	"overageCostZAR" numeric(65, 30) DEFAULT '0' NOT NULL,
	"status" "AiUsageStatus" DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TenantFeatureFlag" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"featureKey" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "TenantInvoice" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"subscriptionId" text NOT NULL,
	"transactionId" text,
	"invoiceNumber" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(65, 30) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(65, 30) DEFAULT '0' NOT NULL,
	"total" numeric(65, 30) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"status" "InvoiceStatus" DEFAULT 'PENDING' NOT NULL,
	"paidAt" timestamp (3),
	"pdfUrl" text,
	"downloadReady" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TenantModule" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"moduleKey" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	"enabledAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "TenantPayment" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"subscriptionId" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"platformFee" numeric(65, 30) DEFAULT '0' NOT NULL,
	"processorFee" numeric(65, 30) DEFAULT '0' NOT NULL,
	"netAmount" numeric(65, 30) DEFAULT '0' NOT NULL,
	"status" "TransactionStatus" DEFAULT 'PENDING' NOT NULL,
	"gateway" "PaymentGateway" NOT NULL,
	"externalRef" text,
	"invoiceUrl" text,
	"couponId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "TenantSetup" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"completionPercent" integer DEFAULT 0 NOT NULL,
	"completedSections" text[] DEFAULT '{}' NOT NULL,
	"launchedAt" timestamp (3),
	"lastViewedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "TenantSubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"planId" text NOT NULL,
	"status" "TenantSubscriptionStatus" DEFAULT 'PENDING' NOT NULL,
	"startDate" timestamp (3),
	"endDate" timestamp (3),
	"nextBillingDate" timestamp (3),
	"trialEndsAt" timestamp (3),
	"convertedAt" timestamp (3),
	"conversionSource" text,
	"cancelledAt" timestamp (3),
	"cancelReason" text,
	"tierManualOverride" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"customDomain" text,
	"logoUrl" text,
	"faviconUrl" text,
	"primaryColor" text DEFAULT '#4F46E5' NOT NULL,
	"accentColor" text,
	"secondaryColor" text,
	"fontFamily" text,
	"tagline" text,
	"description" text,
	"address" text,
	"telephone" text,
	"email" text,
	"governanceLabel" text,
	"customCss" text,
	"active" boolean DEFAULT true NOT NULL,
	"subscriptionTier" text DEFAULT 'basic' NOT NULL,
	"modules" jsonb,
	"maxPages" integer DEFAULT 5 NOT NULL,
	"pageCount" integer DEFAULT 0 NOT NULL,
	"featureFlags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3),
	"tier" "Tier" DEFAULT 'STANDARD' NOT NULL,
	"ownerId" text
);
--> statement-breakpoint
CREATE TABLE "twoFactor" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"secret" text NOT NULL,
	"backupCodes" text NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserAchievementProgress" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"definitionId" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserAchievement" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"userId" text NOT NULL,
	"definitionId" text NOT NULL,
	"unlockedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserDevice" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"publicKey" text NOT NULL,
	"deviceName" text NOT NULL,
	"lastSeenAt" timestamp (3) DEFAULT now() NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserKey" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"publicKey" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"revokedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "Role" DEFAULT 'USER' NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"phone" text,
	"interests" text[] NOT NULL,
	"avatar" text,
	"profileImage" text,
	"books" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dashboardLayout" jsonb DEFAULT 'null'::jsonb NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"showEmail" boolean DEFAULT true NOT NULL,
	"showPhone" boolean DEFAULT true NOT NULL,
	"profileSlug" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"twoFactorEnabled" boolean DEFAULT false NOT NULL,
	"isPlatformAdmin" boolean DEFAULT false NOT NULL,
	"notificationPreferences" jsonb DEFAULT '{"info":{"email":true,"inApp":true},"error":{"email":true,"inApp":true},"success":{"email":true,"inApp":true},"warning":{"email":true,"inApp":true}}'::jsonb NOT NULL,
	"banExpires" timestamp (3),
	"banReason" text,
	"banned" boolean DEFAULT false NOT NULL,
	"profileData" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WalletTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"walletId" text NOT NULL,
	"type" "TransactionType" NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"description" text NOT NULL,
	"referenceId" text,
	"referenceType" text,
	"balanceBefore" numeric(65, 30) NOT NULL,
	"balanceAfter" numeric(65, 30) NOT NULL,
	"sourceType" "TransactionSource" DEFAULT 'RESIDENT_DATA_SHARE' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
