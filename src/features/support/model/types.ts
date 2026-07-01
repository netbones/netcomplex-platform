import type { SupportTarget } from '@entities/dwallet';

export interface SupportRecord {
  id: string;
  targetType: SupportTarget;
  targetId: string;
  chips: number;
  message: string | null;
  isAnonymous: boolean;
  createdAt: string;
}

export interface SupportAggregate {
  totalChips: number;
  supporterCount: number;
  hasSupported: boolean;
  yourChips: number;
  topSupporters: Array<{ name: string | null; chips: number; isAnonymous: boolean }>;
}

export interface SupportInput {
  targetType: SupportTarget;
  targetId: string;
  recipientUserId: string;
  chips: number;
  message?: string;
  isAnonymous?: boolean;
}
