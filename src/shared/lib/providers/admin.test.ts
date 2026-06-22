import { describe, expect, it } from 'vitest';

import {
  buildRevenueBucketKey,
  calculateGatewayHealth,
  getDateRangeFromSearchParams,
  getRefundableAmount,
  normalizeAdminProviderStatus,
  normalizeRevenueGrouping,
  parsePositiveInt,
} from './admin';

describe('provider admin helpers', () => {
  it('normalizes provider moderation statuses', () => {
    expect(normalizeAdminProviderStatus('verified')).toBe('VERIFIED');
    expect(normalizeAdminProviderStatus(' suspended ')).toBe('SUSPENDED');
    expect(normalizeAdminProviderStatus('invalid')).toBeNull();
  });

  it('normalizes revenue grouping and pagination values safely', () => {
    expect(normalizeRevenueGrouping('weekly')).toBe('weekly');
    expect(normalizeRevenueGrouping('weird')).toBe('monthly');
    expect(parsePositiveInt('40', 20, { min: 1, max: 50 })).toBe(40);
    expect(parsePositiveInt('999', 20, { min: 1, max: 50 })).toBe(50);
    expect(parsePositiveInt(null, 20, { min: 1, max: 50 })).toBe(20);
  });

  it('builds deterministic revenue buckets', () => {
    const value = new Date('2026-06-22T10:00:00Z');
    expect(buildRevenueBucketKey(value, 'daily')).toBe('2026-06-22');
    expect(buildRevenueBucketKey(value, 'monthly')).toBe('2026-06');
    expect(buildRevenueBucketKey(value, 'weekly')).toBe('2026-06-22');
  });

  it('summarizes gateway health based on configuration and outcomes', () => {
    expect(
      calculateGatewayHealth({ configured: false, completed: 0, failed: 0, pending: 0 }).status
    ).toBe('configuration_required');
    expect(
      calculateGatewayHealth({ configured: true, completed: 4, failed: 1, pending: 0 }).status
    ).toBe('healthy');
    expect(
      calculateGatewayHealth({ configured: true, completed: 0, failed: 2, pending: 1 }).status
    ).toBe('degraded');
  });

  it('caps refundable amount to recorded net revenue', () => {
    expect(getRefundableAmount({ amount: 100, netAmount: 90.5 })).toBe(90.5);
    expect(getRefundableAmount({ amount: 100, platformFee: 8, processorFee: 1.5 })).toBe(90.5);
  });

  it('uses a default date range when filters are absent', () => {
    const range = getDateRangeFromSearchParams(new URLSearchParams(), 30);
    expect(range.startDate).not.toBeNull();
    expect(range.endDate).not.toBeNull();
    expect(range.endDate!.getTime()).toBeGreaterThan(range.startDate!.getTime());
  });
});
