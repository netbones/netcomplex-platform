import { describe, it, expect } from 'vitest';
import { STATUS_META } from '@/features/proxy-vote/lib/constants';
import { transition, ProxyStatusError } from '@/features/proxy-vote/lib/status-transitions';

describe('notifications dispatch contract (Wave 0)', () => {
  it('STATUS_META labels are non-empty for every status', () => {
    expect(STATUS_META.Draft.label.length).toBeGreaterThan(0);
    expect(STATUS_META.WaitingForUpload.label.length).toBeGreaterThan(0);
    expect(STATUS_META.WaitingForProxy.label.length).toBeGreaterThan(0);
    expect(STATUS_META.PendingHoaReview.label.length).toBeGreaterThan(0);
    expect(STATUS_META.Approved.label.length).toBeGreaterThan(0);
    expect(STATUS_META.Rejected.label.length).toBeGreaterThan(0);
    expect(STATUS_META.Withdrawn.label.length).toBeGreaterThan(0);
  });

  it('notify transitions produce valid input for downstream notifications', () => {
    expect(() => transition('Draft', 'upload')).not.toThrow();
    expect(() => transition('WaitingForUpload', 'uploadComplete')).not.toThrow();
    expect(() => transition('WaitingForProxy', 'proxyAccepted')).not.toThrow();
    expect(() => transition('PendingHoaReview', 'approve')).not.toThrow();
    expect(() => transition('PendingHoaReview', 'reject')).not.toThrow();
  });

  it('invalid transitions throw ProxyStatusError (avoids a stale notification)', () => {
    expect(() => transition('Approved', 'upload')).toThrow(ProxyStatusError);
    expect(() => transition('Withdrawn', 'approve')).toThrow(ProxyStatusError);
  });
});
