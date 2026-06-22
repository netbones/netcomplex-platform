-- Phase 46 Provider Platform: create all tables + FK constraints
-- The Phase 46 Drizzle schemas were defined but tables were never pushed to DB.
-- This migration creates them and adds Prisma-level @relation FK constraints.

-- Enums
DO $$ BEGIN CREATE TYPE "PaymentGateway" AS ENUM ('PAYSTACK', 'PAYPAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProviderChargeStatus" AS ENUM ('PENDING', 'PAID', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'VOID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProviderVerificationStatus" AS ENUM ('PENDING', 'PROBATION', 'VERIFIED', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProviderMeritType" AS ENUM ('RESPONSE_TIME', 'SERVICE_QUALITY', 'REVIEW_RATING', 'COMPLIANCE', 'ENGAGEMENT', 'REFERENCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Core provider tables

CREATE TABLE IF NOT EXISTS "provider_verifications" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider_id" TEXT NOT NULL UNIQUE,
  "tenantId" TEXT NOT NULL,
  "status" "ProviderVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP(3),
  "verification_threshold" INTEGER NOT NULL DEFAULT 300,
  "probation_threshold" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_legal_agreements" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "agreement_type" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "provider_credits" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider_id" TEXT NOT NULL UNIQUE,
  "tenant_id" TEXT NOT NULL,
  "total_credits" INTEGER NOT NULL DEFAULT 0,
  "response_time_score" INTEGER,
  "quality_score" INTEGER,
  "review_score" INTEGER,
  "compliance_score" INTEGER,
  "engagement_score" INTEGER,
  "last_calculated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_merits" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "merit_type" "ProviderMeritType" NOT NULL,
  "points" INTEGER NOT NULL,
  "description" TEXT,
  "reference_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Billing tables

CREATE TABLE IF NOT EXISTS "subscription_tiers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "max_listings" INTEGER,
  "features" JSONB,
  "platform_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 8.00,
  "verification_required" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "provider_subscriptions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "tier_id" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "next_billing_date" TIMESTAMP(3),
  "price" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "payment_gateway" "PaymentGateway",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "platform_fee" DECIMAL(10,2) NOT NULL,
  "processor_fee" DECIMAL(10,2) NOT NULL,
  "net_amount" DECIMAL(10,2) NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "gateway" "PaymentGateway" NOT NULL,
  "external_ref" TEXT,
  "invoice_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "revenue_records" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "gross_amount" DECIMAL(10,2) NOT NULL,
  "platform_fee" DECIMAL(10,2) NOT NULL,
  "processor_fee" DECIMAL(10,2) NOT NULL,
  "net_amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "period" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "provider_charges" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "transaction_id" TEXT,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "status" "ProviderChargeStatus" NOT NULL DEFAULT 'PENDING',
  "gateway" "PaymentGateway",
  "external_ref" TEXT,
  "due_date" TIMESTAMP(3) NOT NULL,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_invoices" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "total" DECIMAL(10,2) NOT NULL,
  "platform_fee" DECIMAL(10,2) NOT NULL,
  "processor_fee" DECIMAL(10,2) NOT NULL,
  "net_amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "paid_at" TIMESTAMP(3),
  "pdf_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Indexes

CREATE INDEX IF NOT EXISTS "provider_verifications_tenantId_idx" ON "provider_verifications"("tenantId");
CREATE INDEX IF NOT EXISTS "provider_legal_agreements_tenant_id_idx" ON "provider_legal_agreements"("tenant_id");
CREATE INDEX IF NOT EXISTS "provider_legal_agreements_provider_id_idx" ON "provider_legal_agreements"("provider_id");
CREATE INDEX IF NOT EXISTS "provider_credits_tenant_id_idx" ON "provider_credits"("tenant_id");
CREATE INDEX IF NOT EXISTS "provider_merits_tenant_id_idx" ON "provider_merits"("tenant_id");
CREATE INDEX IF NOT EXISTS "provider_merits_provider_id_idx" ON "provider_merits"("provider_id");
CREATE INDEX IF NOT EXISTS "subscription_tiers_tenant_id_idx" ON "subscription_tiers"("tenant_id");
CREATE INDEX IF NOT EXISTS "provider_subscriptions_tenant_id_idx" ON "provider_subscriptions"("tenant_id");
CREATE INDEX IF NOT EXISTS "provider_subscriptions_provider_id_idx" ON "provider_subscriptions"("provider_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_tenant_id_idx" ON "payment_transactions"("tenant_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_provider_id_idx" ON "payment_transactions"("provider_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_subscription_id_idx" ON "payment_transactions"("subscription_id");
CREATE INDEX IF NOT EXISTS "revenue_records_tenant_id_idx" ON "revenue_records"("tenant_id");
CREATE INDEX IF NOT EXISTS "revenue_records_provider_id_idx" ON "revenue_records"("provider_id");
CREATE INDEX IF NOT EXISTS "provider_charges_tenant_id_idx" ON "provider_charges"("tenant_id");
CREATE INDEX IF NOT EXISTS "provider_charges_provider_id_idx" ON "provider_charges"("provider_id");
CREATE INDEX IF NOT EXISTS "provider_invoices_tenant_id_idx" ON "provider_invoices"("tenant_id");
CREATE INDEX IF NOT EXISTS "provider_invoices_provider_id_idx" ON "provider_invoices"("provider_id");

-- FK constraints: All provider tables → ServiceProvider

DO $$ BEGIN ALTER TABLE "provider_verifications" ADD CONSTRAINT "provider_verifications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_legal_agreements" ADD CONSTRAINT "provider_legal_agreements_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_credits" ADD CONSTRAINT "provider_credits_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_merits" ADD CONSTRAINT "provider_merits_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "subscription_tiers"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "provider_subscriptions"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_charges" ADD CONSTRAINT "provider_charges_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_charges" ADD CONSTRAINT "provider_charges_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "provider_subscriptions"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_charges" ADD CONSTRAINT "provider_charges_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "provider_subscriptions"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_table THEN NULL; END $$;
