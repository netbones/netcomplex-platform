/**
 * build-csos-pdf.ts — CSOS Export PDF Builder
 * Phase 108-01 — Task 1
 *
 * Pure function: data → Uint8Array PDF bytes.
 * All 6 sections (A–F) per ADVISORY-017 §13.
 */
import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';

// ── Constants ──
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN;
const BODY_SIZE = 11;
const HEADER_SIZE = 13;
const TITLE_SIZE = 16;
const LINE_HEIGHT = 16;
const MIN_Y = 60;
const TOP_Y = A4_HEIGHT - MARGIN;

const SECTION_38_STATEMENT =
  'Internal resolution was attempted and has not produced a satisfactory outcome. The complainant is therefore exercising their right to apply to the Community Schemes Ombud Service under Section 38 of the Community Schemes Ombud Service Act, No. 9 of 2011.';

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
    actorId: string;
    note: string | null;
    metadata: Record<string, unknown> | null;
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

// ── Helpers ──
function fmtDate(d: Date | string): string {
  if (!d) return 'N/A';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function fmtDateOnly(d: Date | string): string {
  if (!d) return 'N/A';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().substring(0, 10);
}

// ── PDF Builder ──
export async function buildCsosExportPdf(data: CsosExportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  pdfDoc.setTitle(`CSOS Export — ${data.summary.referenceNumber}`);
  pdfDoc.setAuthor('NetComplex Dispute Resolution System');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setProducer('NetComplex Platform');

  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = TOP_Y;

  // ── Stateful helpers (capture y via closure) ──
  function newPage(): void {
    page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    y = TOP_Y;
  }

  function checkPageBreak(neededHeight: number = LINE_HEIGHT * 3): void {
    if (y - neededHeight < MIN_Y) {
      newPage();
    }
  }

  function drawSectionHeader(title: string): void {
    checkPageBreak(LINE_HEIGHT * 4);
    y -= LINE_HEIGHT;
    page.drawText(title, {
      x: MARGIN,
      y,
      size: HEADER_SIZE,
      font: bold,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT * 0.8;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: A4_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT;
  }

  function drawLine(
    text: string,
    opts?: { indent?: number; font?: typeof font | typeof bold }
  ): void {
    checkPageBreak();
    page.drawText(text, {
      x: MARGIN + (opts?.indent ?? 0),
      y,
      size: BODY_SIZE,
      font: opts?.font ?? font,
      color: rgb(0, 0, 0),
    });
    y -= LINE_HEIGHT;
  }

  function drawWrappedText(text: string): void {
    if (!text) {
      y -= LINE_HEIGHT;
      return;
    }
    const words = text.split(' ');
    let line = '';

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, BODY_SIZE);
      if (testWidth > CONTENT_WIDTH && line) {
        checkPageBreak();
        page.drawText(line, {
          x: MARGIN,
          y,
          size: BODY_SIZE,
          font,
          color: rgb(0, 0, 0),
        });
        y -= LINE_HEIGHT;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      checkPageBreak();
      page.drawText(line, {
        x: MARGIN,
        y,
        size: BODY_SIZE,
        font,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT;
    }
  }

  // ── Header Block ──
  page.drawText('COMMUNITY SCHEME DISPUTE RECORD', {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= LINE_HEIGHT * 2;

  drawLine(`Reference: ${data.summary.referenceNumber}`);
  drawLine(
    `Community: ${data.tenant.name}${data.tenant.legalName ? ` (${data.tenant.legalName})` : ''}`
  );
  drawLine(`Scheme Registration: ${data.tenant.csosRegNo || 'Not registered'}`);
  y -= LINE_HEIGHT * 0.5;

  // ── Section A: Parties ──
  drawSectionHeader('SECTION A — PARTIES');
  drawLine(`Complainant: ${data.parties.complainant}`);
  drawLine(`Respondent: ${data.parties.respondent}`);
  if (data.parties.respondentType) {
    drawLine(`Respondent Type: ${data.parties.respondentType}`);
  }
  y -= LINE_HEIGHT * 0.5;

  // ── Section B: Dispute Summary ──
  drawSectionHeader('SECTION B — DISPUTE SUMMARY');
  drawLine(`Reference Number: ${data.summary.referenceNumber}`);
  drawLine(`Category: ${data.summary.category}`);
  drawLine(`Severity: ${data.summary.severity}`);
  drawLine(`Status: ${data.summary.status}`);
  drawLine(`Filed: ${fmtDateOnly(data.summary.submittedAt ?? 'N/A')}`);
  if (data.summary.resolvedAt) {
    drawLine(`Resolved: ${fmtDateOnly(data.summary.resolvedAt)}`);
  }
  y -= LINE_HEIGHT * 0.3;
  drawLine(`Title: ${data.summary.title}`, { font: bold });
  drawLine('Description:');
  drawWrappedText(data.summary.description);
  if (data.summary.desiredOutcome) {
    y -= LINE_HEIGHT * 0.3;
    drawLine('Desired Outcome:');
    drawWrappedText(data.summary.desiredOutcome);
  }
  y -= LINE_HEIGHT * 0.5;

  // ── Section C: Resolution History ──
  drawSectionHeader('SECTION C — RESOLUTION HISTORY');

  if (data.events.length === 0 && data.messages.length === 0) {
    drawLine('No resolution history on record.');
  } else {
    // Draw events
    for (const evt of data.events) {
      checkPageBreak(LINE_HEIGHT * 4);
      const parts: string[] = [];
      parts.push(`[${fmtDate(evt.createdAt)}] ${evt.eventType}`);
      if (evt.fromStatus || evt.toStatus) {
        parts.push(`(${evt.fromStatus || 'N/A'} -> ${evt.toStatus || 'N/A'})`);
      }
      parts.push(`by ${evt.actorId}`);
      drawLine(parts.join(' '));
      if (evt.note) {
        drawWrappedText(evt.note);
      }
      y -= LINE_HEIGHT * 0.2;
    }

    // Draw messages (mediation thread)
    if (data.messages.length > 0) {
      y -= LINE_HEIGHT;
      drawLine('Mediation Thread Messages:', { font: bold });
      y -= LINE_HEIGHT * 0.3;

      // Build version lookup
      const versionMap = new Map<string, typeof data.messageVersions>();
      for (const v of data.messageVersions) {
        const existing = versionMap.get(v.messageId) || [];
        existing.push(v);
        versionMap.set(v.messageId, existing);
      }

      for (const msg of data.messages) {
        checkPageBreak(LINE_HEIGHT * 4);
        drawLine(`Message from ${msg.senderId} at ${fmtDate(msg.createdAt)}:`, {
          font: bold,
        });
        drawWrappedText(msg.content);

        if (msg.editedAt) {
          drawLine(`[Edited at ${fmtDate(msg.editedAt)}]`);
          const versions = msg.id ? versionMap.get(msg.id) || [] : [];
          for (const v of versions) {
            drawLine(`  [Original: ${v.originalContent}]`);
          }
        }
        y -= LINE_HEIGHT * 0.3;
      }
    }
  }
  y -= LINE_HEIGHT * 0.5;

  // ── Section D: Evidence on Record ──
  drawSectionHeader('SECTION D — EVIDENCE ON RECORD');

  if (data.evidence.length === 0) {
    drawLine('No evidence on record.');
  } else {
    for (const ev of data.evidence) {
      checkPageBreak();
      drawLine(`${ev.fileName} — uploaded ${fmtDateOnly(ev.createdAt)}`);
    }
  }
  y -= LINE_HEIGHT * 0.5;

  // ── Section E: Ruling / Outcome ──
  drawSectionHeader('SECTION E — RULING / OUTCOME');

  if (data.ruling && data.ruling.description) {
    drawWrappedText(`Ruling: ${data.ruling.description}`);
    if (data.ruling.issuedAt) {
      drawLine(`Issued: ${fmtDateOnly(data.ruling.issuedAt)}`);
    }
  } else {
    drawWrappedText(SECTION_38_STATEMENT);
  }
  y -= LINE_HEIGHT * 0.5;

  // ── Section F: Certification ──
  drawSectionHeader('SECTION F — CERTIFICATION');
  drawWrappedText(
    `This record is certified as a true and accurate account of the internal dispute resolution process conducted by ${data.tenant.name}.`
  );
  y -= LINE_HEIGHT * 0.5;
  drawLine(`Generated: ${data.certification.exportedAt}`);
  drawLine(`Exported by: ${data.certification.exportedBy}`);
  drawLine(`Reference: ${data.summary.referenceNumber}`);

  return pdfDoc.save();
}
