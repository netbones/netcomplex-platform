-- AlterEnum: narrow SignatureProvider 8 -> 5 values.
-- meeting_proxies count was 0 at migration time, so the rename dance is safe.
BEGIN;
CREATE TYPE "SignatureProvider_new" AS ENUM ('INTERNAL', 'DOCUSIGN', 'ADOBE_SIGN', 'PGP', 'GOV_EID');
ALTER TABLE "meeting_proxies" ALTER COLUMN "signatureProvider" DROP DEFAULT;
ALTER TABLE "meeting_proxies" ALTER COLUMN "signatureProvider" TYPE "SignatureProvider_new" USING ("signatureProvider"::text::"SignatureProvider_new");
ALTER TYPE "SignatureProvider" RENAME TO "SignatureProvider_old";
ALTER TYPE "SignatureProvider_new" RENAME TO "SignatureProvider";
DROP TYPE "SignatureProvider_old";
ALTER TABLE "meeting_proxies" ALTER COLUMN "signatureProvider" SET DEFAULT 'INTERNAL';
COMMIT;

-- AlterTable: add nullable credentialId FK + soft-delete deletedAt.
ALTER TABLE "meeting_proxies" ADD COLUMN     "credentialId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AddForeignKey: meeting_proxies.credentialId -> credentials.id.
-- ON DELETE SET NULL mirrors the nullable nature of the column.
ALTER TABLE "meeting_proxies" ADD CONSTRAINT "meeting_proxies_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
