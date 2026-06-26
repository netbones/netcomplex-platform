// Dispute API Zod validation schemas.
// Server-safe — uses zod for request body validation.
import { z } from 'zod';
import { ALL_DISPUTE_CATEGORIES, ALL_DISPUTE_STATUSES } from './constants';

// ============================================
// POST /api/disputes — create DRAFT dispute
// ============================================
export const disputeCreateSchema = z
  .object({
    category: z.enum(ALL_DISPUTE_CATEGORIES),
    title: z.string().min(5).max(200),
    description: z.string().min(10).max(5000),
    respondentId: z.string().uuid().optional(),
    respondentType: z
      .enum(['RESIDENT', 'HOA', 'BOARD_MEMBER', 'TENANT_PROVIDER'])
      .default('RESIDENT'),
    desiredOutcome: z.string().max(2000).optional(),
    severity: z.enum(['MINOR', 'MODERATE', 'SERIOUS', 'URGENT']).default('MODERATE'),
  })
  .strip();

export type DisputeCreateInput = z.infer<typeof disputeCreateSchema>;

// ============================================
// PATCH /api/disputes/[id] — update dispute
// ============================================
export const disputeUpdateSchema = z
  .object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(10).max(5000).optional(),
    category: z.enum(ALL_DISPUTE_CATEGORIES).optional(),
    desiredOutcome: z.string().max(2000).optional(),
    severity: z.enum(['MINOR', 'MODERATE', 'SERIOUS', 'URGENT']).optional(),
    status: z.enum(ALL_DISPUTE_STATUSES).optional(),
  })
  .strip();

export type DisputeUpdateInput = z.infer<typeof disputeUpdateSchema>;

// ============================================
// POST /api/disputes/[id]/submit — submit with cooling-off
// ============================================
export const disputeSubmitSchema = z.object({}).strip();

export type DisputeSubmitInput = z.infer<typeof disputeSubmitSchema>;

// ============================================
// POST /api/disputes/[id]/messages — create message
// ============================================
export const disputeMessageCreateSchema = z
  .object({
    content: z.string().min(1).max(5000),
    isInternal: z.boolean().default(false),
  })
  .strip();

export type DisputeMessageCreateInput = z.infer<typeof disputeMessageCreateSchema>;

// ============================================
// POST /api/disputes/[id]/evidence — evidence constants
// ============================================
export const MAX_EVIDENCE_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const;

export const disputeEvidenceSchema = {
  MAX_EVIDENCE_FILE_SIZE,
  ALLOWED_EVIDENCE_TYPES,
};

// ============================================
// POST /api/disputes/[id]/assign — assign moderator
// ============================================
export const disputeAssignSchema = z
  .object({
    moderatorId: z.string().uuid(),
  })
  .strip();

export type DisputeAssignInput = z.infer<typeof disputeAssignSchema>;

// ============================================
// POST /api/disputes/[id]/ruling — issue formal ruling
// ============================================
export const disputeRulingSchema = z
  .object({
    rulingDescription: z.string().min(10).max(5000),
  })
  .strip();

export type DisputeRulingInput = z.infer<typeof disputeRulingSchema>;

// ============================================
// POST /api/disputes/intake-screen — AI frivolity check
// ============================================
export const intakeScreenRequestSchema = z
  .object({
    description: z.string().min(10).max(5000),
    disputeId: z.string().uuid().optional(),
  })
  .strip();

export type IntakeScreenRequest = z.infer<typeof intakeScreenRequestSchema>;

export const intakeScreenOutputSchema = z.object({
  toneScore: z.number().int().min(0).max(10).default(0),
  issueClarity: z.number().int().min(0).max(10).default(5),
  likelyFrivolous: z.boolean().default(false),
  suggestedCategory: z.string().default('OTHER'),
  deEscalationTip: z.string().nullable().default(null),
});

export type IntakeScreenOutput = z.infer<typeof intakeScreenOutputSchema>;
