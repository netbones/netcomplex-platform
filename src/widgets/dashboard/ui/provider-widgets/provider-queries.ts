'use client';

import { useQuery } from '@tanstack/react-query';

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

export interface ProviderCreditProgress {
  providerId: string | null;
  totalCredits: number;
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
  creditScore: number;
  creditProgress: ProviderCreditProgress;
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
  creditScore: number;
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
  creditProgress: ProviderCreditProgress;
  limited: boolean;
  dataNotes?: string[];
  suspensionNotice?: string;
}

export interface ProviderVerificationResponse {
  providerRecordExists: boolean;
  verificationStatus: ProviderVerification['displayStatus'];
  verification: ProviderVerification;
  creditProgress: ProviderCreditProgress;
  accessMode: 'permission' | 'provider-record' | 'provider-listings';
}

export interface ProviderCreditScoreResponse {
  verificationStatus: ProviderVerification['displayStatus'];
  creditScore: number;
  progress: ProviderCreditProgress;
  verification: ProviderVerification;
}

export interface QueryError extends Error {
  status?: number;
}

async function fetchApi<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      body?.error?.message ?? body?.message ?? `Request failed with status ${response.status}`
    ) as QueryError;
    error.status = response.status;
    throw error;
  }

  return (body?.data ?? body) as T;
}

export function useProviderDashboard() {
  return useQuery<ProviderDashboardData, QueryError>({
    queryKey: ['providers', 'dashboard'],
    queryFn: () => fetchApi<ProviderDashboardData>('/api/providers/dashboard'),
    staleTime: 60_000,
  });
}

export function useProviderAnalytics(period: ProviderAnalyticsData['period'] = '30d') {
  return useQuery<ProviderAnalyticsData, QueryError>({
    queryKey: ['providers', 'analytics', period],
    queryFn: () => fetchApi<ProviderAnalyticsData>(`/api/providers/analytics?period=${period}`),
    staleTime: 60_000,
  });
}

export function useProviderVerification() {
  return useQuery<ProviderVerificationResponse, QueryError>({
    queryKey: ['providers', 'verification'],
    queryFn: () => fetchApi<ProviderVerificationResponse>('/api/providers/verification'),
    staleTime: 60_000,
  });
}

export function useProviderCreditScore() {
  return useQuery<ProviderCreditScoreResponse, QueryError>({
    queryKey: ['providers', 'credit-score'],
    queryFn: () => fetchApi<ProviderCreditScoreResponse>('/api/providers/analytics/credit-score'),
    staleTime: 60_000,
  });
}
