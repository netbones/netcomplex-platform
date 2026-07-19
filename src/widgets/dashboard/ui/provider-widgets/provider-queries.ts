'use client';

import { trpc } from '@api/client';

export interface ProviderVerification {
  providerId: string | null;
  rawStatus: 'PENDING' | 'PROBATION' | 'VERIFIED' | 'SUSPENDED';
  displayStatus: 'UNVERIFIED' | 'PROBATION' | 'VERIFIED' | 'SUSPENDED';
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  verificationThreshold: number;
  probationThreshold: number;
  isDefault: boolean;
  isVerified: boolean;
  isSuspended: boolean;
}

export interface ProviderReputationProgress {
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

export interface ProviderDashboardData {
  providerId: string;
  companyName: string;
  trade: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  verificationStatus: ProviderVerification['displayStatus'];
  verification: ProviderVerification;
  reputationScore: number;
  reputationProgress: ProviderReputationProgress;
  listingCount: number;
  activeListingsCount: number;
  inquiryCount: number;
  pendingInquiries: number;
  listings: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    verified: boolean;
    isPublished: boolean;
    rating: number;
    reviewCount: number;
    updatedAt: string;
  }>;
}

export interface ProviderAnalyticsData {
  period: '7d' | '30d' | '90d' | 'all';
  analyticsVisibility: 'full' | 'limited' | 'minimal' | 'none';
  verificationStatus: ProviderVerification['displayStatus'];
  verification: ProviderVerification;
  reputationScore: number;
  listingsCount: number;
  activeListingsCount: number;
  inquiriesCount: number;
  avgRating: number;
  totalViews: number;
  reviewSummary: {
    averageRating: number;
    reviewCount: number;
  };
  inquiriesSummary: {
    pending: number;
    responded: number;
  };
  reputationProgress: ProviderReputationProgress;
  limited: boolean;
  dataNotes?: string[];
  suspensionNotice?: string;
}

export interface ProviderVerificationResponse {
  providerRecordExists: boolean;
  verificationStatus: ProviderVerification['displayStatus'];
  verification: ProviderVerification;
  reputationProgress: ProviderReputationProgress;
  accessMode: 'permission' | 'provider-record' | 'provider-listings';
}

export interface ProviderReputationScoreResponse {
  verificationStatus: ProviderVerification['displayStatus'];
  reputationScore: number;
  progress: ProviderReputationProgress;
  verification: ProviderVerification;
}

export interface QueryError extends Error {
  data?: { code?: string; httpStatus?: number };
}

export function useProviderDashboard() {
  const query = trpc.providers.getDashboard.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });

  return {
    data: query.data?.data as ProviderDashboardData | undefined,
    isLoading: query.isLoading,
    error: query.error as QueryError | null,
  };
}

export function useProviderAnalytics(period: ProviderAnalyticsData['period'] = '30d') {
  const query = trpc.providers.getAnalytics.useQuery({ period }, {
    staleTime: 60_000,
  });

  return {
    data: query.data?.data as ProviderAnalyticsData | undefined,
    isLoading: query.isLoading,
    error: query.error as QueryError | null,
  };
}

export function useProviderVerification() {
  const query = trpc.providers.getVerificationStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  return {
    data: query.data?.data as ProviderVerificationResponse | undefined,
    isLoading: query.isLoading,
    error: query.error as QueryError | null,
  };
}

export function useProviderReputationScore() {
  const query = trpc.providers.getReputationScore.useQuery(undefined, {
    staleTime: 60_000,
  });

  return {
    data: query.data?.data as ProviderReputationScoreResponse | undefined,
    isLoading: query.isLoading,
    error: query.error as QueryError | null,
  };
}
