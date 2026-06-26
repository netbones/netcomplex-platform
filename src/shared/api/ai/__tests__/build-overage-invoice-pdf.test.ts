/**
 * Unit tests for buildOverageInvoicePdf — surcharge invoice PDF generator.
 * Phase 109-01 — Task 1 (TDD)
 */
import { describe, it, expect } from 'vitest';
import { PDFParse } from 'pdf-parse';
import { buildOverageInvoicePdf } from '../build-overage-invoice-pdf';
import type { OverageInvoiceData } from '../build-overage-invoice-pdf';

// ── Helper: parse PDF text for assertion ──
async function parsePdfText(pdfBytes: Uint8Array): Promise<{ text: string; numpages: number }> {
  const parser = new PDFParse({ data: Buffer.from(pdfBytes) });
  try {
    const textResult = await parser.getText();
    return { text: textResult.text, numpages: textResult.total };
  } finally {
    await parser.destroy();
  }
}

// ── Minimal valid input data ──
function makeMinimalData(overrides: Partial<OverageInvoiceData> = {}): OverageInvoiceData {
  return {
    tenantName: 'Soralia Village',
    tenantLegalName: 'Soralia Village HOA',
    billingMonth: '2026-05',
    quota: 100000,
    tokensUsed: 125000,
    overageTokens: 25000,
    overageCostZAR: '9.50',
    costPerThousandTokens: 0.38,
    invoiceNumber: 'INV-AI-2026-05-a1b2c3d4',
    invoiceDate: '2026-06-01',
    ...overrides,
  };
}

describe('buildOverageInvoicePdf', () => {
  // ── Test 1: Returns non-empty Uint8Array for valid input ──
  it('returns non-empty Uint8Array for valid input', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildOverageInvoicePdf(data);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
  });

  // ── Test 2: Generated PDF text contains the tenant name ──
  it('PDF contains the tenant name', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildOverageInvoicePdf(data);
    const { text } = await parsePdfText(pdfBytes);

    expect(text).toContain('Soralia Village');
  });

  // ── Test 3: Generated PDF text contains the billing month ──
  it('PDF contains the billing month string', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildOverageInvoicePdf(data);
    const { text } = await parsePdfText(pdfBytes);

    expect(text).toContain('2026-05');
  });

  // ── Test 4: Generated PDF text contains the overage cost (ZAR amount) ──
  it('PDF contains the overage cost in ZAR', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildOverageInvoicePdf(data);
    const { text } = await parsePdfText(pdfBytes);

    // Should contain the overage cost amount
    expect(text).toContain('9.50');
  });

  // ── Test 5: Invoice number appears in the generated PDF ──
  it('PDF contains the invoice number', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildOverageInvoicePdf(data);
    const { text } = await parsePdfText(pdfBytes);

    expect(text).toContain('INV-AI-2026-05-a1b2c3d4');
  });

  // ── Test 6: Empty overage (0 tokens) produces a zero-cost invoice PDF ──
  it('handles zero overage (0 tokens) correctly', async () => {
    const data = makeMinimalData({
      overageTokens: 0,
      overageCostZAR: '0',
    });
    const pdfBytes = await buildOverageInvoicePdf(data);
    const { text } = await parsePdfText(pdfBytes);

    expect(text).toContain('0');
    // Should still contain the invoice structure
    expect(text).toContain('INVOICE');
  });

  // ── Test 7: Large overage values render correctly without truncation ──
  it('renders large overage values without truncation', async () => {
    const data = makeMinimalData({
      quota: 1000000,
      tokensUsed: 5000000,
      overageTokens: 4000000,
      overageCostZAR: '1520.00',
    });
    const pdfBytes = await buildOverageInvoicePdf(data);
    const { text } = await parsePdfText(pdfBytes);

    // Large numbers should appear in full (with thousand separators)
    expect(text).toContain('4 000 000');
    // Cost should appear
    expect(text).toContain('1520.00');
  });
});
