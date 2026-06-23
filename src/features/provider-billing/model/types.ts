'use client';

export interface BillingTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  formattedPrice: string;
  currency: string;
  maxListings: number | null;
  platformFeePercent: number;
  verificationRequired: boolean;
  features: Record<string, unknown>;
  allowedForProvider: boolean;
}

export interface BillingSubscription {
  id: string;
  tierId: string;
  tierName: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  startDate: string | null;
  endDate: string | null;
  nextBillingDate: string | null;
  price: number;
  formattedPrice: string;
  currency: string;
  paymentGateway: 'PAYSTACK' | 'PAYPAL' | null;
  features: Record<string, unknown>;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  transactionId: string;
  subscriptionId: string;
  tierName: string | null;
  total: number;
  platformFee: number;
  processorFee: number;
  netAmount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  downloadUrl: string | null;
  downloadReady: boolean;
}

export interface BillingCharge {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  gateway: 'PAYSTACK' | 'PAYPAL';
  externalRef: string | null;
  subscriptionStatus: string | null;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

export interface BillingHistoryItem {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  platformFee: number;
  processorFee: number;
  netAmount: number;
  status: string;
  gateway: 'PAYSTACK' | 'PAYPAL';
  externalRef: string | null;
  invoiceUrl: string | null;
  createdAt: string;
}

export interface BillingMerit {
  id: string;
  meritType: string;
  points: number;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface ReputationProgress {
  providerId: string | null;
  totalScore: number;
  responseTimeScore: number;
  qualityScore: number;
  reviewScore: number;
  complianceScore: number;
  engagementScore: number;
  verificationThreshold: number;
  remainingToVerification: number;
  progressPercentage: number;
  lastCalculatedAt: string | null;
}

export interface BillingResponse {
  providerId: string;
  companyName: string;
  verificationStatus: 'UNVERIFIED' | 'PROBATION' | 'VERIFIED' | 'SUSPENDED';
  verification: {
    verificationThreshold: number;
  };
  reputationProgress: ReputationProgress;
  currentSubscription: BillingSubscription | null;
  availableTiers: BillingTier[];
  feeSummary: {
    totalGross: number;
    totalPlatformFees: number;
    totalProcessorFees: number;
    totalNet: number;
    completedTransactions: number;
    pendingCharges: number;
  };
  invoices: BillingInvoice[];
  charges: BillingCharge[];
  paymentHistory: BillingHistoryItem[];
  recentMerits: BillingMerit[];
  gatewayConfiguration: {
    paystackConfigured: boolean;
    paypalConfigured: boolean;
  };
  notices: string[];
}

export interface ReputationResponse {
  verificationStatus: 'UNVERIFIED' | 'PROBATION' | 'VERIFIED' | 'SUSPENDED';
  reputationScore: number;
  progress: ReputationProgress;
  eligibleForVerification: boolean;
  band: 'PROBATION' | 'EMERGING' | 'VERIFIED_CANDIDATE';
  merits: BillingMerit[];
}
