import 'server-only';

import { and, eq, sql } from 'drizzle-orm';

import {
  db,
  notDeleted,
  now,
  providerLegalAgreements,
  providerVerifications,
  providerDueDiligenceWorkflows,
  providerDueDiligenceItems,
  serviceProviders,
} from '@api/server';
import {
  buildDueDiligenceChecklist,
  getAcceptedLegalDocuments,
  type DueDiligenceWorkflowStatus,
  type ProviderLegalAcceptanceInput,
} from '@shared/lib/providers';
import type { ProviderVerificationStatus } from './provider-platform';
import { createId } from '@shared/lib/id';

export function getRequestMetadata(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip');

  return {
    ipAddress: ipAddress || null,
    userAgent: request.headers.get('user-agent'),
  };
}

export async function findProviderDuplicateByCompanyName(tenantId: string, companyName: string) {
  const normalizedName = companyName.trim();
  const [existing] = await db
    .select({ id: serviceProviders.id, companyName: serviceProviders.companyName })
    .from(serviceProviders)
    .where(
      and(
        eq(serviceProviders.tenantId, tenantId),
        notDeleted(serviceProviders),
        sql`lower(${serviceProviders.companyName}) = lower(${normalizedName})`
      )
    )
    .limit(1);

  return existing ?? null;
}

export async function getProviderLegalAgreementStatus(tenantId: string, providerId: string | null) {
  if (!providerId) {
    return {
      acceptedAgreementCount: 0,
      allAccepted: false,
      documents: getAcceptedLegalDocuments({
        tos: true,
        privacy: true,
        codeOfConduct: true,
      }).map(document => ({
        ...document,
        accepted: false,
        acceptedAt: null,
      })),
    };
  }

  const rows = await db
    .select({
      agreementType: providerLegalAgreements.agreementType,
      version: providerLegalAgreements.version,
      acceptedAt: providerLegalAgreements.acceptedAt,
    })
    .from(providerLegalAgreements)
    .where(
      and(
        eq(providerLegalAgreements.tenantId, tenantId),
        eq(providerLegalAgreements.providerId, providerId)
      )
    );

  const documents = getAcceptedLegalDocuments({
    tos: true,
    privacy: true,
    codeOfConduct: true,
  }).map(document => {
    const acceptedRow = rows.find(
      row => row.agreementType === document.agreementType && row.version === document.version
    );

    return {
      ...document,
      accepted: Boolean(acceptedRow),
      acceptedAt: acceptedRow?.acceptedAt?.toISOString() ?? null,
    };
  });

  const acceptedAgreementCount = documents.filter(document => document.accepted).length;

  return {
    acceptedAgreementCount,
    allAccepted: acceptedAgreementCount === documents.length,
    documents,
  };
}

export async function recordProviderLegalAgreements(params: {
  tenantId: string;
  providerId: string;
  legalAgreements: ProviderLegalAcceptanceInput;
  request: Request;
}) {
  const acceptedDocuments = getAcceptedLegalDocuments(params.legalAgreements);
  const metadata = getRequestMetadata(params.request);
  const timestamp = now();

  const existingRows = await db
    .select({
      agreementType: providerLegalAgreements.agreementType,
      version: providerLegalAgreements.version,
    })
    .from(providerLegalAgreements)
    .where(
      and(
        eq(providerLegalAgreements.tenantId, params.tenantId),
        eq(providerLegalAgreements.providerId, params.providerId)
      )
    );

  const existingKeys = new Set(existingRows.map(row => `${row.agreementType}:${row.version}`));

  const newRows = acceptedDocuments
    .filter(document => !existingKeys.has(`${document.agreementType}:${document.version}`))
    .map(document => ({
      id: createId(),
      providerId: params.providerId,
      tenantId: params.tenantId,
      agreementType: document.agreementType,
      version: document.version,
      acceptedAt: timestamp,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      createdAt: timestamp,
    }));

  if (newRows.length > 0) {
    await db.insert(providerLegalAgreements).values(newRows);
  }

  return getProviderLegalAgreementStatus(params.tenantId, params.providerId);
}

