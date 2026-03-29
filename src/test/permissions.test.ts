import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  isAdmin,
  canManageUsers,
  canManageRequests,
  canManageContent,
  canManageGroups,
  canManageOwnGroupOnly,
  canManageEvents,
  canManageBookings,
  canAccessDirectory,
  canManageSettings,
  getPermissions,
} from '@/lib/permissions';

describe('permissions', () => {
  describe('hasPermission', () => {
    it('returns false for null role', () => {
      expect(hasPermission(null, 'admin')).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(hasPermission(undefined, 'admin')).toBe(false);
    });

    it('returns false for invalid role', () => {
      expect(hasPermission('INVALID_ROLE' as never, 'admin')).toBe(false);
    });

    it('RESIDENT cannot access admin', () => {
      expect(hasPermission('RESIDENT', 'admin')).toBe(false);
    });

    it('ADMIN can access all permissions', () => {
      expect(hasPermission('ADMIN', 'admin')).toBe(true);
      expect(hasPermission('ADMIN', 'users')).toBe(true);
      expect(hasPermission('ADMIN', 'settings')).toBe(true);
    });

    it('RESIDENT can access basic permissions', () => {
      expect(hasPermission('RESIDENT', 'events')).toBe(true);
      expect(hasPermission('RESIDENT', 'bookings')).toBe(true);
      expect(hasPermission('RESIDENT', 'directory')).toBe(true);
    });

    it('COMMITTEE can manage requests and content', () => {
      expect(hasPermission('COMMITTEE', 'requests')).toBe(true);
      expect(hasPermission('COMMITTEE', 'content')).toBe(true);
      expect(hasPermission('COMMITTEE', 'groups')).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('returns true only for ADMIN role', () => {
      expect(isAdmin('ADMIN')).toBe(true);
      expect(isAdmin('BOARD')).toBe(false);
      expect(isAdmin('RESIDENT')).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('only ADMIN can manage users', () => {
      expect(canManageUsers('ADMIN')).toBe(true);
      expect(canManageUsers('BOARD')).toBe(false);
      expect(canManageUsers('COMMITTEE')).toBe(false);
    });
  });

  describe('canManageRequests', () => {
    it('COMMITTEE and above can manage requests', () => {
      expect(canManageRequests('RESIDENT')).toBe(false);
      expect(canManageRequests('GROUP_ADMIN')).toBe(false);
      expect(canManageRequests('COMMITTEE')).toBe(true);
      expect(canManageRequests('ADMIN')).toBe(true);
    });
  });

  describe('canManageContent', () => {
    it('COMMITTEE and above can manage content', () => {
      expect(canManageContent('RESIDENT')).toBe(false);
      expect(canManageContent('GROUP_ADMIN')).toBe(false);
      expect(canManageContent('COMMITTEE')).toBe(true);
    });
  });

  describe('canManageGroups', () => {
    it('COMMITTEE and above can manage all groups', () => {
      expect(canManageGroups('RESIDENT')).toBe(false);
      expect(canManageGroups('GROUP_ADMIN')).toBe(false);
      expect(canManageGroups('COMMITTEE')).toBe(true);
    });
  });

  describe('canManageOwnGroupOnly', () => {
    it('GROUP_ADMIN and above can manage own groups', () => {
      expect(canManageOwnGroupOnly('RESIDENT')).toBe(false);
      expect(canManageOwnGroupOnly('GROUP_ADMIN')).toBe(true);
      expect(canManageOwnGroupOnly('ADMIN')).toBe(true);
    });
  });

  describe('canManageEvents', () => {
    it('all authenticated users can manage events', () => {
      expect(canManageEvents('RESIDENT')).toBe(true);
      expect(canManageEvents('ADMIN')).toBe(true);
    });
  });

  describe('canManageBookings', () => {
    it('all authenticated users can manage bookings', () => {
      expect(canManageBookings('RESIDENT')).toBe(true);
      expect(canManageBookings('ADMIN')).toBe(true);
    });
  });

  describe('canAccessDirectory', () => {
    it('all authenticated users can access directory', () => {
      expect(canAccessDirectory('RESIDENT')).toBe(true);
      expect(canAccessDirectory('ADMIN')).toBe(true);
    });
  });

  describe('canManageSettings', () => {
    it('COMMITTEE and above can manage settings', () => {
      expect(canManageSettings('RESIDENT')).toBe(false);
      expect(canManageSettings('GROUP_ADMIN')).toBe(false);
      expect(canManageSettings('COMMITTEE')).toBe(true);
    });
  });

  describe('getPermissions', () => {
    it('returns RESIDENT permissions for null role', () => {
      const perms = getPermissions(null);
      expect(perms).toEqual(expect.objectContaining({ admin: false, events: true }));
    });

    it('returns RESIDENT permissions for invalid role', () => {
      const perms = getPermissions('INVALID');
      expect(perms.admin).toBe(false);
    });

    it('returns correct permissions for ADMIN', () => {
      const perms = getPermissions('ADMIN');
      expect(perms.admin).toBe(true);
      expect(perms.users).toBe(true);
      expect(perms.settings).toBe(true);
    });
  });
});
