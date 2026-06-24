-- ADVISORY-015 Phase 3B: Add userId FK to ServiceProvider

ALTER TABLE "ServiceProvider" ADD COLUMN "userId" TEXT;
ALTER TABLE "ServiceProvider" ADD CONSTRAINT "ServiceProvider_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ServiceProvider_userId_idx" ON "ServiceProvider"("userId");
