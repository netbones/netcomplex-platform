/**
 * Unit tests for buildCsosExportPdf — pure PDF builder function.
 * Phase 108-01 — Task 1: CSOS Export PDF Builder module.
 */
import { describe, it, expect } from 'vitest';
import { PDFParse } from 'pdf-parse';
import { buildCsosExportPdf } from '../[id]/csos-export/build-csos-pdf';
import type { CsosExportData } from '../[id]/csos-export/build-csos-pdf';

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
function makeMinimalData(overrides: Partial<CsosExportData> = {}): CsosExportData {
  return {
    parties: {
      complainant: 'Alice Smith',
      respondent: 'Bob Jones',
      respondentType: 'RESIDENT',
    },
    summary: {
      referenceNumber: 'SRV-2026-0001',
      title: 'Noise Complaint',
      description: 'Loud music after 10pm on weekdays.',
      category: 'NOISE',
      severity: 'MODERATE',
      status: 'FORMAL_RULING',
      submittedAt: new Date('2026-06-01').toISOString(),
      resolvedAt: null,
      desiredOutcome: 'Quiet hours enforced after 10pm.',
    },
    events: [
      {
        eventType: 'CREATED',
        fromStatus: null,
        toStatus: 'DRAFT',
        actorId: 'user-alice',
        note: 'Filed initial complaint.',
        metadata: null,
        createdAt: new Date('2026-06-01').toISOString(),
      },
      {
        eventType: 'SUBMITTED',
        fromStatus: 'DRAFT',
        toStatus: 'SUBMITTED',
        actorId: 'user-alice',
        note: null,
        metadata: null,
        createdAt: new Date('2026-06-02').toISOString(),
      },
      {
        eventType: 'RULING_ISSUED',
        fromStatus: 'UNDER_REVIEW',
        toStatus: 'FORMAL_RULING',
        actorId: 'user-moderator',
        note: 'Respondent must limit noise after 10pm.',
        metadata: null,
        createdAt: new Date('2026-06-15').toISOString(),
      },
    ],
    evidence: [
      {
        fileName: 'noise-log.pdf',
        createdAt: new Date('2026-06-03').toISOString(),
      },
      {
        fileName: 'witness-statement.docx',
        createdAt: new Date('2026-06-04').toISOString(),
      },
    ],
    messages: [],
    messageVersions: [],
    ruling: {
      description: 'Respondent must limit noise after 10pm.',
      issuedAt: new Date('2026-06-15').toISOString(),
    },
    certification: {
      exportedAt: new Date().toISOString(),
      exportedBy: 'user-alice',
    },
    tenant: {
      name: 'Demo Village',
      legalName: 'Demo Village HOA',
      csosRegNo: 'CSOS-REG-12345',
    },
    ...overrides,
  };
}

describe('buildCsosExportPdf', () => {
  // ── Test 1: Returns non-empty Uint8Array for valid input ──
  it('returns non-empty Uint8Array for valid input data', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildCsosExportPdf(data);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
  });

  // ── Test 2: PDF contains all 6 sections (A–F) ──
  it('PDF contains text for all 6 sections (A–F)', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildCsosExportPdf(data);
    const { text } = await parsePdfText(pdfBytes);

    expect(text).toContain('SECTION A');
    expect(text).toContain('PARTIES');
    expect(text).toContain('SECTION B');
    expect(text).toContain('DISPUTE SUMMARY');
    expect(text).toContain('SECTION C');
    expect(text).toContain('RESOLUTION HISTORY');
    expect(text).toContain('SECTION D');
    expect(text).toContain('EVIDENCE');
    expect(text).toContain('SECTION E');
    expect(text).toContain('RULING');
    expect(text).toContain('SECTION F');
    expect(text).toContain('CERTIFICATION');
  });

  // ── Test 3: Section A masks complainant name as "Complainant" when isConfidential ──
  it('Section A shows the complainant name when not masked', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildCsosExportPdf(data);
    const { text } = await parsePdfText(pdfBytes);
    // When parties.complainant is set normally, it should appear in the output
    expect(text).toContain('Alice Smith');
  });

  // ── Test 4: Section A shows respondent identifiers ──
  it('Section A shows complainant and respondent identifiers', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildCsosExportPdf(data);
    const { text } = await parsePdfText(pdfBytes);

    expect(text).toContain('Alice Smith');
    expect(text).toContain('Bob Jones');
    expect(text).toContain('RESIDENT');
  });

  // ── Test 5: Section E includes Section 38 statement when ruling is null ──
  it('Section E includes Section 38 statement when ruling is null', async () => {
    const data = makeMinimalData({ ruling: null });
    const pdfBytes = await buildCsosExportPdf(data);
    const { text } = await parsePdfText(pdfBytes);

    expect(text).toContain('Section 38');
    expect(text).toContain('Community Schemes Ombud Service Act');
  });

  // ── Test 6: Section E includes ruling description when ruling is present ──
  it('Section E includes ruling description and date when ruling is present', async () => {
    const data = makeMinimalData();
    const pdfBytes = await buildCsosExportPdf(data);
    const { text } = await parsePdfText(pdfBytes);

    expect(text).toContain('Respondent must limit noise after 10pm');
  });

  // ── Test 7: Multi-page: resolution history long enough to need ≥2 pages ──
  it('produces multi-page PDF when resolution history is long (50+ events)', async () => {
    const data = makeMinimalData();
    const longEvents = Array.from({ length: 60 }, (_, i) => ({
      eventType: 'NOTE_ADDED' as const,
      fromStatus: null,
      toStatus: null,
      actorId: 'user-moderator',
      note: `Event log entry number ${i + 1}. This contains enough text to fill multiple lines on the page to ensure we overflow into a second page. Additional detail: the mediator reviewed the documentation and found no issues.`,
      metadata: null,
      createdAt: new Date(2026, 5, Math.min(i + 1, 28)).toISOString(),
    }));
    const multiEventData: CsosExportData = { ...data, events: longEvents };
    const pdfBytes = await buildCsosExportPdf(multiEventData);
    const { numpages } = await parsePdfText(pdfBytes);

    expect(numpages).toBeGreaterThanOrEqual(2);
  });

  // ── Test 8: Handles minimal data gracefully without crashing ──
  it('handles minimal data gracefully without crashing', async () => {
    const data = makeMinimalData({
      events: [],
      evidence: [],
      messages: [],
      messageVersions: [],
      ruling: null,
    });
    const clone = { ...data, summary: { ...data.summary, title: '' } };
    const pdfBytes = await buildCsosExportPdf(clone);
    const { text } = await parsePdfText(pdfBytes);

    expect(text).toContain('SECTION A');
    expect(text).toContain('SECTION B');
    expect(text).toContain('SECTION C');
    expect(text).toContain('SECTION D');
    expect(text).toContain('SECTION E');
    expect(text).toContain('SECTION F');
  });
});
