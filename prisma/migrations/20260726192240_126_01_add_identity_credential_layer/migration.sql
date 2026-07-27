-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('EMAIL', 'PASSKEY', 'NOSTR', 'LNURL', 'OIDC');

-- CreateTable
CREATE TABLE "identities" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "email" TEXT,
    "publicKey" TEXT,
    "fingerprint" TEXT,
    "metadata" JSONB,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credentials_identityId_idx" ON "credentials"("identityId");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

