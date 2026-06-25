// ── String literal union types (mirroring Prisma enums) ────────────────

export type WalletStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export type TransactionType = 'CREDIT' | 'DEBIT' | 'ROLLOVER' | 'ADJUSTMENT';

export type TransactionSource =
  | 'RESIDENT_DATA_SHARE'
  | 'COMMUNITY_MERITS'
  | 'REFERRAL_REWARD'
  | 'VOLUNTEER_CREDIT'
  | 'AI_CREDIT'
  | 'MARKETPLACE_CREDIT';

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// ── Domain interfaces ────────────────────────────────────────────────────

export interface DWalletSummary {
  balance: string;
  lifetimeEarned: string;
  lifetimePaid: string;
  currency: string;
  status: WalletStatus;
  consents: ConsentState[];
  recentTransactions: TransactionItem[];
}

export interface ConsentState {
  streamKey: string;
  label: string;
  description: string | null;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
}

export interface TransactionItem {
  id: string;
  type: TransactionType;
  amount: string;
  description: string;
  sourceType: TransactionSource;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
}

export interface PayoutRequestItem {
  id: string;
  amount: string;
  status: PayoutStatus;
  method: string | null;
  createdAt: string;
  processedAt: string | null;
  notes: string | null;
}

export interface StreamConfig {
  id: string;
  key: string;
  label: string;
  description: string | null;
  residentSharePct: string;
  isActive: boolean;
}

export interface AdminStats {
  optedInResidents: number;
  totalRewardsMonth: string;
  pendingPayouts: number;
  totalOptedInAllStreams: number;
}

export interface BatchRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  streamKey: string;
  totalRevenue: string;
  residentPool: string;
  participantCount: number;
  status: BatchStatus;
  processedAt: string | null;
  createdAt: string;
}
