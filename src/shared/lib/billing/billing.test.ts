import { describe, it, expect } from 'vitest';
import {
  deriveInvoiceNumber,
  addBillingCycleMonths,
  calculateBillingBreakdown,
  formatCurrency,
  decimalToNumber,
} from './helpers';

describe('deriveInvoiceNumber', () => {
  it('generates invoice number with tenant slug prefix', () => {
    const result = deriveInvoiceNumber({ tenantSlug: 'soralia' });
    expect(result).toMatch(/^INV-soralia-\d{6}-[a-f0-9]{4}$/);
  });

  it('includes current year-month in the format YYYYMM', () => {
    const result = deriveInvoiceNumber({ tenantSlug: 'test' });
    const now = new Date();
    const yearMonth = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(result).toContain(`INV-test-${yearMonth}-`);
  });

  it('generates unique numbers for same tenant within same second', () => {
    const results = new Set<string>();
    for (let i = 0; i < 10; i++) {
      results.add(deriveInvoiceNumber({ tenantSlug: 'test' }));
    }
    // At least 8 of 10 should be unique (allowing for rare collision on random suffix)
    expect(results.size).toBeGreaterThanOrEqual(8);
  });
});

describe('addBillingCycleMonths', () => {
  it('adds one month to mid-month date', () => {
    const result = addBillingCycleMonths(new Date('2026-01-15'), 1);
    expect(result.toISOString().slice(0, 10)).toBe('2026-02-15');
  });

  it('handles Jan 31 → Feb 28 (non-leap year)', () => {
    const result = addBillingCycleMonths(new Date('2026-01-31'), 1);
    expect(result.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('handles March 31 → April 30', () => {
    const result = addBillingCycleMonths(new Date('2026-03-31'), 1);
    expect(result.toISOString().slice(0, 10)).toBe('2026-04-30');
  });

  it('adds 12 months correctly', () => {
    const result = addBillingCycleMonths(new Date('2026-06-15'), 12);
    expect(result.toISOString().slice(0, 10)).toBe('2027-06-15');
  });

  it('handles December → January year rollover', () => {
    const result = addBillingCycleMonths(new Date('2026-12-01'), 1);
    expect(result.getUTCFullYear()).toBe(2027);
    expect(result.getUTCMonth()).toBe(0); // January
  });
});

describe('calculateBillingBreakdown', () => {
  it('calculates Paystack fees correctly', () => {
    const result = calculateBillingBreakdown({ amount: 299, gateway: 'PAYSTACK' });
    expect(result.grossAmount).toBe(299);
    // Platform: 5% of 299 = 14.95
    expect(result.platformFee).toBeCloseTo(14.95, 2);
    // Processor: 1.5% of 299 + R1.00 = 4.485 + 1.0 = 5.485 → 5.49
    expect(result.processorFee).toBeCloseTo(5.49, 2);
    // Net: 299 - 14.95 - 5.49 = 278.56
    expect(result.netAmount).toBeCloseTo(278.56, 2);
  });

  it('calculates PayPal fees correctly', () => {
    const result = calculateBillingBreakdown({ amount: 299, gateway: 'PAYPAL' });
    expect(result.grossAmount).toBe(299);
    // Platform: 5% of 299 = 14.95
    expect(result.platformFee).toBeCloseTo(14.95, 2);
    // Processor: 3.9% of 299 + R2.00 = 11.661 + 2.0 = 13.66
    expect(result.processorFee).toBeCloseTo(13.66, 2);
    // Net: 299 - 14.95 - 13.66 = 270.39
    expect(result.netAmount).toBeCloseTo(270.39, 2);
  });

  it('handles zero amount', () => {
    const result = calculateBillingBreakdown({ amount: 0, gateway: 'PAYSTACK' });
    expect(result.grossAmount).toBe(0);
    expect(result.platformFee).toBe(0);
    expect(result.processorFee).toBe(0);
    expect(result.netAmount).toBe(0);
  });

  it('handles large amount', () => {
    const result = calculateBillingBreakdown({ amount: 9990, gateway: 'PAYSTACK' });
    expect(result.grossAmount).toBe(9990);
    expect(result.platformFee).toBeCloseTo(499.5, 1);
    expect(result.processorFee).toBeCloseTo(150.85, 2); // 1.5% + R1.00 = 150.85
    expect(result.netAmount).toBeCloseTo(9339.65, 2);
  });
});

describe('formatCurrency', () => {
  it('formats ZAR currency with expected prefix', () => {
    const result = formatCurrency(299);
    expect(result).toContain('R');
    expect(result).toContain('299');
  });

  it('formats zero amount', () => {
    const result = formatCurrency(0);
    expect(result).toContain('R');
    expect(result).toContain('0');
  });

  it('formats with cents', () => {
    const result = formatCurrency(299.99);
    expect(result).toContain('R');
    expect(result).toContain('299,99');
  });
});

describe('decimalToNumber', () => {
  it('converts string decimal to number', () => {
    expect(decimalToNumber('299.00')).toBe(299);
  });

  it('handles null', () => {
    expect(decimalToNumber(null)).toBe(0);
  });

  it('handles undefined', () => {
    expect(decimalToNumber(undefined)).toBe(0);
  });

  it('handles number input', () => {
    expect(decimalToNumber(299)).toBe(299);
  });

  it('handles empty string', () => {
    expect(decimalToNumber('')).toBe(0);
  });
});
