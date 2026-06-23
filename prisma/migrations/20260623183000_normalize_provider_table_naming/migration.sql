-- Drop all foreign key constraints (both ways) for the 11 tables being renamed
-- This is required before renaming tables/columns to avoid cascade issues

-- provider_verifications
ALTER TABLE "provider_verifications" DROP CONSTRAINT IF EXISTS "provider_verifications_provider_id_fkey";

-- provider_legal_agreements
ALTER TABLE "provider_legal_agreements" DROP CONSTRAINT IF EXISTS "provider_legal_agreements_provider_id_fkey";

-- provider_reputation
ALTER TABLE "provider_reputation" DROP CONSTRAINT IF EXISTS "provider_reputation_provider_id_fkey";

-- provider_merits
ALTER TABLE "provider_merits" DROP CONSTRAINT IF EXISTS "provider_merits_provider_id_fkey";

-- provider_subscriptions
ALTER TABLE "provider_subscriptions" DROP CONSTRAINT IF EXISTS "provider_subscriptions_provider_id_fkey";
ALTER TABLE "provider_subscriptions" DROP CONSTRAINT IF EXISTS "provider_subscriptions_tier_id_fkey";

-- payment_transactions
ALTER TABLE "payment_transactions" DROP CONSTRAINT IF EXISTS "payment_transactions_provider_id_fkey";
ALTER TABLE "payment_transactions" DROP CONSTRAINT IF EXISTS "payment_transactions_subscription_id_fkey";

-- revenue_records
ALTER TABLE "revenue_records" DROP CONSTRAINT IF EXISTS "revenue_records_provider_id_fkey";
ALTER TABLE "revenue_records" DROP CONSTRAINT IF EXISTS "revenue_records_transaction_id_fkey";

-- provider_charges
ALTER TABLE "provider_charges" DROP CONSTRAINT IF EXISTS "provider_charges_provider_id_fkey";
ALTER TABLE "provider_charges" DROP CONSTRAINT IF EXISTS "provider_charges_subscription_id_fkey";
ALTER TABLE "provider_charges" DROP CONSTRAINT IF EXISTS "provider_charges_transaction_id_fkey";

-- provider_invoices
ALTER TABLE "provider_invoices" DROP CONSTRAINT IF EXISTS "provider_invoices_provider_id_fkey";
ALTER TABLE "provider_invoices" DROP CONSTRAINT IF EXISTS "provider_invoices_subscription_id_fkey";
ALTER TABLE "provider_invoices" DROP CONSTRAINT IF EXISTS "provider_invoices_transaction_id_fkey";

-- community_merits
ALTER TABLE "community_merits" DROP CONSTRAINT IF EXISTS "community_merits_userId_fkey";
ALTER TABLE "community_merits" DROP CONSTRAINT IF EXISTS "community_merits_createdById_fkey";
ALTER TABLE "community_merits" DROP CONSTRAINT IF EXISTS "community_merits_resolvedById_fkey";

-- Rename columns (only those that had @map("snake_case") in the old schema)

-- ProviderVerification
ALTER TABLE "provider_verifications" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "provider_verifications" RENAME COLUMN "verification_threshold" TO "verificationThreshold";
ALTER TABLE "provider_verifications" RENAME COLUMN "probation_threshold" TO "probationThreshold";
ALTER TABLE "provider_verifications" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "provider_verifications" RENAME COLUMN "updated_at" TO "updatedAt";

-- ProviderLegalAgreement
ALTER TABLE "provider_legal_agreements" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "provider_legal_agreements" RENAME COLUMN "tenant_id" TO "tenantId";
ALTER TABLE "provider_legal_agreements" RENAME COLUMN "agreement_type" TO "agreementType";
ALTER TABLE "provider_legal_agreements" RENAME COLUMN "accepted_at" TO "acceptedAt";
ALTER TABLE "provider_legal_agreements" RENAME COLUMN "ip_address" TO "ipAddress";
ALTER TABLE "provider_legal_agreements" RENAME COLUMN "user_agent" TO "userAgent";
ALTER TABLE "provider_legal_agreements" RENAME COLUMN "created_at" TO "createdAt";

