import { describe, expect, it } from 'vitest';

import {
  calculateBillingBreakdown,
  canSubscribeToTier,
  deriveInvoiceNumber,
  getAllowedTierCodesForVerificationStatus,
  providerBillingSubscribeSchema,
} from './billing';

describe('provider billing helpers', () => {
  it('calculates platform and processor fees for Paystack', () => {
    const breakdown = calculateBillingBreakdown({
      amount: 100,
      platformFeePercent: 8,
      gateway: 'PAYSTACK',
    });

    expect(breakdown.platformFee).toBe(8);
    expect(breakdown.processorFee).toBe(1.5);
    expect(breakdown.netAmount).toBe(90.5);
  });

  it('calculates platform and processor fees for PayPal', () => {
    const breakdown = calculateBillingBreakdown({
      amount: 100,
      platformFeePercent: 5,
      gateway: 'PAYPAL',
    });

    expect(breakdown.platformFee).toBe(5);
    expect(breakdown.processorFee).toBe(2.9);
    expect(breakdown.netAmount).toBe(92.1);
  });

  it('limits probation providers to the probation tier', () => {
    expect(getAllowedTierCodesForVerificationStatus('PROBATION')).toEqual(['PROBATION']);
    expect(
      canSubscribeToTier({
        verificationStatus: 'PROBATION',
        tierFeatures: { code: 'VERIFIED_STANDARD' },
      })
    ).toBe(false);
    expect(
      canSubscribeToTier({
        verificationStatus: 'PROBATION',
        tierFeatures: { code: 'PROBATION' },
      })
    ).toBe(true);
  });

  it('allows verified providers to access verified tiers', () => {
    expect(getAllowedTierCodesForVerificationStatus('VERIFIED')).toEqual([
      'VERIFIED_STANDARD',
      'VERIFIED_PREMIUM',
    ]);
    expect(
      canSubscribeToTier({
        verificationStatus: 'VERIFIED',
        tierFeatures: { code: 'VERIFIED_PREMIUM' },
      })
    ).toBe(true);
  });

  it('validates subscribe input', () => {
    const parsed = providerBillingSubscribeSchema.safeParse({
      tierId: 'tier_123',
      paymentGateway: 'PAYSTACK',
    });

    expect(parsed.success).toBe(true);
  });

  it('derives deterministic invoice numbers', () => {
    const invoiceNumber = deriveInvoiceNumber(
      'abcd1234-transaction',
      new Date('2026-06-22T10:00:00Z')
    );
    expect(invoiceNumber).toBe('INV-202606-ABCD1234');
  });
});
