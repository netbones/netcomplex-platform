export interface ProviderListItem {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  trade: string | null;
  isActive: boolean;
  createdAt: string;
  verificationStatus: string;
  verificationNotes: string | null;
  creditScore: number;
  revenueTotal: number;
  platformFeeTotal: number;
}

export interface ProviderListResponse {
  providers: ProviderListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: Record<string, number>;
  summary: {
    totalProviders: number;
    pendingProviders: number;
    probationProviders: number;
    verifiedProviders: number;
    suspendedProviders: number;
    totalRevenue: number;
    totalPlatformFees: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
  };
}

export interface PendingProviderItem {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  trade: string | null;
  isActive: boolean;
  createdAt: string;
  verificationStatus: string | null;
  verificationNotes: string | null;
  dueDiligence: {
    workflowStatus: string;
    items: Array<{
      key: string;
      label: string;
      description: string;
      status: string;
    }>;
  };
  legalStatus: {
    acceptedAgreementCount: number;
    allAccepted: boolean;
  };
}

export interface PendingProvidersResponse {
  providers: PendingProviderItem[];
}

export interface RegistrationModeResponse {
  mode: 'OPEN' | 'INVITATION_ONLY';
  paymentSettingsUnlocked: boolean;
  gatewayStatus: {
    paystackConfigured: boolean;
    paypalConfigured: boolean;
  };
}

export interface ProviderDetailResponse {
  provider: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    trade: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    verificationStatus: string;
  };
  verification: {
    displayStatus: string;
    notes: string | null;
    startDate: string | null;
    endDate: string | null;
    verificationThreshold: number;
  };
  verificationHistory: Array<{
    id: string;
    status: string;
    notes: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  dueDiligence: {
    workflowStatus: string;
    items: Array<{
      key: string;
      label: string;
      description: string;
      status: string;
    }>;
  };
  legalStatus: {
    acceptedAgreementCount: number;
    allAccepted: boolean;
    documents: Array<{
      key: string;
      label: string;
      version: string;
      accepted: boolean;
      acceptedAt: string | null;
    }>;
  };
  legalAgreements: Array<{
    id: string;
    agreementType: string;
    version: string;
    acceptedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
  credits: {
    totalCredits: number;
    responseTimeScore: number | null;
    qualityScore: number | null;
    reviewScore: number | null;
    complianceScore: number | null;
    engagementScore: number | null;
    lastCalculatedAt: string | null;
  } | null;
  creditHistory: Array<{
    id: string;
    meritType: string;
    points: number;
    description: string | null;
    createdAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    price: number;
    currency: string;
    paymentGateway: string | null;
    startDate: string | null;
    endDate: string | null;
    nextBillingDate: string | null;
    tierName: string | null;
    platformFeePercent: number;
  }>;
  paymentHistory: Array<{
    id: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    platformFee: number;
    processorFee: number;
    netAmount: number;
    status: string;
    gateway: string;
    externalRef: string | null;
    invoiceUrl: string | null;
    createdAt: string;
    tierName: string | null;
  }>;
  paymentProfile: {
    linkedGateways: string[];
    currentGateway: string | null;
    currentTier: string | null;
    note: string;
  };
  revenueSummary: {
    totalRevenue: number;
    totalPlatformFees: number;
    totalProcessorFees: number;
    totalNetPayout: number;
  };
  activityTimeline: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
}

export interface ProviderAnalyticsResponse {
  dateRange: {
    start: string | null;
    end: string | null;
    grouping: string;
  };
  metrics: {
    totalProviders: number;
    newProvidersThisMonth: number;
    newProvidersThisQuarter: number;
    verificationRate: number;
    averageCreditScore: number;
    suspendedCount: number;
    revenueMetrics: {
      totalRevenue: number;
      totalPlatformFees: number;
      totalProcessorFees: number;
      totalNetPayout: number;
    };
  };
  statusCounts: Record<string, number>;
  topProviders: Array<{
    id: string;
    companyName: string;
    creditScore: number;
    status: string;
  }>;
  suspendedReasons: Array<{
    companyName: string;
    reason: string;
  }>;
  paymentMethodDistribution: Array<{
    gateway: string;
    count: number;
    revenue: number;
  }>;
  registrationTimeline: Array<{
    label: string;
    value: number;
  }>;
}

export interface RevenueSummaryResponse {
  dateRange: {
    start: string | null;
    end: string | null;
    grouping: string;
  };
  filters: {
    gateway: string | null;
    tier: string | null;
  };
  totals: {
    totalRevenue: number;
    totalPlatformFees: number;
    totalProcessorFees: number;
    totalNetPayout: number;
  };
  byGateway: Array<{
    gateway: string;
    transactionCount: number;
    totalRevenue: number;
    totalPlatformFees: number;
    totalProcessorFees: number;
    totalNetPayout: number;
  }>;
  byTier: Array<{
    tierName: string;
    totalRevenue: number;
    totalPlatformFees: number;
    transactionCount: number;
  }>;
  timeline: Array<{
    label: string;
    totalRevenue: number;
    totalPlatformFees: number;
    totalProcessorFees: number;
    totalNetPayout: number;
  }>;
  gatewayHealth: Record<
    string,
    {
      status: string;
      message: string;
    }
  >;
  licenseCompliance: {
    reference: string;
    status: string;
    trackedBasis: string;
    notes: string[];
  };
  dataNotes: string[];
}

export interface RevenueTransactionItem {
  id: string;
  providerId: string;
  providerCompanyName: string | null;
  subscriptionId: string;
  amount: number;
  currency: string;
  platformFee: number;
  processorFee: number;
  netAmount: number;
  status: string;
  gateway: string;
  externalRef: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  tierName: string | null;
}

export interface RevenueDetailsResponse {
  transactions: RevenueTransactionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TransactionItem {
  id: string;
  providerId: string;
  providerCompanyName: string | null;
  amount: number;
  currency: string;
  platformFee: number;
  processorFee: number;
  netAmount: number;
  refundableAmount: number;
  status: string;
  gateway: string;
  externalRef: string | null;
  invoiceUrl: string | null;
  createdAt: string;
}

export interface TransactionsResponse {
  transactions: TransactionItem[];
  statusCounts: Record<string, number>;
  summary: {
    totalAmount: number;
    totalRefundable: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RefundResponse {
  refundReference: string;
  transactionId: string;
  gateway: string;
  requestedAmount: number;
  maxRefundable: number;
  status: string;
  message: string;
}
