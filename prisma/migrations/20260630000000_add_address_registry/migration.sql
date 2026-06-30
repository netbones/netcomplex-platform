-- Phase 46.2: Platform Address Registry — Core schema
-- Creates Address, Handle, AddressEndpoint tables + adds addressId FKs to 6 existing tables
-- Backfills Address from 5 source tables (StandardSeat, SoloSeat, PremiumSeat, Profile, Property)
-- and generates ServiceProvider addresses from companyName
--
-- PRE-FLIGHT: Run collision detection query before applying this migration.
-- If any rows return, STOP AND ESCALATE — those are real production address collisions.
-- Query:
--   SELECT "tenantId", address, array_agg(DISTINCT source) AS sources, count(*)
--   FROM (
--     SELECT "tenantId", "platformAddress" AS address, 'StandardSeat' AS source FROM "StandardSeat"
--     UNION ALL SELECT "tenantId", "platformAddress", 'SoloSeat' FROM "SoloSeat"
--     UNION ALL SELECT "tenantId", "platformAddress", 'PremiumSeat' FROM "PremiumSeat"
--     UNION ALL SELECT "tenantId", "profileAddress", 'Profile' FROM "Profile"
--     UNION ALL SELECT "tenantId", "platformAddress", 'Property' FROM "Property"
--   ) t GROUP BY "tenantId", address HAVING count(*) > 1;

