/**
 * pdf-utils.ts — Shared PDF primitives for NetComplex PDF builders.
 * Phase 109-01 — Task 0
 *
 * Provides A4 constants, PdfContext, and stateful + pure helpers
 * that both CSOS export and overage invoice builders share.
 */
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';

// ── Constants ──
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
export const MARGIN = 50;
export const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN;
export const BODY_SIZE = 11;
export const HEADER_SIZE = 13;
export const TITLE_SIZE = 16;
export const LINE_HEIGHT = 16;
export const MIN_Y = 60;
export const TOP_Y = A4_HEIGHT - MARGIN;

// ── Context ──
export interface PdfContext {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
}

/** Factory: embed standard fonts and return a fresh PdfContext. */
export async function createPdfContext(pdfDoc: PDFDocument): Promise<PdfContext> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  return { page, font, bold, y: TOP_Y };
}

// ── Stateful helpers (mutate ctx.y / ctx.page) ──

/** Add a new page and reset y to TOP_Y. */
export function newPage(pdfDoc: PDFDocument, ctx: PdfContext): void {
  ctx.page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  ctx.y = TOP_Y;
}

/** If the remaining space is too small, start a new page. */
export function checkPageBreak(
  pdfDoc: PDFDocument,
  ctx: PdfContext,
  neededHeight: number = LINE_HEIGHT * 3
): void {
  if (ctx.y - neededHeight < MIN_Y) {
    newPage(pdfDoc, ctx);
  }
}

/** Draw a bold section header followed by an underline. */
export function drawSectionHeader(ctx: PdfContext, title: string): void {
  ctx.y -= LINE_HEIGHT;
  ctx.page.drawText(title, {
    x: MARGIN,
    y: ctx.y,
    size: HEADER_SIZE,
    font: ctx.bold,
    color: rgb(0, 0, 0),
  });
  ctx.y -= LINE_HEIGHT * 0.8;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4_WIDTH - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  ctx.y -= LINE_HEIGHT;
}

/** Draw a single line of text at the current ctx.y position. */
export function drawLine(
  ctx: PdfContext,
  text: string,
  opts?: { indent?: number; font?: PDFFont }
): void {
  ctx.page.drawText(text, {
    x: MARGIN + (opts?.indent ?? 0),
    y: ctx.y,
    size: BODY_SIZE,
    font: opts?.font ?? ctx.font,
    color: rgb(0, 0, 0),
  });
  ctx.y -= LINE_HEIGHT;
}

/** Word-wrap text within CONTENT_WIDTH, adding page breaks on overflow. */
export function drawWrappedText(pdfDoc: PDFDocument, ctx: PdfContext, text: string): void {
  if (!text) {
    ctx.y -= LINE_HEIGHT;
    return;
  }
  const words = text.split(' ');
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = ctx.font.widthOfTextAtSize(testLine, BODY_SIZE);
    if (testWidth > CONTENT_WIDTH && line) {
      checkPageBreak(pdfDoc, ctx);
      ctx.page.drawText(line, {
        x: MARGIN,
        y: ctx.y,
        size: BODY_SIZE,
        font: ctx.font,
        color: rgb(0, 0, 0),
      });
      ctx.y -= LINE_HEIGHT;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    checkPageBreak(pdfDoc, ctx);
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.y,
      size: BODY_SIZE,
      font: ctx.font,
      color: rgb(0, 0, 0),
    });
    ctx.y -= LINE_HEIGHT;
  }
}

// ── Pure helpers ──

/** Format a date (Date or ISO string) as 'YYYY-MM-DD HH:mm:ss'. */
export function fmtDate(d: Date | string): string {
  if (!d) return 'N/A';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/** Format a date (Date or ISO string) as 'YYYY-MM-DD'. */
export function fmtDateOnly(d: Date | string): string {
  if (!d) return 'N/A';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().substring(0, 10);
}
