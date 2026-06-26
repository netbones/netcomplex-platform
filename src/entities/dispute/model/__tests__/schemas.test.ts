/**
 * Tests for dispute Zod validation schemas.
 * Plan 106-01 Task 1 — TDD RED phase.
 */
import { describe, it, expect } from 'vitest';
import {
  disputeCreateSchema,
  disputeUpdateSchema,
  disputeSubmitSchema,
  disputeMessageCreateSchema,
  disputeEvidenceSchema,
  disputeAssignSchema,
  disputeRulingSchema,
  intakeScreenRequestSchema,
  intakeScreenOutputSchema,
} from '../schemas';
import { ALL_DISPUTE_CATEGORIES, ALL_DISPUTE_STATUSES } from '../constants';

// ============================================
// disputeCreateSchema
// ============================================
describe('disputeCreateSchema', () => {
  const validBody = {
    category: 'NOISE',
    title: 'Loud music at night',
    description: 'The neighbor plays loud music after 10pm every night.',
  };

  it('rejects missing title (returns ZodError with path: ["title"])', () => {
    const result = disputeCreateSchema.safeParse({
      category: 'NOISE',
      description: 'Some description here',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('title');
    }
  });

  it('rejects missing description (returns ZodError with path: ["description"])', () => {
    const result = disputeCreateSchema.safeParse({
      category: 'NOISE',
      title: 'A dispute title',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('description');
    }
  });

  it('accepts valid category value "NOISE"', () => {
    const result = disputeCreateSchema.safeParse(validBody);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('NOISE');
    }
  });

  it('rejects invalid category "INVALID" (Zod enum error)', () => {
    const result = disputeCreateSchema.safeParse({
      ...validBody,
      category: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title shorter than 5 characters', () => {
    const result = disputeCreateSchema.safeParse({
      ...validBody,
      title: 'Ab',
    });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields (rejects extra properties)', () => {
    const result = disputeCreateSchema.safeParse({
      ...validBody,
      extraField: 'should be stripped',
    });
    // .strip() should remove unknown fields, so parsing should succeed
    // but the extra field should NOT be in the output
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('extraField');
    }
  });

  it('applies default severity MODERATE when omitted', () => {
    const result = disputeCreateSchema.safeParse(validBody);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severity).toBe('MODERATE');
    }
  });
});

