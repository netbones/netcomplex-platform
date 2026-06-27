/**
 * build-csos-pdf.ts — CSOS Export PDF Builder
 * Phase 108-01 — Task 1, refactored in Phase 109-01 — Task 0
 *
 * Pure function: data → Uint8Array PDF bytes.
 * All 6 sections (A–F) per ADVISORY-017 §13.
 *
 * Now consumes shared PDF utilities from @shared/api/pdf-utils.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import {
  MARGIN,
  TITLE_SIZE,
  LINE_HEIGHT,
  createPdfContext,
  drawSectionHeader,
  drawLine,
  drawWrappedText,
  fmtDate,
  fmtDateOnly,
  checkPageBreak,
} from '@/shared/api/pdf-utils';

// ── Data interface ──
export interface CsosExportData {
  parties: {
    complainant: string;
    respondent: string;
    respondentType: string | null;
  };
  summary: {
    referenceNumber: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    submittedAt: Date | string | null;
    resolvedAt: Date | string | null;
    desiredOutcome?: string | null;
  };
  events: Array<{
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    actorId: string | null;
    note: string | null;
    metadata: unknown;
    createdAt: Date | string;
  }>;
  evidence: Array<{
    fileName: string;
    createdAt: Date | string;
  }>;
  messages: Array<{
    id?: string;
    senderId: string;
    content: string;
    createdAt: Date | string;
    editedAt: Date | string | null;
  }>;
  messageVersions: Array<{
    messageId: string;
    originalContent: string;
    editedAt: Date | string;
  }>;
  ruling: {
    description: string;
    issuedAt: Date | string | null;
  } | null;
  certification: {
    exportedAt: string;
    exportedBy: string;
  };
  tenant: {
    name: string;
    legalName?: string | null;
    csosRegNo?: string | null;
  };
}

const SECTION_38_STATEMENT =
  'Internal resolution was attempted and has not produced a satisfactory outcome. The complainant is therefore exercising their right to apply to the Community Schemes Ombud Service under Section 38 of the Community Schemes Ombud Service Act, No. 9 of 2011.';

// ── PDF Builder ──
export async function buildCsosExportPdf(data: CsosExportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  pdfDoc.setTitle(`CSOS Export — ${data.summary.referenceNumber}`);
  pdfDoc.setAuthor('NetComplex Dispute Resolution System');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setProducer('NetComplex Platform');

  const ctx = await createPdfContext(pdfDoc);

  // ── Header Block ──
  ctx.page.drawText('COMMUNITY SCHEME DISPUTE RECORD', {
    x: MARGIN,
    y: ctx.y,
    size: TITLE_SIZE,
    font: ctx.bold,
    color: rgb(0, 0, 0),
  });
  ctx.y -= LINE_HEIGHT * 2;

  drawLine(ctx, `Reference: ${data.summary.referenceNumber}`);
  drawLine(
    ctx,
    `Community: ${data.tenant.name}${data.tenant.legalName ? ` (${data.tenant.legalName})` : ''}`
  );
  drawLine(ctx, `Scheme Registration: ${data.tenant.csosRegNo || 'Not registered'}`);
  ctx.y -= LINE_HEIGHT * 0.5;

  // ── Section A: Parties ──
  drawSectionHeader(ctx, 'SECTION A — PARTIES');
  drawLine(ctx, `Complainant: ${data.parties.complainant}`);
  drawLine(ctx, `Respondent: ${data.parties.respondent}`);
  if (data.parties.respondentType) {
    drawLine(ctx, `Respondent Type: ${data.parties.respondentType}`);
  }
  ctx.y -= LINE_HEIGHT * 0.5;

  // ── Section B: Dispute Summary ──
  drawSectionHeader(ctx, 'SECTION B — DISPUTE SUMMARY');
  drawLine(ctx, `Reference Number: ${data.summary.referenceNumber}`);
  drawLine(ctx, `Category: ${data.summary.category}`);
  drawLine(ctx, `Severity: ${data.summary.severity}`);
  drawLine(ctx, `Status: ${data.summary.status}`);
  drawLine(ctx, `Filed: ${fmtDateOnly(data.summary.submittedAt ?? 'N/A')}`);
  if (data.summary.resolvedAt) {
    drawLine(ctx, `Resolved: ${fmtDateOnly(data.summary.resolvedAt)}`);
  }
  ctx.y -= LINE_HEIGHT * 0.3;
  drawLine(ctx, `Title: ${data.summary.title}`, { font: ctx.bold });
  drawLine(ctx, 'Description:');
  drawWrappedText(pdfDoc, ctx, data.summary.description);
  if (data.summary.desiredOutcome) {
    ctx.y -= LINE_HEIGHT * 0.3;
    drawLine(ctx, 'Desired Outcome:');
    drawWrappedText(pdfDoc, ctx, data.summary.desiredOutcome);
  }
  ctx.y -= LINE_HEIGHT * 0.5;

  // ── Section C: Resolution History ──
  drawSectionHeader(ctx, 'SECTION C — RESOLUTION HISTORY');

  if (data.events.length === 0 && data.messages.length === 0) {
    drawLine(ctx, 'No resolution history on record.');
  } else {
    // Draw events
    for (const evt of data.events) {
      checkPageBreak(pdfDoc, ctx, LINE_HEIGHT * 4);
      const parts: string[] = [];
      parts.push(`[${fmtDate(evt.createdAt)}] ${evt.eventType}`);
      if (evt.fromStatus || evt.toStatus) {
        parts.push(`(${evt.fromStatus || 'N/A'} -> ${evt.toStatus || 'N/A'})`);
      }
      parts.push(`by ${evt.actorId}`);
      drawLine(ctx, parts.join(' '));
      if (evt.note) {
        drawWrappedText(pdfDoc, ctx, evt.note);
      }
      ctx.y -= LINE_HEIGHT * 0.2;
    }

    // Draw messages (mediation thread)
    if (data.messages.length > 0) {
      ctx.y -= LINE_HEIGHT;
      drawLine(ctx, 'Mediation Thread Messages:', { font: ctx.bold });
      ctx.y -= LINE_HEIGHT * 0.3;

      // Build version lookup
      const versionMap = new Map<string, typeof data.messageVersions>();
      for (const v of data.messageVersions) {
        const existing = versionMap.get(v.messageId) || [];
        existing.push(v);
        versionMap.set(v.messageId, existing);
      }

      for (const msg of data.messages) {
        checkPageBreak(pdfDoc, ctx, LINE_HEIGHT * 4);
        drawLine(ctx, `Message from ${msg.senderId} at ${fmtDate(msg.createdAt)}:`, {
          font: ctx.bold,
        });
        drawWrappedText(pdfDoc, ctx, msg.content);

        if (msg.editedAt) {
          drawLine(ctx, `[Edited at ${fmtDate(msg.editedAt)}]`);
          const versions = msg.id ? versionMap.get(msg.id) || [] : [];
          for (const v of versions) {
            drawLine(ctx, `  [Original: ${v.originalContent}]`);
          }
        }
        ctx.y -= LINE_HEIGHT * 0.3;
      }
    }
  }
  ctx.y -= LINE_HEIGHT * 0.5;

  // ── Section D: Evidence on Record ──
  drawSectionHeader(ctx, 'SECTION D — EVIDENCE ON RECORD');

  if (data.evidence.length === 0) {
    drawLine(ctx, 'No evidence on record.');
  } else {
    for (const ev of data.evidence) {
      checkPageBreak(pdfDoc, ctx);
      drawLine(ctx, `${ev.fileName} — uploaded ${fmtDateOnly(ev.createdAt)}`);
    }
  }
  ctx.y -= LINE_HEIGHT * 0.5;

  // ── Section E: Ruling / Outcome ──
  drawSectionHeader(ctx, 'SECTION E — RULING / OUTCOME');

  if (data.ruling && data.ruling.description) {
    drawWrappedText(pdfDoc, ctx, `Ruling: ${data.ruling.description}`);
    if (data.ruling.issuedAt) {
      drawLine(ctx, `Issued: ${fmtDateOnly(data.ruling.issuedAt)}`);
    }
  } else {
    drawWrappedText(pdfDoc, ctx, SECTION_38_STATEMENT);
  }
  ctx.y -= LINE_HEIGHT * 0.5;

  // ── Section F: Certification ──
  drawSectionHeader(ctx, 'SECTION F — CERTIFICATION');
  drawWrappedText(
    pdfDoc,
    ctx,
    `This record is certified as a true and accurate account of the internal dispute resolution process conducted by ${data.tenant.name}.`
  );
  ctx.y -= LINE_HEIGHT * 0.5;
  drawLine(ctx, `Generated: ${data.certification.exportedAt}`);
  drawLine(ctx, `Exported by: ${data.certification.exportedBy}`);
  drawLine(ctx, `Reference: ${data.summary.referenceNumber}`);

  return pdfDoc.save();
}