-- ============================================================================
-- Step 1: Create 6 enum types (idempotent)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "AddressKind" AS ENUM ('STANDARD', 'ALIAS', 'SOLO', 'PREMIUM', 'PROVIDER', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AddressStatus" AS ENUM ('ACTIVE', 'RESERVED', 'COOLING_OFF', 'ARCHIVED', 'DELETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AddressOwnerType" AS ENUM ('STANDARD_SEAT', 'PROFILE', 'SOLO_SEAT', 'PREMIUM_SEAT', 'PROPERTY', 'PROVIDER', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ForwardStrategy" AS ENUM ('DIRECT', 'HOUSEHOLD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "HandleStatus" AS ENUM ('ACTIVE', 'RESERVED', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EndpointType" AS ENUM ('INTERNAL_CHAT', 'EMAIL', 'WEBFORM', 'API', 'SMS', 'WHATSAPP', 'PUSH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Step 2: Create Address, Handle, AddressEndpoint tables
-- ============================================================================

CREATE TABLE "Address" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "localPart" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "kind" "AddressKind" NOT NULL,
  "status" "AddressStatus" NOT NULL DEFAULT 'ACTIVE',
  "ownerType" "AddressOwnerType",
  "ownerId" TEXT,
  "canonicalAddressId" TEXT,
  "forwardStrategy" "ForwardStrategy",
  "receiveExternal" BOOLEAN NOT NULL DEFAULT false,
  "coolingUntil" TIMESTAMP(3),
  "archivedUntil" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "Address_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Address_tenantId_address_key" UNIQUE ("tenantId", "address")
);

CREATE TABLE "Handle" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "addressId" TEXT NOT NULL,
  "status" "HandleStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "Handle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Handle_tenantId_handle_key" UNIQUE ("tenantId", "handle")
);

CREATE TABLE "AddressEndpoint" (
  "id" TEXT NOT NULL,
  "addressId" TEXT NOT NULL,
  "type" "EndpointType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "AddressEndpoint_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Step 3: Add FK columns to 6 existing tables (nullable — Phase 1)
-- ============================================================================

ALTER TABLE "StandardSeat" ADD COLUMN "addressId" TEXT;
ALTER TABLE "SoloSeat" ADD COLUMN "addressId" TEXT;
ALTER TABLE "PremiumSeat" ADD COLUMN "addressId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "aliasAddressId" TEXT;
ALTER TABLE "Property" ADD COLUMN "addressId" TEXT;
ALTER TABLE "ServiceProvider" ADD COLUMN "addressId" TEXT;

-- ============================================================================
-- Step 4: Add FK constraints
-- ============================================================================

ALTER TABLE "Handle" ADD CONSTRAINT "Handle_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE;

ALTER TABLE "AddressEndpoint" ADD CONSTRAINT "AddressEndpoint_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE;

ALTER TABLE "Address" ADD CONSTRAINT "Address_canonicalAddressId_fkey"
  FOREIGN KEY ("canonicalAddressId") REFERENCES "Address"("id") ON DELETE SET NULL;

ALTER TABLE "StandardSeat" ADD CONSTRAINT "StandardSeat_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL;

ALTER TABLE "SoloSeat" ADD CONSTRAINT "SoloSeat_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL;

ALTER TABLE "PremiumSeat" ADD CONSTRAINT "PremiumSeat_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL;

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_aliasAddressId_fkey"
  FOREIGN KEY ("aliasAddressId") REFERENCES "Address"("id") ON DELETE SET NULL;

ALTER TABLE "Property" ADD CONSTRAINT "Property_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL;

ALTER TABLE "ServiceProvider" ADD CONSTRAINT "ServiceProvider_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL;

-- ============================================================================
-- Step 5: Backfill Address table from 5 source tables + ServiceProvider
-- ============================================================================

-- 5a. StandardSeat → Address (kind=STANDARD, ownerType=STANDARD_SEAT)
INSERT INTO "Address" ("id", "tenantId", "address", "localPart", "domain", "kind", "status", "ownerType", "ownerId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::TEXT,
  "tenantId",
  "platformAddress",
  split_part("platformAddress", '@', 1),
  split_part("platformAddress", '@', 2),
  'STANDARD'::"AddressKind",
  CASE
    WHEN "status" = 'ARCHIVED' THEN 'ARCHIVED'::"AddressStatus"
    WHEN "status" = 'COOLING_OFF' THEN 'COOLING_OFF'::"AddressStatus"
    ELSE 'ACTIVE'::"AddressStatus"
  END,
  'STANDARD_SEAT'::"AddressOwnerType",
  "id",
  "createdAt",
  "updatedAt"
FROM "StandardSeat"
WHERE "platformAddress" IS NOT NULL
ON CONFLICT ("tenantId", "address") DO NOTHING;

-- 5b. SoloSeat → Address (kind=SOLO, ownerType=SOLO_SEAT)
INSERT INTO "Address" ("id", "tenantId", "address", "localPart", "domain", "kind", "status", "ownerType", "ownerId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::TEXT,
  "tenantId",
  "platformAddress",
  split_part("platformAddress", '@', 1),
  split_part("platformAddress", '@', 2),
  'SOLO'::"AddressKind",
  CASE
    WHEN "status" = 'ARCHIVED' THEN 'ARCHIVED'::"AddressStatus"
    WHEN "status" = 'COOLING_OFF' THEN 'COOLING_OFF'::"AddressStatus"
    ELSE 'ACTIVE'::"AddressStatus"
  END,
  'SOLO_SEAT'::"AddressOwnerType",
  "id",
  "createdAt",
  "updatedAt"
FROM "SoloSeat"
WHERE "platformAddress" IS NOT NULL
ON CONFLICT ("tenantId", "address") DO NOTHING;

-- 5c. PremiumSeat → Address (kind=PREMIUM, ownerType=PREMIUM_SEAT)
INSERT INTO "Address" ("id", "tenantId", "address", "localPart", "domain", "kind", "status", "ownerType", "ownerId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::TEXT,
  "tenantId",
  "platformAddress",
  split_part("platformAddress", '@', 1),
  split_part("platformAddress", '@', 2),
  'PREMIUM'::"AddressKind",
  CASE
    WHEN "status" = 'ARCHIVED' THEN 'ARCHIVED'::"AddressStatus"
    WHEN "status" = 'COOLING_OFF' THEN 'COOLING_OFF'::"AddressStatus"
    ELSE 'ACTIVE'::"AddressStatus"
  END,
  'PREMIUM_SEAT'::"AddressOwnerType",
  "id",
  "createdAt",
  "updatedAt"
FROM "PremiumSeat"
WHERE "platformAddress" IS NOT NULL
ON CONFLICT ("tenantId", "address") DO NOTHING;

-- 5d. Profile → Address (kind=ALIAS, ownerType=PROFILE)
INSERT INTO "Address" ("id", "tenantId", "address", "localPart", "domain", "kind", "status", "ownerType", "ownerId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::TEXT,
  "tenantId",
  "profileAddress",
  split_part("profileAddress", '@', 1),
  split_part("profileAddress", '@', 2),
  'ALIAS'::"AddressKind",
  'ACTIVE'::"AddressStatus",
  'PROFILE'::"AddressOwnerType",
  "id",
  "createdAt",
  "updatedAt"
FROM "Profile"
WHERE "profileAddress" IS NOT NULL
ON CONFLICT ("tenantId", "address") DO NOTHING;

-- 5e. Property → Address (kind=STANDARD, ownerType=PROPERTY)
INSERT INTO "Address" ("id", "tenantId", "address", "localPart", "domain", "kind", "status", "ownerType", "ownerId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::TEXT,
  "tenantId",
  "platformAddress",
  split_part("platformAddress", '@', 1),
  split_part("platformAddress", '@', 2),
  'STANDARD'::"AddressKind",
  'ACTIVE'::"AddressStatus",
  'PROPERTY'::"AddressOwnerType",
  "id",
  "createdAt",
  "updatedAt"
FROM "Property"
WHERE "platformAddress" IS NOT NULL
ON CONFLICT ("tenantId", "address") DO NOTHING;

-- 5f. ServiceProvider → Address (kind=PROVIDER, ownerType=PROVIDER)
-- Generate address from companyName slugified + tenant domain
INSERT INTO "Address" ("id", "tenantId", "address", "localPart", "domain", "kind", "status", "ownerType", "ownerId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::TEXT,
  sp."tenantId",
  lower(regexp_replace(sp."companyName", '[^a-zA-Z0-9]', '', 'g')) || '@' || COALESCE(t."customDomain", t.slug || '.netbones.co.za'),
  lower(regexp_replace(sp."companyName", '[^a-zA-Z0-9]', '', 'g')),
  COALESCE(t."customDomain", t.slug || '.netbones.co.za'),
  'PROVIDER'::"AddressKind",
  'ACTIVE'::"AddressStatus",
  'PROVIDER'::"AddressOwnerType",
  sp."id",
  sp."createdAt",
  sp."updatedAt"
FROM "ServiceProvider" sp
JOIN "Tenant" t ON t."id" = sp."tenantId"
WHERE sp."companyName" IS NOT NULL
ON CONFLICT ("tenantId", "address") DO NOTHING;

-- ============================================================================
-- Step 6: Back-update FK columns on existing tables (link back to Address)
-- ============================================================================

UPDATE "StandardSeat" s
SET "addressId" = a."id"
FROM "Address" a
WHERE a."ownerId" = s."id"
  AND a."ownerType" = 'STANDARD_SEAT'
  AND s."platformAddress" IS NOT NULL;

UPDATE "SoloSeat" s
SET "addressId" = a."id"
FROM "Address" a
WHERE a."ownerId" = s."id"
  AND a."ownerType" = 'SOLO_SEAT'
  AND s."platformAddress" IS NOT NULL;

UPDATE "PremiumSeat" p
SET "addressId" = a."id"
FROM "Address" a
WHERE a."ownerId" = p."id"
  AND a."ownerType" = 'PREMIUM_SEAT'
  AND p."platformAddress" IS NOT NULL;

UPDATE "Profile" p
SET "aliasAddressId" = a."id"
FROM "Address" a
WHERE a."ownerId" = p."id"
  AND a."ownerType" = 'PROFILE'
  AND p."profileAddress" IS NOT NULL;

UPDATE "Property" p
SET "addressId" = a."id"
FROM "Address" a
WHERE a."ownerId" = p."id"
  AND a."ownerType" = 'PROPERTY'
  AND p."platformAddress" IS NOT NULL;

UPDATE "ServiceProvider" sp
SET "addressId" = a."id"
FROM "Address" a
WHERE a."ownerId" = sp."id"
  AND a."ownerType" = 'PROVIDER';

-- ============================================================================
-- Step 7: Create indexes
-- ============================================================================

CREATE INDEX "Address_tenantId_idx" ON "Address"("tenantId");
CREATE INDEX "Address_ownerType_ownerId_idx" ON "Address"("ownerType", "ownerId");
CREATE INDEX "Address_status_idx" ON "Address"("status");
CREATE INDEX "Address_canonicalAddressId_idx" ON "Address"("canonicalAddressId");
CREATE INDEX "Handle_addressId_idx" ON "Handle"("addressId");
CREATE INDEX "Handle_tenantId_idx" ON "Handle"("tenantId");
CREATE INDEX "AddressEndpoint_addressId_idx" ON "AddressEndpoint"("addressId");
CREATE INDEX "StandardSeat_addressId_idx" ON "StandardSeat"("addressId");
CREATE INDEX "SoloSeat_addressId_idx" ON "SoloSeat"("addressId");
CREATE INDEX "PremiumSeat_addressId_idx" ON "PremiumSeat"("addressId");
CREATE INDEX "Profile_aliasAddressId_idx" ON "Profile"("aliasAddressId");
CREATE INDEX "Property_addressId_idx" ON "Property"("addressId");
CREATE INDEX "ServiceProvider_addressId_idx" ON "ServiceProvider"("addressId");