export function getDueDiligenceWorkflowStatus(
  verificationStatus: ProviderVerificationStatus | null | undefined
): DueDiligenceWorkflowStatus {
  if (verificationStatus === 'VERIFIED') {
    return 'APPROVED';
  }

  if (verificationStatus === 'SUSPENDED') {
    return 'REJECTED';
  }

  return 'PENDING';
}

export async function getProviderDueDiligenceSnapshot(
  tenantId: string,
  providerId: string | null,
  verificationStatus?: ProviderVerificationStatus | null
) {
  let resolvedStatus = verificationStatus ?? null;
  let persistedItems: Array<{ key: string; status: string; notes?: string }> = [];

  // Try new workflow table first
  if (providerId) {
    const [workflow] = await db
      .select({
        id: providerDueDiligenceWorkflows.id,
        status: providerDueDiligenceWorkflows.status,
        assignedTo: providerDueDiligenceWorkflows.assignedTo,
        notes: providerDueDiligenceWorkflows.notes,
        submittedAt: providerDueDiligenceWorkflows.submittedAt,
        startedAt: providerDueDiligenceWorkflows.startedAt,
        completedAt: providerDueDiligenceWorkflows.completedAt,
      })
      .from(providerDueDiligenceWorkflows)
      .where(
        and(
          eq(providerDueDiligenceWorkflows.tenantId, tenantId),
          eq(providerDueDiligenceWorkflows.providerId, providerId)
        )
      )
      .limit(1);

    if (workflow) {
      const items = await db
        .select({
          itemKey: providerDueDiligenceItems.itemKey,
          status: providerDueDiligenceItems.status,
          notes: providerDueDiligenceItems.notes,
          reviewedBy: providerDueDiligenceItems.reviewedBy,
          reviewedAt: providerDueDiligenceItems.reviewedAt,
        })
        .from(providerDueDiligenceItems)
        .where(eq(providerDueDiligenceItems.workflowId, workflow.id));

      const workflowStatus = workflow.status;
      const checklist = buildDueDiligenceChecklist(
        workflowStatus === 'APPROVED'
          ? 'APPROVED'
          : workflowStatus === 'REJECTED'
            ? 'REJECTED'
            : 'PENDING'
      );

      return {
        workflowStatus: workflow.status,
        assignedTo: workflow.assignedTo,
        workflowNotes: workflow.notes,
        submittedAt: workflow.submittedAt?.toISOString() ?? null,
        startedAt: workflow.startedAt?.toISOString() ?? null,
        completedAt: workflow.completedAt?.toISOString() ?? null,
        items: checklist.map(item => {
          const persisted = items.find(p => p.itemKey === item.key);
          if (persisted) {
            return {
              ...item,
              status: persisted.status,
              notes: persisted.notes ?? undefined,
              reviewedBy: persisted.reviewedBy,
              reviewedAt: persisted.reviewedAt?.toISOString() ?? null,
            };
          }
          return item;
        }),
      };
    }
  }

  // Fallback to old JSON field
  if (!resolvedStatus && providerId) {
    const [verification] = await db
      .select({
        status: providerVerifications.status,
        dueDiligenceItems: providerVerifications.dueDiligenceItems,
      })
      .from(providerVerifications)
      .where(
        and(
          eq(providerVerifications.tenantId, tenantId),
          eq(providerVerifications.providerId, providerId)
        )
      )
      .limit(1);

    resolvedStatus =
      (verification?.status as ProviderVerificationStatus | undefined) ?? 'PROBATION';
    persistedItems =
      (verification?.dueDiligenceItems as Array<{ key: string; status: string; notes?: string }>) ??
      [];
  }

  const workflowStatus = getDueDiligenceWorkflowStatus(resolvedStatus ?? 'PROBATION');
  const checklist = buildDueDiligenceChecklist(workflowStatus);

  const items = checklist.map(item => {
    const persisted = persistedItems.find(p => p.key === item.key);
    if (persisted) {
      return { ...item, status: persisted.status, notes: persisted.notes };
    }
    return item;
  });

  return {
    workflowStatus,
    assignedTo: null,
    workflowNotes: null,
    submittedAt: null,
    startedAt: null,
    completedAt: null,
    items,
  };
}
