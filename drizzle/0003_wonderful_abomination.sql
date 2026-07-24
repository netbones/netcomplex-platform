CREATE TYPE "public"."ContentAuditAction" AS ENUM('CREATED', 'UPDATED', 'PUBLISHED', 'UNPUBLISHED', 'FLAGGED', 'DELETED', 'RESTORED');--> statement-breakpoint
CREATE TYPE "public"."ProxyStatus" AS ENUM('Draft', 'WaitingForUpload', 'WaitingForProxy', 'PendingHoaReview', 'Approved', 'Rejected', 'Withdrawn');--> statement-breakpoint
CREATE TYPE "public"."SettingValueType" AS ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON');--> statement-breakpoint
CREATE TYPE "public"."SignatureProvider" AS ENUM('INTERNAL', 'LIGHTNING', 'NOSTR', 'DOCUSIGN', 'ADOBE_SIGN', 'PASSKEY', 'PGP', 'GOV_EID');--> statement-breakpoint
CREATE TABLE "ContentAuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"contentId" text NOT NULL,
	"userId" text,
	"action" "ContentAuditAction" NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
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
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"referenceCode" text
);
--> statement-breakpoint
DROP INDEX "TenantFeatureFlag_tenantId_featureKey_key";--> statement-breakpoint
DROP INDEX "TenantFeatureFlag_tenantId_idx";--> statement-breakpoint
ALTER TABLE "Setting" ADD COLUMN "type" "SettingValueType" DEFAULT 'STRING' NOT NULL;