/**
 * Tests for the dispute entity layer: types, constants, lifecycle, and reference generator.
 * Plan 105-02 Task 1 — TDD RED phase.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  RESPONDENT_LABELS,
  EVENT_TYPE_LABELS,
  CSOS_ELIGIBLE_STATUSES,
  ALL_DISPUTE_STATUSES,
  ALL_DISPUTE_CATEGORIES,
} from '../constants';
import type { DisputeStatus, DisputeCategory } from '../types';
import { VALID_TRANSITIONS, canTransition, isTerminalStatus } from '../lifecycle';

// ── Mock @api/server for reference generator tests ──
vi.mock('@api/server', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ count: 42 }]),
  },
  disputeCases: {},
}));

import { generateDisputeReference } from '../../api/reference';

// ============================================
// Tests 1 & 2: STATUS_LABELS coverage
// ============================================
describe('STATUS_LABELS', () => {
  const allStatuses: DisputeStatus[] = [
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'MEDIATION_OFFERED',
    'MEDIATION_ACTIVE',
    'MEDIATED_RESOLVED',
    'FORMAL_RULING',
    'RESOLVED',
    'WITHDRAWN',
    'ESCALATED_CSOS',
    'CSOS_CLOSED',
  ];

  it('has exactly 11 entries — one for every DisputeStatus value', () => {
    expect(Object.keys(STATUS_LABELS)).toHaveLength(11);
  });

  it('contains all DisputeStatus values as keys', () => {
    for (const status of allStatuses) {
      expect(STATUS_LABELS).toHaveProperty(status);
    }
  });

  it('every label is a non-empty string', () => {
    for (const label of Object.values(STATUS_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// Test 3: CATEGORY_LABELS coverage
// ============================================
describe('CATEGORY_LABELS', () => {
  const allCategories: DisputeCategory[] = [
    'NOISE',
    'PETS',
    'PARKING',
    'BOUNDARIES',
    'COMMON_PROPERTY',
    'LEVY_DISPUTE',
    'RULE_ENFORCEMENT',
    'GOVERNANCE',
    'CONDUCT',
    'DAMAGE',
    'OTHER',
  ];

  it('has exactly 11 entries — one for every DisputeCategory value', () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(11);
  });

  it('contains all DisputeCategory values as keys', () => {
    for (const cat of allCategories) {
      expect(CATEGORY_LABELS).toHaveProperty(cat);
    }
  });

  it('every label is a non-empty string', () => {
    for (const label of Object.values(CATEGORY_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// Additional constant coverage
// ============================================
describe('supporting label maps', () => {
  it('SEVERITY_LABELS has 4 entries (MINOR, MODERATE, SERIOUS, URGENT)', () => {
    expect(Object.keys(SEVERITY_LABELS)).toHaveLength(4);
    expect(SEVERITY_LABELS.MINOR).toBeTruthy();
    expect(SEVERITY_LABELS.URGENT).toBeTruthy();
  });

  it('RESPONDENT_LABELS has 4 entries (RESIDENT, HOA, BOARD_MEMBER, TENANT_PROVIDER)', () => {
    expect(Object.keys(RESPONDENT_LABELS)).toHaveLength(4);
    expect(RESPONDENT_LABELS.RESIDENT).toBeTruthy();
    expect(RESPONDENT_LABELS.TENANT_PROVIDER).toBeTruthy();
  });

  it('EVENT_TYPE_LABELS has 15 entries', () => {
    expect(Object.keys(EVENT_TYPE_LABELS)).toHaveLength(15);
  });

  it('CSOS_ELIGIBLE_STATUSES contains exactly 4 entries', () => {
    expect(CSOS_ELIGIBLE_STATUSES).toHaveLength(4);
    expect(CSOS_ELIGIBLE_STATUSES).toContain('FORMAL_RULING');
    expect(CSOS_ELIGIBLE_STATUSES).toContain('ESCALATED_CSOS');
  });

  it('ALL_DISPUTE_STATUSES has all 11 statuses', () => {
    expect(ALL_DISPUTE_STATUSES).toHaveLength(11);
  });

  it('ALL_DISPUTE_CATEGORIES has all 11 categories', () => {
    expect(ALL_DISPUTE_CATEGORIES).toHaveLength(11);
  });
});

// ============================================
// Tests 4–7: Lifecycle state machine
// ============================================
describe('Dispute lifecycle state machine', () => {
  // Test 4
  it('VALID_TRANSITIONS[DRAFT] includes SUBMITTED', () => {
    expect(VALID_TRANSITIONS.DRAFT).toContain('SUBMITTED');
  });

  // Test 5
  it('VALID_TRANSITIONS[DRAFT] does NOT include RESOLVED (invalid transition)', () => {
    expect(VALID_TRANSITIONS.DRAFT).not.toContain('RESOLVED');
  });

  // Test 6
  it('canTransition("DRAFT", "SUBMITTED") returns true', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
  });

  // Test 7
  it('canTransition("DRAFT", "RESOLVED") returns false', () => {
    expect(canTransition('DRAFT', 'RESOLVED')).toBe(false);
  });

  it('canTransition returns false for unknown statuses', () => {
    expect(canTransition('RESOLVED' as DisputeStatus, 'DRAFT' as DisputeStatus)).toBe(false);
    expect(canTransition('WITHDRAWN' as DisputeStatus, 'SUBMITTED' as DisputeStatus)).toBe(false);
    expect(canTransition('CSOS_CLOSED' as DisputeStatus, 'DRAFT' as DisputeStatus)).toBe(false);
  });

  it('isTerminalStatus returns true for RESOLVED, WITHDRAWN, CSOS_CLOSED', () => {
    expect(isTerminalStatus('RESOLVED')).toBe(true);
    expect(isTerminalStatus('WITHDRAWN')).toBe(true);
    expect(isTerminalStatus('CSOS_CLOSED')).toBe(true);
  });

  it('isTerminalStatus returns false for non-terminal statuses', () => {
    expect(isTerminalStatus('DRAFT')).toBe(false);
    expect(isTerminalStatus('SUBMITTED')).toBe(false);
    expect(isTerminalStatus('UNDER_REVIEW')).toBe(false);
    expect(isTerminalStatus('MEDIATION_OFFERED')).toBe(false);
    expect(isTerminalStatus('MEDIATION_ACTIVE')).toBe(false);
  });

  it('VALID_TRANSITIONS covers all 11 statuses', () => {
    expect(Object.keys(VALID_TRANSITIONS)).toHaveLength(11);
  });

  it('MEDIATION_OFFERED allows transition to FORMAL_RULING (decline mediation)', () => {
    expect(VALID_TRANSITIONS.MEDIATION_OFFERED).toContain('FORMAL_RULING');
  });
});

// ============================================
// Test 8: Reference number pattern
// ============================================
describe('generateDisputeReference', () => {
  it('returns a string matching DSP-YYYY-NNNN pattern', async () => {
    const ref = await generateDisputeReference('test-tenant-id');
    expect(ref).toMatch(/^DSP-\d{4}-\d{4}$/);
  });
});
