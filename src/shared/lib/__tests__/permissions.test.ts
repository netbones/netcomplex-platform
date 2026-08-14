import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  isAdmin,
  canManageUsers,
  canManageRoster,
  canManageBilling,
  canManageRequests,
  canManageContent,
  canManageGroups,
  canManageOwnGroupOnly,
  canManageEvents,
  canManageBookings,
  canAccessDirectory,
  canManageSettings,
  getPermissions,
} from '@shared/lib';

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

  describe('manageRoster / manageBilling (ADVISORY-039 Phase 1)', () => {
    it('ADMIN has both roster and billing scope', () => {
      expect(canManageRoster('ADMIN')).toBe(true);
      expect(canManageBilling('ADMIN')).toBe(true);
    });

    it('MANAGER has roster scope but NOT billing scope', () => {
      expect(canManageRoster('MANAGER')).toBe(true);
      expect(canManageBilling('MANAGER')).toBe(false);
    });

    it('BOARD/COMMITTEE have neither roster nor billing scope', () => {
      expect(canManageRoster('BOARD')).toBe(false);
      expect(canManageBilling('BOARD')).toBe(false);
      expect(canManageRoster('COMMITTEE')).toBe(false);
      expect(canManageBilling('COMMITTEE')).toBe(false);
    });

    it('exposes both flags on the Permission object', () => {
      const perms = getPermissions('ADMIN');
      expect(perms.manageRoster).toBe(true);
      expect(perms.manageBilling).toBe(true);
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
    it('returns zero permissions for null role', () => {
      const perms = getPermissions(null);
      expect(perms).toEqual(expect.objectContaining({ admin: false, events: false }));
    });

    it('returns zero permissions for invalid role', () => {
      const perms = getPermissions('INVALID');
      expect(perms.admin).toBe(false);
      expect(perms.events).toBe(false);
    });

    it('returns correct permissions for ADMIN', () => {
      const perms = getPermissions('ADMIN');
      expect(perms.admin).toBe(true);
      expect(perms.users).toBe(true);
      expect(perms.settings).toBe(true);
    });
  });
});
