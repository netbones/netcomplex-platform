import { describe, it, expect } from 'vitest';

/**
 * Wave 0 schema compilation test stub.
 *
 * Verifies that the MeetingProxy Drizzle schema (entity layer re-export)
 * is reachable from the proxy-vote feature slice. This import path is the
 * canonical entity-layer entry point that plan 125-03 will create.
 *
 * Note: This test is INTENTIONALLY set up to fail in plan 125-01. The
 * `src/db/schema/proxy-vote.ts` re-export barrel is created in plan 125-03
 * as part of the entity layer build. Until then, this import will fail —
 * which is the expected Wave 0 state.
 */

describe('proxy-vote schema (Wave 0 stub)', () => {
  it('exposes meetingProxies from the entity-layer barrel', async () => {
    const entityModule = await import('@/db/schema/proxy-vote');
    expect(entityModule.meetingProxies).toBeDefined();
  });
});
