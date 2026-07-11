import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Phase 124-01 RED test: Better Auth config — tenantId nullable
 *
 * These tests verify the auth.ts configuration supports tenantId=null signups.
 * They read the source file and check structural patterns — config changes
 * that MUST exist before Behavior can be verified at runtime.
 *
 * Current state (must FAIL):
 *   - tenantId required: true (should be false)
 *   - tenantId has defaultValue (should be removed)
 *   - user.create.before fallback uses tenantConfig.defaultSlug (should be null)
 *   - No sendOnSignUp: true
 *   - sendVerificationEmail uses .catch() wrapper (should use await)
 */
describe('Better Auth config — tenantId nullable (Phase 124 RED)', () => {
  const authSource = readFileSync(path.resolve(__dirname, '..', 'auth.ts'), 'utf-8');

  it('tenantId additionalField has required: false (not true)', () => {
    // The tenantId block within additionalFields must have required: false
    // Pattern: inside the tenantId: { ... } block
    const tenantIdBlockStart = authSource.indexOf('tenantId: {');
    const tenantIdBlockEnd = authSource.indexOf('},', tenantIdBlockStart);
    const tenantIdBlock = authSource.slice(tenantIdBlockStart, tenantIdBlockEnd);

    expect(tenantIdBlock).toContain('required: false');
    expect(tenantIdBlock).not.toContain('required: true');
  });

  it('tenantId additionalField has NO defaultValue line', () => {
    const tenantIdBlockStart = authSource.indexOf('tenantId: {');
    const tenantIdBlockEnd = authSource.indexOf('},', tenantIdBlockStart);
    const tenantIdBlock = authSource.slice(tenantIdBlockStart, tenantIdBlockEnd);

    expect(tenantIdBlock).not.toContain('defaultValue');
  });

  it('user.create.before hook returns null for global signup (no tenantConfig.defaultSlug fallback)', () => {
    // The hook's tenantId line must end with `?? null` not `?? tenantConfig.defaultSlug`
    // Find: tenantId: tenant?.id ?? rawTenantId ?? ...
    const match = authSource.match(
      /tenantId:\s*tenant\?\.id\s*\?\?\s*rawTenantId\s*\?\?[\s\S]*?(?=\n)/
    );
    const line = match?.[0] ?? '';

    expect(line).not.toContain('tenantConfig.defaultSlug');
    expect(line).toContain('null');
  });

  it('emailVerification has sendOnSignUp: true', () => {
    // Must appear in the emailVerification block
    expect(authSource).toContain('sendOnSignUp: true');
  });

  it('sendVerificationEmail uses await sendEmail (no .catch wrapper)', () => {
    // The actual function definition (second occurrence; first is in JSDoc)
    const firstMatch = authSource.indexOf('sendVerificationEmail:');
    const fnStart = authSource.indexOf('sendVerificationEmail:', firstMatch + 1);
    // The await sendEmail call is within the function body
    const awaitCall = authSource.indexOf('await sendEmail', fnStart);

    // Must find await sendEmail within 700 chars of the function start
    expect(awaitCall).toBeGreaterThan(fnStart);
    expect(awaitCall - fnStart).toBeLessThan(700);

    // The sendEmail call within this function must NOT have .catch(err
    const fnBody = authSource.slice(fnStart, awaitCall + 100);
    expect(fnBody).not.toContain('.catch(err');
  });
});
