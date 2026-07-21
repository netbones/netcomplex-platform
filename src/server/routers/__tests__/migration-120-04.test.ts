/**
 * Phase 120-04: Structural tests for router migration
 * These tests verify governance compliance after migration.
 *
 * RED: These tests FAIL before migration.
 * GREEN: They PASS after migration.
 */
import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readRouterSource(filename: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', filename), 'utf-8');
}

// ──────────────────────────────────────────
// Task 1: dWallet Router
// ──────────────────────────────────────────

describe('dwallet.ts migration', () => {
  const source = readRouterSource('marketplace/dwallet.ts');

  test('uses tenantProcedure (not bare protectedProcedure)', () => {
    // After migration, all tenant-scoped procs should use tenantProcedure
    expect(source).toMatch(/tenantProcedure/);
    // Should NOT import protectedProcedure (it imports tenantProcedure instead)
    expect(source).not.toMatch(/import.*protectedProcedure/);
  });

  test('has no inline ctx.tenantId null checks', () => {
    // tenantProcedure guarantees tenantId is non-null
    expect(source).not.toMatch(/if\s*\(\s*!\s*ctx\.tenantId\s*\)/);
    expect(source).not.toMatch(/if\s*\(\s*!tenantId\s*\)/);
  });

  test('imports toEnvelope', () => {
    expect(source).toMatch(/toEnvelope/);
  });

  test('has JSDoc classification tags', () => {
    expect(source).toMatch(/@tenant/);
  });

  test('imports DTOs from @api/server barrel', () => {
    expect(source).toMatch(/(walletTransactionDto|consentDto|payoutDto)/);
    expect(source).toMatch(/from\s+['"]@api\/server['"]/);
  });
});

// ──────────────────────────────────────────
// Task 2: Competitions Router
// ──────────────────────────────────────────

describe('competitions.ts migration', () => {
  const source = readRouterSource('community/competitions.ts');

  test('uses toEnvelope on returns', () => {
    // Per plan: competitions.ts should use toEnvelope
    expect(source).toMatch(/toEnvelope/);
  });

  test('admin procs use privilegedProcedure (not adminProcedure)', () => {
    // adminProcedure → privilegedProcedure for listParticipants, updateEntry, markWinner, drawWinners
    expect(source).toMatch(/privilegedProcedure/);
    expect(source).not.toMatch(/import.*adminProcedure/);
  });

  test('tenant procs use tenantProcedure', () => {
    expect(source).toMatch(/tenantProcedure/);
  });

  test('has JSDoc classification tags', () => {
    expect(source).toMatch(/@public/);
    expect(source).toMatch(/@tenant/);
    expect(source).toMatch(/@privileged/);
  });
});

// ──────────────────────────────────────────
// Resources Router
// ──────────────────────────────────────────

describe('resources.ts migration', () => {
  const source = readRouterSource('core/resources.ts');

  test('imports resourceDto from @api/server barrel', () => {
    expect(source).toMatch(/resourceDto/);
    expect(source).toMatch(/from\s+['"]@api\/server['"]/);
  });

  test('no longer uses raw DB row returns without DTO parsing', () => {
    // resourceDto.parse() should appear for DTO validation
    expect(source).toMatch(/resourceDto\.parse/);
    // Should NOT return await db.select() directly in toEnvelope
    expect(source).not.toMatch(/toEnvelope\(\s*await\s+db\.select\(\)/);
  });

  test('uses tenantProcedure for tenant-scoped procs', () => {
    expect(source).toMatch(/tenantProcedure/);
  });

  test('has no inline ctx.tenantId null checks', () => {
    expect(source).not.toMatch(/if\s*\(\s*!\s*ctx\.tenantId\s*\)/);
    expect(source).not.toMatch(/if\s*\(\s*!tenantId\s*\)/);
  });

  test('has JSDoc classification tags', () => {
    expect(source).toMatch(/@tenant/);
    expect(source).toMatch(/@privileged/);
  });
});

// ──────────────────────────────────────────
// Disputes Router (Rule 2 — missing from tasks, must-have per plan)
// ──────────────────────────────────────────

describe('disputes.ts migration', () => {
  const source = readRouterSource('operations/disputes.ts');

  test('imports dispute DTOs from @api/server barrel', () => {
    expect(source).toMatch(/disputeCaseDto|disputeEventDto|disputeEvidenceDto|disputeMessageDto/);
    expect(source).toMatch(/from\s+['"]@api\/server['"]/);
  });

  test('uses DTO parsing on returns (no raw DB rows)', () => {
    // Should use dto.parse() for DTO validation
    expect(source).toMatch(/\.parse\(/);
    // Should NOT return await db.select() directly in toEnvelope
    expect(source).not.toMatch(/toEnvelope\(\s*await\s+db\.select\(\)/);
  });

  test('uses tenantProcedure for tenant-scoped procs', () => {
    expect(source).toMatch(/tenantProcedure/);
  });

  test('uses privilegedProcedure for admin/moderator procs', () => {
    expect(source).toMatch(/privilegedProcedure/);
  });

  test('has no inline ctx.tenantId null checks', () => {
    expect(source).not.toMatch(/if\s*\(\s*!\s*ctx\.tenantId\s*\)/);
  });

  test('has JSDoc classification tags', () => {
    expect(source).toMatch(/@tenant/);
    expect(source).toMatch(/@privileged/);
  });
});
