-- Add deletedAt to TenantPayment for soft-delete parity with PaymentTransaction
-- See ADVISORY-027 §2 Cluster C, ADR-025

ALTER TABLE "TenantPayment" ADD COLUMN "deletedAt" TIMESTAMPTZ;
