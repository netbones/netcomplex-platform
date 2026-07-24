import { describe, it, expect } from 'vitest';
import {
  transition,
  ProxyStatusError,
  type ProxyStatus,
  type ProxyStatusEvent,
} from '@/features/proxy-vote/lib/status-transitions';

/**
 * TDD RED phase for the ProxyVote status transition machine.
 *
 * Encodes the 7-status lifecycle from CONTEXT.md §Status Lifecycle:
 *   Draft → WaitingForUpload → WaitingForProxy → PendingHoaReview
 *        ↘ Withdrawn (from any non-terminal state)
 *        ↘ Approved | Rejected (terminal states from PendingHoaReview)
 *
 * Terminal states (Approved, Rejected, Withdrawn) MUST reject all events.
 * Disallowed transitions throw ProxyStatusError with "{current} → {event}" message.
 */

describe('transition() — proxy-vote status machine', () => {
  describe('valid forward transitions', () => {
    it('Draft + upload → WaitingForUpload', () => {
      expect(transition('Draft', 'upload')).toBe('WaitingForUpload');
    });

    it('WaitingForUpload + uploadComplete → WaitingForProxy', () => {
      expect(transition('WaitingForUpload', 'uploadComplete')).toBe('WaitingForProxy');
    });

    it('WaitingForProxy + proxyAccepted → PendingHoaReview', () => {
      expect(transition('WaitingForProxy', 'proxyAccepted')).toBe('PendingHoaReview');
    });

    it('PendingHoaReview + approve → Approved', () => {
      expect(transition('PendingHoaReview', 'approve')).toBe('Approved');
    });

    it('PendingHoaReview + reject → Rejected', () => {
      expect(transition('PendingHoaReview', 'reject')).toBe('Rejected');
    });
  });

  describe('valid withdrawal transitions', () => {
    it('Draft + withdraw → Withdrawn', () => {
      expect(transition('Draft', 'withdraw')).toBe('Withdrawn');
    });

    it('WaitingForUpload + withdraw → Withdrawn', () => {
      expect(transition('WaitingForUpload', 'withdraw')).toBe('Withdrawn');
    });

    it('WaitingForProxy + withdraw → Withdrawn', () => {
      expect(transition('WaitingForProxy', 'withdraw')).toBe('Withdrawn');
    });

    it('PendingHoaReview + withdraw → Withdrawn', () => {
      expect(transition('PendingHoaReview', 'withdraw')).toBe('Withdrawn');
    });
  });

  describe('invalid transitions throw ProxyStatusError', () => {
    it('Draft + approve throws with descriptive message', () => {
      expect(() => transition('Draft', 'approve')).toThrow(ProxyStatusError);
      expect(() => transition('Draft', 'approve')).toThrow('Invalid transition: Draft → approve');
    });

    it('Approved is terminal — any event throws', () => {
      expect(() => transition('Approved', 'upload')).toThrow(ProxyStatusError);
      expect(() => transition('Approved', 'withdraw')).toThrow(ProxyStatusError);
      expect(() => transition('Approved', 'reject')).toThrow(ProxyStatusError);
    });

    it('Rejected is terminal — any event throws', () => {
      expect(() => transition('Rejected', 'upload')).toThrow(ProxyStatusError);
      expect(() => transition('Rejected', 'approve')).toThrow(ProxyStatusError);
    });

    it('Withdrawn is terminal — any event throws', () => {
      expect(() => transition('Withdrawn', 'upload')).toThrow(ProxyStatusError);
      expect(() => transition('Withdrawn', 'proxyAccepted')).toThrow(ProxyStatusError);
    });

    it('PendingHoaReview cannot accept upload (form already uploaded)', () => {
      expect(() => transition('PendingHoaReview', 'upload')).toThrow(ProxyStatusError);
    });

    it('WaitingForProxy cannot skip proxy acceptance', () => {
      expect(() => transition('WaitingForProxy', 'approve')).toThrow(ProxyStatusError);
    });
  });

  describe('exhaustiveness — every ProxyStatus value is handled', () => {
    it('all 7 statuses are present in ProxyStatus union at compile time', () => {
      const allStatuses: ProxyStatus[] = [
        'Draft',
        'WaitingForUpload',
        'WaitingForProxy',
        'PendingHoaReview',
        'Approved',
        'Rejected',
        'Withdrawn',
      ];
      const allEvents: ProxyStatusEvent[] = [
        'upload',
        'uploadComplete',
        'proxyAccepted',
        'proxyDeclined',
        'approve',
        'reject',
        'withdraw',
      ];
      expect(allStatuses).toHaveLength(7);
      expect(allEvents).toHaveLength(7);
    });
  });
});
