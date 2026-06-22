import { z } from 'zod';

export const PROVIDER_REGISTRATION_MODES = ['OPEN', 'INVITATION_ONLY'] as const;
export type ProviderRegistrationMode = (typeof PROVIDER_REGISTRATION_MODES)[number];

export const DEFAULT_PROVIDER_REGISTRATION_MODE: ProviderRegistrationMode = 'INVITATION_ONLY';

export const PROVIDER_LEGAL_AGREEMENT_TYPES = ['TOS', 'PRIVACY', 'CODE_OF_CONDUCT'] as const;
export type ProviderLegalAgreementType = (typeof PROVIDER_LEGAL_AGREEMENT_TYPES)[number];

export type ProviderLegalAgreementKey = 'tos' | 'privacy' | 'codeOfConduct';

export interface ProviderLegalDocument {
  key: ProviderLegalAgreementKey;
  agreementType: ProviderLegalAgreementType;
  label: string;
  version: string;
  summary: string;
  body: string;
}

export const PROVIDER_LEGAL_DOCUMENTS: ProviderLegalDocument[] = [
  {
    key: 'tos',
    agreementType: 'TOS',
    label: 'Terms of Service',
    version: '2026-06',
    summary:
      'Providers must deliver services lawfully, communicate honestly, and honour quoted commitments.',
    body: 'You agree to provide accurate business information, keep service promises, respond professionally to residents, and comply with all tenant, municipal, and platform rules while using the provider platform.',
  },
  {
    key: 'privacy',
    agreementType: 'PRIVACY',
    label: 'Privacy Policy',
    version: '2026-06',
    summary:
      'Resident contact data may only be used to fulfil service requests and required follow-up.',
    body: 'You agree to use resident and community data only for legitimate service delivery, to protect confidential information, and to avoid selling, sharing, or reusing platform data for unrelated marketing.',
  },
  {
    key: 'codeOfConduct',
    agreementType: 'CODE_OF_CONDUCT',
    label: 'Code of Conduct',
    version: '2026-06',
    summary:
      'Providers must act respectfully, safely, and in a way that preserves community trust.',
    body: 'You agree to behave professionally on site, respect residents and staff, follow safety requirements, and avoid abusive, discriminatory, deceptive, or disruptive conduct in any provider interaction.',
  },
];

export const providerRegistrationModeSchema = z.enum(PROVIDER_REGISTRATION_MODES);

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess(value => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(maxLength).optional());

export const providerLegalAcceptanceSchema = z.object({
  tos: z.boolean().refine(value => value, 'Terms of Service must be accepted'),
  privacy: z.boolean().refine(value => value, 'Privacy Policy must be accepted'),
  codeOfConduct: z.boolean().refine(value => value, 'Code of Conduct must be accepted'),
});

export type ProviderLegalAcceptanceInput = z.infer<typeof providerLegalAcceptanceSchema>;

export const providerRegistrationSchema = z.object({
  companyName: z.string().trim().min(3, 'Company name must be at least 3 characters').max(120),
  contactName: z.string().trim().min(2, 'Contact name is required').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  phone: optionalTrimmedString(40),
  trade: optionalTrimmedString(80),
  website: z.preprocess(value => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().url('Enter a valid website URL').max(240).optional()),
  legalAgreements: providerLegalAcceptanceSchema,
});

export type ProviderRegistrationInput = z.infer<typeof providerRegistrationSchema>;

export const providerRegistrationValidationSchema = providerRegistrationSchema.pick({
  companyName: true,
  email: true,
});

export const providerReviewApprovalSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be under 1000 characters')
    .optional()
    .transform(value => value ?? ''),
});

export const providerReviewRejectionSchema = z.object({
  reason: z.string().trim().min(3, 'A rejection reason is required').max(1000),
});

export function normalizeProviderRegistrationMode(
  value: string | null | undefined
): ProviderRegistrationMode {
  if (value === 'OPEN' || value === 'INVITATION_ONLY') {
    return value;
  }

  return DEFAULT_PROVIDER_REGISTRATION_MODE;
}

export function getAcceptedLegalDocuments(
  legalAgreements: ProviderLegalAcceptanceInput
): ProviderLegalDocument[] {
  return PROVIDER_LEGAL_DOCUMENTS.filter(document => legalAgreements[document.key]);
}

export type DueDiligenceWorkflowStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DueDiligenceChecklistItem {
  key: 'IDENTITY' | 'SERVICE' | 'BACKGROUND';
  label: string;
  description: string;
  status: DueDiligenceWorkflowStatus;
}

export function buildDueDiligenceChecklist(
  status: DueDiligenceWorkflowStatus = 'PENDING'
): DueDiligenceChecklistItem[] {
  return [
    {
      key: 'IDENTITY',
      label: 'Identity verification',
      description: 'Confirm the provider contact and business identity for tenant records.',
      status,
    },
    {
      key: 'SERVICE',
      label: 'Service verification',
      description: 'Review trade fit, references, portfolio, or proof of service capability.',
      status,
    },
    {
      key: 'BACKGROUND',
      label: 'Background check',
      description: 'Confirm registration, compliance, and any risk signals before activation.',
      status,
    },
  ];
}

export function createDueDiligenceRegistrationNote(website?: string): string {
  const parts = [
    'Awaiting due diligence review.',
    'Required checks: identity verification, service verification, background check.',
  ];

  if (website) {
    parts.push(`Submitted website: ${website}.`);
  }

  return parts.join(' ');
}
