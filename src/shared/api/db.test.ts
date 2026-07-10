/**
 * Regression test: pool size must support concurrent session lookups.
 *
 * Background: BD issue `03kz` (Phase 48 visual verification) reported
 * intermittent `timeout exceeded when trying to connect` errors from
 * `getSessionAndRole` on /api/admin/urgency. Root cause: `POOL_CONFIG.max`
 * was 1, so concurrent requests to the same Node.js process waited for
 * the single connection and hit the 5s `connectionTimeoutMillis` under
 * load. The fix bumped `max` to 10. This test pins the floor so the bug
 * doesn't silently regress.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('db pool config', () => {
  it('must support concurrent queries (max >= 5)', () => {
    const src = readFileSync(join(process.cwd(), 'src/shared/api/db.ts'), 'utf8');
    const maxMatch = src.match(/max:\s*(\d+)/);
    expect(maxMatch, 'POOL_CONFIG.max should be present as a numeric literal').not.toBeNull();
    const max = Number(maxMatch![1]);
    expect(
      max,
      `POOL_CONFIG.max must be >= 5 to avoid pool-exhaustion timeouts (BD 03kz). Got: ${max}`
    ).toBeGreaterThanOrEqual(5);
  });

  it('connection timeout must be reasonable (<= 10s)', () => {
    const src = readFileSync(join(process.cwd(), 'src/shared/api/db.ts'), 'utf8');
    const ctMatch = src.match(/connectionTimeoutMillis:\s*(\d+)/);
    expect(ctMatch, 'connectionTimeoutMillis should be present').not.toBeNull();
    const ct = Number(ctMatch![1]);
    expect(ct).toBeGreaterThan(0);
    expect(ct).toBeLessThanOrEqual(10_000);
  });
});

describe('runWithRLS fail-closed (ADVISORY-032)', () => {
  it('must not proceed when app_user role switch fails', () => {
    const src = readFileSync(join(process.cwd(), 'src/shared/api/db.ts'), 'utf8');
    expect(src).not.toContain('proceeding without app_user role');
    expect(src).toContain('RLS role switch failed — aborting transaction');
    expect(src).toMatch(/catch\s*\([^)]*err[^)]*\)\s*\{[\s\S]*throw err;/);
  });
});
