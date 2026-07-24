import { describe, it, expect } from 'vitest';
import {
  ALLOWED_EVENT_CATEGORIES,
  isProxyEligible,
  STATUS_META,
  REFERENCE_CODE_FORMAT,
  type StatusBadgeColor,
} from '@/features/proxy-vote/lib/constants';
import { ALL_PROXY_STATUSES, type ProxyStatus } from '@/features/proxy-vote/lib/status-transitions';

/**
 * TDD RED phase for the ProxyVote constants module.
 *
 * Encodes:
 *  - ALLOWED_EVENT_CATEGORIES — const-tuple of governance event types
 *    eligible for proxy vote (AGM, SGM, SPECIAL_RESOLUTION, TRUSTEE_ELECTION).
 *    Gated via isProxyEligible() at tRPC createProxy entry (plan 125-05).
 *  - STATUS_META — exhaustive Record<ProxyStatus, ProxyStatusMeta> mapping
 *    each status to Tailwind badge palette (gray|amber|green|red) per
 *    UI-SPEC §Status Badge Palette.
 *  - REFERENCE_CODE_FORMAT — PV-{YYYY}-{NNNN} format constant for QR codes.
 */

describe('constants module — proxy-vote', () => {
  describe('ALLOWED_EVENT_CATEGORIES', () => {
    it('exports the four governance categories exactly, in order', () => {
      expect(ALLOWED_EVENT_CATEGORIES).toEqual([
        'AGM',
        'SGM',
        'SPECIAL_RESOLUTION',
        'TRUSTEE_ELECTION',
      ]);
    });

    it('has tuple length 4', () => {
      expect(ALLOWED_EVENT_CATEGORIES).toHaveLength(4);
    });
  });

  describe('isProxyEligible()', () => {
    it('returns true for AGM', () => {
      expect(isProxyEligible('AGM')).toBe(true);
    });

    it('returns true for SGM', () => {
      expect(isProxyEligible('SGM')).toBe(true);
    });

    it('returns true for SPECIAL_RESOLUTION', () => {
      expect(isProxyEligible('SPECIAL_RESOLUTION')).toBe(true);
    });

    it('returns true for TRUSTEE_ELECTION', () => {
      expect(isProxyEligible('TRUSTEE_ELECTION')).toBe(true);
    });

    it('returns false for non-governance event COMMUNITY_EVENT', () => {
      expect(isProxyEligible('COMMUNITY_EVENT')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isProxyEligible('')).toBe(false);
    });
  });

  describe('STATUS_META — badge palette per UI-SPEC §Status Badge Palette', () => {
    const expectedColors: Record<ProxyStatus, StatusBadgeColor> = {
      Draft: 'gray',
      WaitingForUpload: 'amber',
      WaitingForProxy: 'amber',
      PendingHoaReview: 'amber',
      Approved: 'green',
      Rejected: 'red',
      Withdrawn: 'gray',
    };

    it('is exhaustive — every ProxyStatus value has a metadata entry', () => {
      for (const status of ALL_PROXY_STATUSES) {
        expect(STATUS_META[status]).toBeDefined();
      }
    });

    it.each(ALL_PROXY_STATUSES.map(status => [status, expectedColors[status]] as const))(
      'STATUS_META[%s].color === %s',
      (status, expected) => {
        expect(STATUS_META[status].color).toBe(expected);
      }
    );

    it('Approved.label is human-readable', () => {
      expect(STATUS_META.Approved.label).toBe('Approved');
    });

    it('Rejected.label is human-readable', () => {
      expect(STATUS_META.Rejected.label).toBe('Rejected');
    });

    it('every status has a non-empty description', () => {
      for (const status of ALL_PROXY_STATUSES) {
        expect(STATUS_META[status].description).toBeTruthy();
        expect(STATUS_META[status].description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('REFERENCE_CODE_FORMAT', () => {
    it('is the PV-{YYYY}-{NNNN} string template', () => {
      expect(REFERENCE_CODE_FORMAT).toBe('PV-{YYYY}-{NNNN}');
    });

    it('matches a generated 2026/0001 reference code', () => {
      const filled = REFERENCE_CODE_FORMAT.replace('{YYYY}', '2026').replace('{NNNN}', '0001');
      expect(filled).toBe('PV-2026-0001');
    });
  });
});
