-- CreateEnum
CREATE TYPE "ProviderEmploymentType" AS ENUM ('IN_HOUSE', 'EXTERNAL');

-- AlterTable
ALTER TABLE "ServiceProvider" ADD COLUMN "employmentType" "ProviderEmploymentType" NOT NULL DEFAULT 'EXTERNAL';