-- ProviderReputation
ALTER TABLE "provider_reputation" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "provider_reputation" RENAME COLUMN "tenant_id" TO "tenantId";
ALTER TABLE "provider_reputation" RENAME COLUMN "total_score" TO "totalScore";
ALTER TABLE "provider_reputation" RENAME COLUMN "response_time_score" TO "responseTimeScore";
ALTER TABLE "provider_reputation" RENAME COLUMN "quality_score" TO "qualityScore";
ALTER TABLE "provider_reputation" RENAME COLUMN "review_score" TO "reviewScore";
ALTER TABLE "provider_reputation" RENAME COLUMN "compliance_score" TO "complianceScore";
ALTER TABLE "provider_reputation" RENAME COLUMN "engagement_score" TO "engagementScore";
ALTER TABLE "provider_reputation" RENAME COLUMN "last_calculated_at" TO "lastCalculatedAt";
ALTER TABLE "provider_reputation" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "provider_reputation" RENAME COLUMN "updated_at" TO "updatedAt";

-- ProviderMerit
ALTER TABLE "provider_merits" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "provider_merits" RENAME COLUMN "tenant_id" TO "tenantId";
ALTER TABLE "provider_merits" RENAME COLUMN "merit_type" TO "meritType";
ALTER TABLE "provider_merits" RENAME COLUMN "reference_id" TO "referenceId";
ALTER TABLE "provider_merits" RENAME COLUMN "evidence_url" TO "evidenceUrl";
ALTER TABLE "provider_merits" RENAME COLUMN "created_at" TO "createdAt";

-- ProviderSubscription
ALTER TABLE "provider_subscriptions" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "provider_subscriptions" RENAME COLUMN "tenant_id" TO "tenantId";
ALTER TABLE "provider_subscriptions" RENAME COLUMN "tier_id" TO "tierId";
ALTER TABLE "provider_subscriptions" RENAME COLUMN "start_date" TO "startDate";
ALTER TABLE "provider_subscriptions" RENAME COLUMN "end_date" TO "endDate";
ALTER TABLE "provider_subscriptions" RENAME COLUMN "next_billing_date" TO "nextBillingDate";
ALTER TABLE "provider_subscriptions" RENAME COLUMN "payment_gateway" TO "paymentGateway";
ALTER TABLE "provider_subscriptions" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "provider_subscriptions" RENAME COLUMN "updated_at" TO "updatedAt";

-- PaymentTransaction
ALTER TABLE "payment_transactions" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "payment_transactions" RENAME COLUMN "tenant_id" TO "tenantId";
ALTER TABLE "payment_transactions" RENAME COLUMN "subscription_id" TO "subscriptionId";
ALTER TABLE "payment_transactions" RENAME COLUMN "platform_fee" TO "platformFee";
ALTER TABLE "payment_transactions" RENAME COLUMN "processor_fee" TO "processorFee";
ALTER TABLE "payment_transactions" RENAME COLUMN "net_amount" TO "netAmount";
ALTER TABLE "payment_transactions" RENAME COLUMN "external_ref" TO "externalRef";
ALTER TABLE "payment_transactions" RENAME COLUMN "invoice_url" TO "invoiceUrl";
ALTER TABLE "payment_transactions" RENAME COLUMN "created_at" TO "createdAt";

-- RevenueRecord
ALTER TABLE "revenue_records" RENAME COLUMN "tenant_id" TO "tenantId";
ALTER TABLE "revenue_records" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "revenue_records" RENAME COLUMN "transaction_id" TO "transactionId";
ALTER TABLE "revenue_records" RENAME COLUMN "gross_amount" TO "grossAmount";
ALTER TABLE "revenue_records" RENAME COLUMN "platform_fee" TO "platformFee";
ALTER TABLE "revenue_records" RENAME COLUMN "processor_fee" TO "processorFee";
ALTER TABLE "revenue_records" RENAME COLUMN "net_amount" TO "netAmount";
ALTER TABLE "revenue_records" RENAME COLUMN "created_at" TO "createdAt";

