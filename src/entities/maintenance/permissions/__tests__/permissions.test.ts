import { describe, it, expect } from 'vitest';
import {
  canViewAllRequests,
  canAssignRequests,
  canResolveRequests,
  canDeleteRequests,
} from '../index';

describe('maintenance permissions', () => {
  describe('canViewAllRequests', () => {
    it('allows ADMIN to view all', () => {
      expect(canViewAllRequests('ADMIN')).toBe(true);
    });
    it('allows BOARD to view all', () => {
      expect(canViewAllRequests('BOARD')).toBe(true);
    });
    it('denies RESIDENT to view all', () => {
      expect(canViewAllRequests('RESIDENT')).toBe(false);
    });
    it('denies null role', () => {
      expect(canViewAllRequests(null)).toBe(false);
    });
  });

  describe('canAssignRequests', () => {
    it('allows ADMIN to assign', () => {
      expect(canAssignRequests('ADMIN')).toBe(true);
    });
    it('denies RESIDENT to assign', () => {
      expect(canAssignRequests('RESIDENT')).toBe(false);
    });
  });

  describe('canResolveRequests', () => {
    it('allows ADMIN to resolve', () => {
      expect(canResolveRequests('ADMIN')).toBe(true);
    });
    it('denies RESIDENT to resolve', () => {
      expect(canResolveRequests('RESIDENT')).toBe(false);
    });
  });

  describe('canDeleteRequests', () => {
    it('allows ADMIN to delete', () => {
      expect(canDeleteRequests('ADMIN')).toBe(true);
    });
    it('denies BOARD to delete', () => {
      expect(canDeleteRequests('BOARD')).toBe(false);
    });
    it('denies RESIDENT to delete', () => {
      expect(canDeleteRequests('RESIDENT')).toBe(false);
    });
  });
});
