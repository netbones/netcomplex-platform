/**
 * build-csos-pdf.ts — CSOS Export PDF Builder
 * Phase 108-01 — Task 1
 *
 * RED PHASE STUB: Minimal exports so tests can import and fail on assertions.
 */

/** Data structure for building the CSOS export PDF. */
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

/**
 * Build a CSOS Export PDF from structured data.
 * STUB — returns empty Uint8Array. Tests should fail.
 */
export async function buildCsosExportPdf(_data: CsosExportData): Promise<Uint8Array> {
  return new Uint8Array(0);
}