// ============================================
// disputeUpdateSchema
// ============================================
describe('disputeUpdateSchema', () => {
  it('allows partial update (description only, title omitted)', () => {
    const result = disputeUpdateSchema.safeParse({
      description: 'Updated description of the dispute.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('Updated description of the dispute.');
      expect(result.data).not.toHaveProperty('title');
    }
  });

  it('allows full update with all optional fields', () => {
    const result = disputeUpdateSchema.safeParse({
      title: 'Updated title text',
      description: 'Updated description text here.',
      category: 'NOISE',
      desiredOutcome: 'Quiet after 10pm',
      severity: 'SERIOUS',
    });
    expect(result.success).toBe(true);
  });

  it('allows status field to be updated', () => {
    const result = disputeUpdateSchema.safeParse({
      status: 'UNDER_REVIEW',
      title: 'Status change update',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('UNDER_REVIEW');
    }
  });

  it('rejects invalid status that is not in ALL_DISPUTE_STATUSES', () => {
    const result = disputeUpdateSchema.safeParse({
      status: 'INVALID_STATUS',
    });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = disputeUpdateSchema.safeParse({
      title: 'New title',
      injectedField: 'should not appear',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('injectedField');
    }
  });
});

// ============================================
// intakeScreenRequestSchema
// ============================================
describe('intakeScreenRequestSchema', () => {
  it('rejects description shorter than 10 characters', () => {
    const result = intakeScreenRequestSchema.safeParse({
      description: 'Too short',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid description', () => {
    const result = intakeScreenRequestSchema.safeParse({
      description: 'This is a valid description that is long enough.',
    });
    expect(result.success).toBe(true);
  });

  it('allows optional disputeId', () => {
    const result = intakeScreenRequestSchema.safeParse({
      description: 'A valid description of sufficient length.',
      disputeId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.disputeId).toBe('550e8400-e29b-41d4-a716-446655440000');
    }
  });
});

// ============================================
// intakeScreenOutputSchema
// ============================================
describe('intakeScreenOutputSchema', () => {
  it('validates correct AI response shape with defaults', () => {
    const result = intakeScreenOutputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toneScore).toBe(0);
      expect(result.data.issueClarity).toBe(5);
      expect(result.data.likelyFrivolous).toBe(false);
      expect(result.data.suggestedCategory).toBe('OTHER');
      expect(result.data.deEscalationTip).toBeNull();
    }
  });

  it('validates a full AI response', () => {
    const result = intakeScreenOutputSchema.safeParse({
      toneScore: 8,
      issueClarity: 7,
      likelyFrivolous: false,
      suggestedCategory: 'NOISE',
      deEscalationTip: 'Try speaking with your neighbor calmly.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects toneScore above 10', () => {
    const result = intakeScreenOutputSchema.safeParse({ toneScore: 11 });
    expect(result.success).toBe(false);
  });

  it('rejects toneScore below 0', () => {
    const result = intakeScreenOutputSchema.safeParse({ toneScore: -1 });
    expect(result.success).toBe(false);
  });
});

// ============================================
// disputeMessageCreateSchema
// ============================================
describe('disputeMessageCreateSchema', () => {
  it('accepts valid message content', () => {
    const result = disputeMessageCreateSchema.safeParse({
      content: 'I would like to discuss this matter.',
    });
    expect(result.success).toBe(true);
  });

  it('defaults isInternal to false', () => {
    const result = disputeMessageCreateSchema.safeParse({
      content: 'A message.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isInternal).toBe(false);
    }
  });

  it('allows isInternal to be true', () => {
    const result = disputeMessageCreateSchema.safeParse({
      content: 'Internal note about this case.',
      isInternal: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isInternal).toBe(true);
    }
  });

  it('rejects empty content', () => {
    const result = disputeMessageCreateSchema.safeParse({
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects content exceeding 5000 characters', () => {
    const result = disputeMessageCreateSchema.safeParse({
      content: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// disputeEvidenceSchema constants
// ============================================
describe('disputeEvidenceSchema', () => {
  it('exports MAX_EVIDENCE_FILE_SIZE as 2MB', () => {
    expect(disputeEvidenceSchema.MAX_EVIDENCE_FILE_SIZE).toBe(2 * 1024 * 1024);
  });

  it('exports ALLOWED_EVIDENCE_TYPES array', () => {
    expect(disputeEvidenceSchema.ALLOWED_EVIDENCE_TYPES).toBeInstanceOf(Array);
    expect(disputeEvidenceSchema.ALLOWED_EVIDENCE_TYPES).toContain('image/jpeg');
    expect(disputeEvidenceSchema.ALLOWED_EVIDENCE_TYPES).toContain('image/png');
    expect(disputeEvidenceSchema.ALLOWED_EVIDENCE_TYPES).toContain('application/pdf');
  });
});

// ============================================
// disputeAssignSchema
// ============================================
describe('disputeAssignSchema', () => {
  it('accepts valid UUID moderatorId', () => {
    const result = disputeAssignSchema.safeParse({
      moderatorId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing moderatorId', () => {
    const result = disputeAssignSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID moderatorId', () => {
    const result = disputeAssignSchema.safeParse({
      moderatorId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// disputeRulingSchema
// ============================================
describe('disputeRulingSchema', () => {
  it('accepts valid ruling description', () => {
    const result = disputeRulingSchema.safeParse({
      rulingDescription:
        'After review, the board rules that the respondent must comply with noise regulations.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects rulingDescription shorter than 10 characters', () => {
    const result = disputeRulingSchema.safeParse({
      rulingDescription: 'Too short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing rulingDescription', () => {
    const result = disputeRulingSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