-- ProviderCharge
ALTER TABLE "provider_charges" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "provider_charges" RENAME COLUMN "tenant_id" TO "tenantId";
ALTER TABLE "provider_charges" RENAME COLUMN "subscription_id" TO "subscriptionId";
ALTER TABLE "provider_charges" RENAME COLUMN "transaction_id" TO "transactionId";
ALTER TABLE "provider_charges" RENAME COLUMN "external_ref" TO "externalRef";
ALTER TABLE "provider_charges" RENAME COLUMN "due_date" TO "dueDate";
ALTER TABLE "provider_charges" RENAME COLUMN "paid_at" TO "paidAt";
ALTER TABLE "provider_charges" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "provider_charges" RENAME COLUMN "updated_at" TO "updatedAt";

-- ProviderInvoice
ALTER TABLE "provider_invoices" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "provider_invoices" RENAME COLUMN "tenant_id" TO "tenantId";
ALTER TABLE "provider_invoices" RENAME COLUMN "subscription_id" TO "subscriptionId";
ALTER TABLE "provider_invoices" RENAME COLUMN "transaction_id" TO "transactionId";
ALTER TABLE "provider_invoices" RENAME COLUMN "invoice_number" TO "invoiceNumber";
ALTER TABLE "provider_invoices" RENAME COLUMN "platform_fee" TO "platformFee";
ALTER TABLE "provider_invoices" RENAME COLUMN "processor_fee" TO "processorFee";
ALTER TABLE "provider_invoices" RENAME COLUMN "net_amount" TO "netAmount";
ALTER TABLE "provider_invoices" RENAME COLUMN "paid_at" TO "paidAt";
ALTER TABLE "provider_invoices" RENAME COLUMN "pdf_url" TO "pdfUrl";
ALTER TABLE "provider_invoices" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "provider_invoices" RENAME COLUMN "updated_at" TO "updatedAt";

-- SubscriptionTier
ALTER TABLE "subscription_tiers" RENAME COLUMN "tenant_id" TO "tenantId";
ALTER TABLE "subscription_tiers" RENAME COLUMN "max_listings" TO "maxListings";
ALTER TABLE "subscription_tiers" RENAME COLUMN "platform_fee_percent" TO "platformFeePercent";
ALTER TABLE "subscription_tiers" RENAME COLUMN "verification_required" TO "verificationRequired";
ALTER TABLE "subscription_tiers" RENAME COLUMN "created_at" TO "createdAt";

-- CommunityMerit
ALTER TABLE "community_merits" RENAME COLUMN "dispute_history" TO "disputeHistory";

-- Rename Unicode-aware indexes (those with quoted camelCase columns already had correct names)
-- We only need to update snake_case index names to PascalCase

ALTER INDEX "provider_verifications_provider_id_key" RENAME TO "ProviderVerification_providerId_key";
ALTER INDEX "provider_verifications_provider_id_idx" RENAME TO "ProviderVerification_providerId_idx";
ALTER INDEX "provider_legal_agreements_provider_id_idx" RENAME TO "ProviderLegalAgreement_providerId_idx";
ALTER INDEX "provider_legal_agreements_tenant_id_idx" RENAME TO "ProviderLegalAgreement_tenantId_idx";
ALTER INDEX "provider_reputation_provider_id_key" RENAME TO "ProviderReputation_providerId_key";
ALTER INDEX "provider_reputation_tenant_id_idx" RENAME TO "ProviderReputation_tenantId_idx";
ALTER INDEX "provider_merits_provider_id_idx" RENAME TO "ProviderMerit_providerId_idx";
ALTER INDEX "provider_merits_tenant_id_idx" RENAME TO "ProviderMerit_tenantId_idx";
ALTER INDEX "provider_subscriptions_provider_id_idx" RENAME TO "ProviderSubscription_providerId_idx";
ALTER INDEX "provider_subscriptions_tenant_id_idx" RENAME TO "ProviderSubscription_tenantId_idx";
ALTER INDEX "payment_transactions_provider_id_idx" RENAME TO "PaymentTransaction_providerId_idx";
ALTER INDEX "payment_transactions_subscription_id_idx" RENAME TO "PaymentTransaction_subscriptionId_idx";
ALTER INDEX "payment_transactions_tenant_id_idx" RENAME TO "PaymentTransaction_tenantId_idx";
ALTER INDEX "revenue_records_provider_id_idx" RENAME TO "RevenueRecord_providerId_idx";
ALTER INDEX "revenue_records_tenant_id_idx" RENAME TO "RevenueRecord_tenantId_idx";
ALTER INDEX "provider_charges_provider_id_idx" RENAME TO "ProviderCharge_providerId_idx";
ALTER INDEX "provider_charges_tenant_id_idx" RENAME TO "ProviderCharge_tenantId_idx";
ALTER INDEX "provider_invoices_provider_id_idx" RENAME TO "ProviderInvoice_providerId_idx";
ALTER INDEX "provider_invoices_tenant_id_idx" RENAME TO "ProviderInvoice_tenantId_idx";
ALTER INDEX "subscription_tiers_tenant_id_idx" RENAME TO "SubscriptionTier_tenantId_idx";

