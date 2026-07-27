import { describe, it, expect } from 'vitest';
import { canComment, canModerateComments, canVote } from '../permissions';

describe('comment permissions', () => {
  describe('canComment', () => {
    it('returns true for resident role', () => {
      expect(canComment('RESIDENT')).toBe(true);
    });
    it('returns true for board role', () => {
      expect(canComment('BOARD')).toBe(true);
    });
    it('returns true for committee role', () => {
      expect(canComment('COMMITTEE')).toBe(true);
    });
    it('returns false for null/undefined role', () => {
      expect(canComment(null)).toBe(false);
      expect(canComment(undefined)).toBe(false);
      expect(canComment('')).toBe(false);
    });
    it('returns true for admin role (admins can comment too)', () => {
      expect(canComment('ADMIN')).toBe(true);
    });
  });

  describe('canModerateComments (ADMIN-only per ADVISORY-35 §4.6)', () => {
    it('returns true ONLY for admin role', () => {
      expect(canModerateComments('ADMIN')).toBe(true);
    });
    it('returns false for board role (deliberate — narrower blast radius)', () => {
      expect(canModerateComments('BOARD')).toBe(false);
    });
    it('returns false for committee role (deliberate — narrower blast radius)', () => {
      expect(canModerateComments('COMMITTEE')).toBe(false);
    });
    it('returns false for resident role', () => {
      expect(canModerateComments('RESIDENT')).toBe(false);
    });
    it('returns false for any other role string', () => {
      expect(canModerateComments('MODERATOR')).toBe(false);
      expect(canModerateComments('EDITOR')).toBe(false);
    });
    it('returns false for null/undefined role', () => {
      expect(canModerateComments(null)).toBe(false);
      expect(canModerateComments(undefined)).toBe(false);
    });
  });

  describe('canVote', () => {
    it('matches canComment (gating on auth)', () => {
      expect(canVote('RESIDENT')).toBe(canComment('RESIDENT'));
      expect(canVote('BOARD')).toBe(canComment('BOARD'));
      expect(canVote(null)).toBe(canComment(null));
    });
    it('returns false for unauthenticated users', () => {
      expect(canVote(null)).toBe(false);
      expect(canVote(undefined)).toBe(false);
      expect(canVote('')).toBe(false);
    });
  });

  describe('permission boundary (ADVISORY-35 G3 done criteria)', () => {
    it('admin-only access to moderation queue', () => {
      type RoleInput = Parameters<typeof canModerateComments>[0];
      const reviewerRoles: RoleInput[] = ['ADMIN'];
      const nonReviewerRoles: RoleInput[] = [
        'RESIDENT',
        'BOARD',
        'COMMITTEE',
        'MODERATOR',
        null,
        undefined,
      ];
      for (const role of reviewerRoles) {
        expect(canModerateComments(role)).toBe(true);
      }
      for (const role of nonReviewerRoles) {
        expect(canModerateComments(role)).toBe(false);
      }
    });
  });
});
