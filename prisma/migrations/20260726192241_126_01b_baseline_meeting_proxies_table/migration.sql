-- Baseline: create meeting_proxies table and its enum types.
--
-- The `meeting_proxies` table was initially created via the Drizzle
-- migration track (`drizzle/0003_wonderful_abomination.sql`) and never had
-- a corresponding Prisma migration. As a result `prisma migrate dev`
-- failed to build a shadow database containing the table, breaking on
-- the downstream `126_02` migration which ALTERs it
-- (error P3006 / P1014 "The underlying table for model `meeting_proxies`
-- does not exist").
--
-- This migration restores parity between the Prisma and Drizzle tracks by
-- establishing the baseline state of `meeting_proxies` as it existed BEFORE
-- `126_02`:
--   - `ProxyStatus` enum (unchanged from the Drizzle baseline).
--   - `SignatureProvider` enum recreated with the ORIGINAL 8 values,
--     because `126_02` narrows it to 5. Recreating the original shape here
--     keeps the replay sequence correct on a fresh shadow DB.
--   - `meeting_proxies` table WITHOUT the `credentialId` / `deletedAt`
--     columns (those are added by `126_02`).
--   - All non-`credentialId` foreign keys and indexes that exist in the
--     production schema at this snapshot.
--
-- The table, enums, indexes, and FKs already exist in the production
-- database, so this migration is marked as applied via
-- `prisma migrate resolve --applied` without being re-executed against
-- production. It is only replayed on fresh shadow databases.

-- CreateEnum
CREATE TYPE "ProxyStatus" AS ENUM ('Draft', 'WaitingForUpload', 'WaitingForProxy', 'PendingHoaReview', 'Approved', 'Rejected', 'Withdrawn');

-- CreateEnum
-- Original 8-value form; `126_02` narrows this to 5 values.
CREATE TYPE "SignatureProvider" AS ENUM ('INTERNAL', 'LIGHTNING', 'NOSTR', 'DOCUSIGN', 'ADOBE_SIGN', 'PASSKEY', 'PGP', 'GOV_EID');

-- CreateTable
CREATE TABLE "meeting_proxies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "ownerHouseholdId" TEXT NOT NULL,
    "proxyUserId" TEXT,
    "proxyName" TEXT,
    "proxyEmail" TEXT,
    "proxyPhone" TEXT,
    "formDocumentId" TEXT,
    "ownerSignedAt" TIMESTAMP(3),
    "proxySignedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "status" "ProxyStatus" NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "signatureProvider" "SignatureProvider" NOT NULL DEFAULT 'INTERNAL',
    "signatureEvidence" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referenceCode" TEXT,

    CONSTRAINT "meeting_proxies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_proxies_tenantId_idx" ON "meeting_proxies"("tenantId");

-- CreateIndex
CREATE INDEX "meeting_proxies_meetingId_idx" ON "meeting_proxies"("meetingId");

-- CreateIndex
CREATE INDEX "meeting_proxies_ownerUserId_idx" ON "meeting_proxies"("ownerUserId");

-- CreateIndex
CREATE INDEX "meeting_proxies_ownerHouseholdId_idx" ON "meeting_proxies"("ownerHouseholdId");

-- CreateIndex
CREATE INDEX "meeting_proxies_proxyUserId_idx" ON "meeting_proxies"("proxyUserId");

-- CreateIndex
CREATE INDEX "meeting_proxies_status_idx" ON "meeting_proxies"("status");

-- CreateIndex
CREATE INDEX "meeting_proxies_meetingId_status_idx" ON "meeting_proxies"("meetingId", "status");

-- CreateUnique
CREATE UNIQUE INDEX "meeting_proxies_referenceCode_key" ON "meeting_proxies"("referenceCode");

-- AddForeignKey: tenantId -> Tenant(id) ON DELETE RESTRICT
ALTER TABLE "meeting_proxies" ADD CONSTRAINT "meeting_proxies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: meetingId -> Event(id) ON DELETE RESTRICT
ALTER TABLE "meeting_proxies" ADD CONSTRAINT "meeting_proxies_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ownerUserId -> user(id) ON DELETE RESTRICT
ALTER TABLE "meeting_proxies" ADD CONSTRAINT "meeting_proxies_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: proxyUserId -> user(id)
ALTER TABLE "meeting_proxies" ADD CONSTRAINT "meeting_proxies_proxyUserId_fkey" FOREIGN KEY ("proxyUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: approvedBy -> user(id)
ALTER TABLE "meeting_proxies" ADD CONSTRAINT "meeting_proxies_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
