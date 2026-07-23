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
CREATE TABLE "TenantFeatureFlag" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"featureKey" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3)
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
ALTER TABLE "user" ALTER COLUMN "tenantId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Event" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "Event" ADD COLUMN "maxAttendees" integer;
--> statement-breakpoint
CREATE UNIQUE INDEX "TenantFeatureFlag_tenantId_featureKey_key" ON "TenantFeatureFlag" USING btree ("tenantId","featureKey");
--> statement-breakpoint
CREATE INDEX "TenantFeatureFlag_tenantId_idx" ON "TenantFeatureFlag" USING btree ("tenantId");
--> statement-breakpoint
ALTER TABLE "TenantFeatureFlag" ADD CONSTRAINT "TenantFeatureFlag_tenantId_Tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
INSERT INTO "TenantFeatureFlag" ("id", "tenantId", "featureKey", "enabled", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    key,
    (value::text = 'true'),
    NOW()
FROM "Tenant",
LATERAL jsonb_each_text(COALESCE("featureFlags", '{}'::jsonb)) AS ff(key, value);