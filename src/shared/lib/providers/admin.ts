import { roundCurrency } from './billing';

export const ADMIN_PROVIDER_STATUSES = ['PENDING', 'PROBATION', 'VERIFIED', 'SUSPENDED'] as const;
export type AdminProviderStatus = (typeof ADMIN_PROVIDER_STATUSES)[number];

export const REVENUE_GROUPINGS = ['daily', 'weekly', 'monthly'] as const;
export type RevenueGrouping = (typeof REVENUE_GROUPINGS)[number];

export interface GatewayHealthInput {
  configured: boolean;
  completed: number;
  failed: number;
  pending: number;
}

export interface GatewayHealthSummary {
  status: 'healthy' | 'degraded' | 'configuration_required' | 'idle';
  message: string;
}

export function normalizeAdminProviderStatus(
  value: string | null | undefined
): AdminProviderStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return ADMIN_PROVIDER_STATUSES.includes(normalized as AdminProviderStatus)
    ? (normalized as AdminProviderStatus)
    : null;
}

export function normalizeRevenueGrouping(value: string | null | undefined): RevenueGrouping {
  return REVENUE_GROUPINGS.includes((value ?? '').trim().toLowerCase() as RevenueGrouping)
    ? ((value ?? '').trim().toLowerCase() as RevenueGrouping)
    : 'monthly';
}

export function parsePositiveInt(
  value: string | null | undefined,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const min = options.min ?? Number.MIN_SAFE_INTEGER;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  return Math.max(min, Math.min(max, parsed));
}

export function buildRevenueBucketKey(date: Date, grouping: RevenueGrouping): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  if (grouping === 'daily') {
    return `${year}-${month}-${day}`;
  }

  if (grouping === 'weekly') {
    const current = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
    const weekday = current.getUTCDay();
    const offset = weekday === 0 ? -6 : 1 - weekday;
    current.setUTCDate(current.getUTCDate() + offset);

    const weekYear = current.getUTCFullYear();
    const weekMonth = String(current.getUTCMonth() + 1).padStart(2, '0');
    const weekDay = String(current.getUTCDate()).padStart(2, '0');
    return `${weekYear}-${weekMonth}-${weekDay}`;
  }

  return `${year}-${month}`;
}

export function calculateGatewayHealth(input: GatewayHealthInput): GatewayHealthSummary {
  if (!input.configured) {
    return {
      status: 'configuration_required',
      message: 'Gateway credentials are not configured in this environment.',
    };
  }

  const totalActivity = input.completed + input.failed + input.pending;
  if (totalActivity === 0) {
    return {
      status: 'idle',
      message: 'Gateway is configured, but no recent provider billing activity was recorded.',
    };
  }

  if (input.failed > input.completed || (input.failed > 0 && input.completed === 0)) {
    return {
      status: 'degraded',
      message: 'Recent transaction failures outweigh successful completions and require review.',
    };
  }

  if (input.pending > input.completed && input.failed > 0) {
    return {
      status: 'degraded',
      message: 'Gateway has accumulating pending transactions and recent failures.',
    };
  }

  return {
    status: 'healthy',
    message: 'Gateway is configured and recent provider billing activity looks stable.',
  };
}

export function getRefundableAmount(params: {
  amount: number;
  platformFee?: number;
  processorFee?: number;
  netAmount?: number;
}): number {
  if (typeof params.netAmount === 'number' && Number.isFinite(params.netAmount)) {
    return roundCurrency(Math.max(params.netAmount, 0));
  }

  const amount = Number.isFinite(params.amount) ? params.amount : 0;
  const platformFee = Number.isFinite(params.platformFee ?? NaN) ? (params.platformFee ?? 0) : 0;
  const processorFee = Number.isFinite(params.processorFee ?? NaN) ? (params.processorFee ?? 0) : 0;

  return roundCurrency(Math.max(amount - platformFee - processorFee, 0));
}

export function getDateRangeFromSearchParams(
  searchParams: URLSearchParams,
  defaultDays = 90
): { startDate: Date | null; endDate: Date | null } {
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const parsedStart = start ? new Date(start) : null;
  const parsedEnd = end ? new Date(end) : null;

  if (
    parsedStart &&
    parsedEnd &&
    Number.isFinite(parsedStart.getTime()) &&
    Number.isFinite(parsedEnd.getTime())
  ) {
    return { startDate: parsedStart, endDate: parsedEnd };
  }

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}
