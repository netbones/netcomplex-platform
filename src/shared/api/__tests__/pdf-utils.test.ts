/**
 * Unit tests for shared pdf-utils.
 * Phase 109-01 — Task 0
 */
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  createPdfContext,
  fmtDate,
  fmtDateOnly,
  drawLine,
  checkPageBreak,
  drawSectionHeader,
  MIN_Y,
  TOP_Y,
  LINE_HEIGHT,
  A4_WIDTH,
  A4_HEIGHT,
} from '../pdf-utils';

describe('pdf-utils', () => {
  // ── Test 1: createPdfContext returns ctx with page, font, bold, y=TOP_Y ──
  it('createPdfContext returns context with page, fonts, and correct y', async () => {
    const pdfDoc = await PDFDocument.create();
    const ctx = await createPdfContext(pdfDoc);

    expect(ctx.page).toBeDefined();
    expect(ctx.font).toBeDefined();
    expect(ctx.bold).toBeDefined();
    expect(ctx.y).toBe(TOP_Y);
    expect(ctx.page.getSize().width).toBe(A4_WIDTH);
    expect(ctx.page.getSize().height).toBe(A4_HEIGHT);
  });

  // ── Test 2: fmtDate formats Date and string inputs correctly ──
  it('fmtDate formats Date and ISO string inputs', () => {
    const d = new Date('2026-06-15T10:30:00Z');
    const result = fmtDate(d);
    // ISO datetime without 'T' separator, truncated to 19 chars (YYYY-MM-DD HH:mm:ss)
    expect(result).toBe('2026-06-15 10:30:00');

    const strResult = fmtDate('2026-01-01T00:00:00.000Z');
    expect(strResult).toBe('2026-01-01 00:00:00');

    // falsy value returns 'N/A'
    expect(fmtDate('')).toBe('N/A');
    expect(fmtDate(null as unknown as Date)).toBe('N/A');
  });

  // ── Test 3: fmtDateOnly returns YYYY-MM-DD substring ──
  it('fmtDateOnly returns YYYY-MM-DD substring', () => {
    expect(fmtDateOnly(new Date('2026-06-15T10:30:00Z'))).toBe('2026-06-15');
    expect(fmtDateOnly('2026-12-25T00:00:00.000Z')).toBe('2026-12-25');
    expect(fmtDateOnly('')).toBe('N/A');
  });

  // ── Test 4: drawLine renders text on page at correct position ──
  it('drawLine renders text on page at starting y', async () => {
    const pdfDoc = await PDFDocument.create();
    const ctx = await createPdfContext(pdfDoc);
    const startY = ctx.y;

    drawLine(ctx, 'Hello World');

    // y should have decreased by LINE_HEIGHT
    expect(ctx.y).toBe(startY - LINE_HEIGHT);
  });

  // ── Test 5: checkPageBreak creates a new page when y would go below MIN_Y ──
  it('checkPageBreak creates a new page when y is too low', async () => {
    const pdfDoc = await PDFDocument.create();
    const ctx = await createPdfContext(pdfDoc);
    const originalPage = ctx.page;
    const pageCount = pdfDoc.getPageCount();

    // Force y close to MIN_Y
    ctx.y = MIN_Y + LINE_HEIGHT;
    checkPageBreak(pdfDoc, ctx, LINE_HEIGHT * 3);

    // Should have created a new page
    expect(pdfDoc.getPageCount()).toBe(pageCount + 1);
    expect(ctx.page).not.toBe(originalPage);
    expect(ctx.y).toBe(TOP_Y);
  });

  it('checkPageBreak does nothing when y is high enough', async () => {
    const pdfDoc = await PDFDocument.create();
    const ctx = await createPdfContext(pdfDoc);
    const pageCount = pdfDoc.getPageCount();

    // y is at TOP_Y (high) — no break needed
    checkPageBreak(pdfDoc, ctx);
    expect(pdfDoc.getPageCount()).toBe(pageCount);
    expect(ctx.y).toBe(TOP_Y);
  });

  // ── Test 6: drawSectionHeader draws bold text + underline line ──
  it('drawSectionHeader draws bold text and decreases y', async () => {
    const pdfDoc = await PDFDocument.create();
    const ctx = await createPdfContext(pdfDoc);
    const startY = ctx.y;

    drawSectionHeader(ctx, 'SECTION A');

    // y should have decreased: LINE_HEIGHT + LINE_HEIGHT*0.8 + LINE_HEIGHT
    const expectedDecrease = LINE_HEIGHT + LINE_HEIGHT * 0.8 + LINE_HEIGHT;
    expect(ctx.y).toBe(startY - expectedDecrease);
  });
});
