import { describe, it, expect } from 'vitest';
import { meetingProxies } from '@/db/schema/meeting-proxies';

describe('proxy-vote entity schema (Wave 0)', () => {
  it('exposes meetingProxies from the entity-layer barrel', () => {
    expect(meetingProxies).toBeDefined();
  });

  it('meetingProxies provides named columns for each MeetingProxy field', () => {
    const table = meetingProxies as unknown as Record<string, { name: string }>;
    const names = Object.values(table).map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('tenantId');
    expect(names).toContain('meetingId');
    expect(names).toContain('ownerUserId');
    expect(names).toContain('status');
    expect(names).toContain('signatureProvider');
    expect(names).toContain('signatureEvidence');
  });
});
