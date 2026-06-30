import { createId } from '@shared/lib/id';
/**
 * Tenant billing utility helpers.
 *
 * Mirrors the patterns in @shared/lib/providers/billing.ts but adapted
 * for tenant billing (tenant slug-based invoice numbers, tenant-specific
 * fee structures, etc.).
 */

// ---------------------------------------------------------------------------
// deriveInvoiceNumber
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic invoice number with tenant slug prefix.
 * Format: INV-{tenantSlug}-{YYYYMM}-{random4}
 *
 * The random suffix ensures uniqueness across invoices generated in the
 * same month. Primary uniqueness is enforced by the DB invoice_number field.
 */
export function deriveInvoiceNumber(params: { tenantSlug: string }): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const random = createId().slice(0, 4);
  return `INV-${params.tenantSlug}-${year}${month}-${random}`;
}

// ---------------------------------------------------------------------------
// addBillingCycleMonths
// ---------------------------------------------------------------------------

/**
 * Adds N months to a date, handling month-end edge cases.
 *
 * JavaScript's native setMonth() handles most cases correctly:
 * - Jan 31 + 1 month → Feb 28/29 (depending on leap year)
 * - March 31 + 1 month → April 30
 * - December + 1 month → January of next year
 */
export function addBillingCycleMonths(date: Date, months = 1): Date {
  const nextDate = new Date(date);
  const targetMonth = nextDate.getMonth() + months;
  nextDate.setMonth(targetMonth);

  // Clamp month-end overflow: if setMonth rolled into the next month
  // (e.g. Jan 31 → Feb 31 → Mar 3), rewind to last day of target month.
  if (nextDate.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    nextDate.setDate(0); // go to last day of previous month (the target month)
  }

  return nextDate;
}

// ---------------------------------------------------------------------------
// calculateBillingBreakdown
// ---------------------------------------------------------------------------

/**
 * Calculates the billing breakdown for a given amount and payment gateway.
 *
 * Fee structures:
 *   Paystack: 1.5% + R1.00 (ZAR flat fee)
 *   PayPal:   3.9% + R2.00 (ZAR flat fee)
 *   Platform: 5% of gross amount
 *
 * Net = gross - platformFee - processorFee
 * All values rounded to 2 decimal places.
 */
export function calculateBillingBreakdown(params: {
  amount: number;
  gateway: 'PAYSTACK' | 'PAYPAL';
}): {
  grossAmount: number;
  platformFee: number;
  processorFee: number;
  netAmount: number;
} {
  const grossAmount = roundCurrency(params.amount);

  if (grossAmount <= 0) {
    return { grossAmount: 0, platformFee: 0, processorFee: 0, netAmount: 0 };
  }

  const platformFee = roundCurrency(grossAmount * 0.05); // 5% platform fee

  let processorFee: number;
  if (params.gateway === 'PAYSTACK') {
    processorFee = roundCurrency(grossAmount * 0.015 + 1.0); // 1.5% + R1.00
  } else {
    processorFee = roundCurrency(grossAmount * 0.039 + 2.0); // 3.9% + R2.00
  }

  const netAmount = roundCurrency(Math.max(grossAmount - platformFee - processorFee, 0));

  return { grossAmount, platformFee, processorFee, netAmount };
}

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

/**
 * Formats a number as a ZAR currency string.
 * Default locale: en-ZA (South Africa).
 */
export function formatCurrency(amount: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// decimalToNumber
// ---------------------------------------------------------------------------

/**
 * Converts a Drizzle decimal column value (stored as string) to a number.
 * Handles null, undefined, empty string, and already-numeric values.
 */
export function decimalToNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const normalized = Number.parseFloat(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