-- Rename tables
ALTER TABLE "provider_verifications" RENAME TO "ProviderVerification";
ALTER TABLE "provider_legal_agreements" RENAME TO "ProviderLegalAgreement";
ALTER TABLE "provider_reputation" RENAME TO "ProviderReputation";
ALTER TABLE "provider_merits" RENAME TO "ProviderMerit";
ALTER TABLE "provider_subscriptions" RENAME TO "ProviderSubscription";
ALTER TABLE "payment_transactions" RENAME TO "PaymentTransaction";
ALTER TABLE "revenue_records" RENAME TO "RevenueRecord";
ALTER TABLE "provider_charges" RENAME TO "ProviderCharge";
ALTER TABLE "provider_invoices" RENAME TO "ProviderInvoice";
ALTER TABLE "subscription_tiers" RENAME TO "SubscriptionTier";
ALTER TABLE "community_merits" RENAME TO "CommunityMerit";

-- Recreate all foreign key constraints

-- ProviderVerification → ServiceProvider
ALTER TABLE "ProviderVerification" ADD CONSTRAINT "ProviderVerification_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderLegalAgreement → ServiceProvider
ALTER TABLE "ProviderLegalAgreement" ADD CONSTRAINT "ProviderLegalAgreement_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderReputation → ServiceProvider
ALTER TABLE "ProviderReputation" ADD CONSTRAINT "ProviderReputation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderMerit → ServiceProvider
ALTER TABLE "ProviderMerit" ADD CONSTRAINT "ProviderMerit_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderSubscription → ServiceProvider
ALTER TABLE "ProviderSubscription" ADD CONSTRAINT "ProviderSubscription_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderSubscription → SubscriptionTier
ALTER TABLE "ProviderSubscription" ADD CONSTRAINT "ProviderSubscription_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "SubscriptionTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PaymentTransaction → ServiceProvider
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PaymentTransaction → ProviderSubscription
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProviderSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RevenueRecord → ServiceProvider
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RevenueRecord → PaymentTransaction
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderCharge → ServiceProvider
ALTER TABLE "ProviderCharge" ADD CONSTRAINT "ProviderCharge_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderCharge → ProviderSubscription
ALTER TABLE "ProviderCharge" ADD CONSTRAINT "ProviderCharge_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProviderSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderCharge → PaymentTransaction
ALTER TABLE "ProviderCharge" ADD CONSTRAINT "ProviderCharge_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ProviderInvoice → ServiceProvider
ALTER TABLE "ProviderInvoice" ADD CONSTRAINT "ProviderInvoice_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderInvoice → ProviderSubscription
ALTER TABLE "ProviderInvoice" ADD CONSTRAINT "ProviderInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProviderSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProviderInvoice → PaymentTransaction
ALTER TABLE "ProviderInvoice" ADD CONSTRAINT "ProviderInvoice_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CommunityMerit → user
ALTER TABLE "CommunityMerit" ADD CONSTRAINT "CommunityMerit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "CommunityMerit" ADD CONSTRAINT "CommunityMerit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT;
ALTER TABLE "CommunityMerit" ADD CONSTRAINT "CommunityMerit_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL;
