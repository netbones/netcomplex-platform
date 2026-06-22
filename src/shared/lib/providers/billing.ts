import { z } from 'zod';

export const PROVIDER_PAYMENT_GATEWAYS = ['PAYSTACK', 'PAYPAL'] as const;
export type ProviderPaymentGateway = (typeof PROVIDER_PAYMENT_GATEWAYS)[number];

export const PROVIDER_SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'CANCELLED',
  'EXPIRED',
  'PENDING',
] as const;
export type ProviderSubscriptionStatus = (typeof PROVIDER_SUBSCRIPTION_STATUSES)[number];

export type ProviderVerificationDisplayStatus = 'UNVERIFIED' | 'PROBATION' | 'VERIFIED' | 'SUSPENDED';

export interface DefaultProviderSubscriptionTier {
  code: 'PROBATION' | 'VERIFIED_STANDARD' | 'VERIFIED_PREMIUM';
  name: string;
  description: string;
  price: string;
  currency: 'ZAR';
  maxListings: number | null;
  verificationRequired: boolean;
  platformFeePercent: string;
  features: {
    code: string;
    analytics: 'basic' | 'full' | 'advanced';
    promotion: boolean;
    priorityPlacement: boolean;
    supportLevel: 'community' | 'standard' | 'priority';
  };
}

export const DEFAULT_PROVIDER_SUBSCRIPTION_TIERS: DefaultProviderSubscriptionTier[] = [
  {
    code: 'PROBATION',
    name: 'Probation',
    description:
      'Reduced-cost onboarding tier for providers still building community trust and verification history.',
    price: '0',
    currency: 'ZAR',
    maxListings: 3,
    verificationRequired: false,
    platformFeePercent: '10',
    features: {
      code: 'PROBATION',
      analytics: 'basic',
      promotion: false,
      priorityPlacement: false,
      supportLevel: 'community',
    },
  },
  {
    code: 'VERIFIED_STANDARD',
    name: 'Verified Standard',
    description:
      'Full provider access for verified businesses with standard platform placement and analytics.',
    price: '29',
    currency: 'ZAR',
    maxListings: null,
    verificationRequired: true,
    platformFeePercent: '8',
    features: {
      code: 'VERIFIED_STANDARD',
      analytics: 'full',
      promotion: true,
      priorityPlacement: false,
      supportLevel: 'standard',
    },
  },
  {
    code: 'VERIFIED_PREMIUM',
    name: 'Verified Premium',
    description:
      'Priority placement and advanced analytics for verified providers operating at scale.',
    price: '99',
    currency: 'ZAR',
    maxListings: null,
    verificationRequired: true,
    platformFeePercent: '5',
    features: {
      code: 'VERIFIED_PREMIUM',
      analytics: 'advanced',
      promotion: true,
      priorityPlacement: true,
      supportLevel: 'priority',
    },
  },
];

export const providerBillingSubscribeSchema = z.object({
  tierId: z.string().trim().min(1, 'tierId is required'),
  paymentGateway: z.enum(PROVIDER_PAYMENT_GATEWAYS),
  callbackUrl: z.string().trim().url().optional(),
});

export type ProviderBillingSubscribeInput = z.infer<typeof providerBillingSubscribeSchema>;

export const providerBillingPatchSchema = z.object({
  providerId: z.string().trim().min(1, 'providerId is required'),
  subscriptionId: z.string().trim().min(1, 'subscriptionId is required'),
  status: z.enum(PROVIDER_SUBSCRIPTION_STATUSES),
  endDate: z.string().datetime().nullable().optional(),
  nextBillingDate: z.string().datetime().nullable().optional(),
});

export type ProviderBillingPatchInput = z.infer<typeof providerBillingPatchSchema>;

export const providerBillingCancelSchema = z.object({
  subscriptionId: z.string().trim().optional(),
});

export function decimalToNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const normalized = Number.parseFloat(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getProcessorFeePercent(gateway: ProviderPaymentGateway): number {
  return gateway === 'PAYSTACK' ? 1.5 : 2.9;
}

export function calculateBillingBreakdown(params: {
  amount: string | number;
  platformFeePercent: string | number;
  gateway: ProviderPaymentGateway;
}) {
  const amount = roundCurrency(decimalToNumber(params.amount));
  const platformFeePercent = decimalToNumber(params.platformFeePercent);
  const processorFeePercent = getProcessorFeePercent(params.gateway);
  const platformFee = roundCurrency((amount * platformFeePercent) / 100);
  const processorFee = roundCurrency((amount * processorFeePercent) / 100);
  const netAmount = roundCurrency(Math.max(amount - platformFee - processorFee, 0));

  return {
    amount,
    platformFeePercent,
    processorFeePercent,
    platformFee,
    processorFee,
    netAmount,
  };
}

export function addBillingCycleMonths(date: Date, months = 1): Date {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

export function resolveTierCode(input: { name?: string | null; features?: unknown }): string {
  if (
    input.features &&
    typeof input.features === 'object' &&
    'code' in input.features &&
    typeof (input.features as { code?: unknown }).code === 'string'
  ) {
    return ((input.features as { code: string }).code || '').toUpperCase();
  }

  const normalizedName = (input.name ?? '').trim().toUpperCase();
  if (normalizedName === 'PROBATION') return 'PROBATION';
  if (normalizedName === 'VERIFIED STANDARD') return 'VERIFIED_STANDARD';
  if (normalizedName === 'VERIFIED PREMIUM') return 'VERIFIED_PREMIUM';
  return normalizedName;
}

export function getAllowedTierCodesForVerificationStatus(
  status: ProviderVerificationDisplayStatus
): string[] {
  switch (status) {
    case 'VERIFIED':
      return ['VERIFIED_STANDARD', 'VERIFIED_PREMIUM'];
    case 'SUSPENDED':
      return [];
    case 'UNVERIFIED':
    case 'PROBATION':
    default:
      return ['PROBATION'];
  }
}

export function canSubscribeToTier(params: {
  verificationStatus: ProviderVerificationDisplayStatus;
  tierName?: string | null;
  tierFeatures?: unknown;
}): boolean {
  const allowedTierCodes = getAllowedTierCodesForVerificationStatus(params.verificationStatus);
  const tierCode = resolveTierCode({
    name: params.tierName,
    features: params.tierFeatures,
  });

  return allowedTierCodes.includes(tierCode);
}

export function deriveInvoiceNumber(transactionId: string, createdAt: Date): string {
  const year = createdAt.getUTCFullYear();
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
  return `INV-${year}${month}-${transactionId.slice(0, 8).toUpperCase()}`;
}

export function formatCurrency(amount: string | number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimalToNumber(amount));
}
