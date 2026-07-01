import { describe, it, expect } from 'vitest';

const PLATFORM_DOMAIN = 'app.netbones.co.za';

function isPlatformHost(host: string): boolean {
  const hostWithoutPort = host.split(':')[0];
  return hostWithoutPort === PLATFORM_DOMAIN;
}

function isTenantRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/directory') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/providers') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/residents') ||
    pathname.startsWith('/member') ||
    pathname.startsWith('/unit') ||
    pathname.startsWith('/news') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/interest') ||
    pathname.startsWith('/conservation') ||
    pathname.startsWith('/competition') ||
    pathname.startsWith('/guidelines') ||
    pathname.startsWith('/proudly-soralia') ||
    pathname.startsWith('/admin/')
  );
}

function isPlatformRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/home' ||
    pathname.startsWith('/admin/platform') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup')
  );
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/api/auth')
  );
}

describe('middleware utility functions', () => {
  describe('isPlatformHost', () => {
    it('returns true for platform domain without port', () => {
      expect(isPlatformHost('app.netbones.co.za')).toBe(true);
    });

    it('returns true for platform domain with port', () => {
      expect(isPlatformHost('app.netbones.co.za:3000')).toBe(true);
    });

    it('returns false for tenant domains', () => {
      expect(isPlatformHost('soralia.org')).toBe(false);
      expect(isPlatformHost('soralia.com')).toBe(false);
      expect(isPlatformHost('tenant.netbones.co.za')).toBe(false);
    });
  });

  describe('isTenantRoute', () => {
    it('returns true for tenant routes', () => {
      expect(isTenantRoute('/dashboard')).toBe(true);
      expect(isTenantRoute('/directory')).toBe(true);
      expect(isTenantRoute('/groups')).toBe(true);
      expect(isTenantRoute('/events')).toBe(true);
      expect(isTenantRoute('/bookings')).toBe(true);
      expect(isTenantRoute('/maintenance')).toBe(true);
      expect(isTenantRoute('/admin/users')).toBe(true);
    });

    it('returns false for platform routes', () => {
      expect(isTenantRoute('/')).toBe(false);
      expect(isTenantRoute('/pricing')).toBe(false);
      expect(isTenantRoute('/sign-in')).toBe(false);
    });
  });

  describe('isPlatformRoute', () => {
    it('returns true for platform routes', () => {
      expect(isPlatformRoute('/')).toBe(true);
      expect(isPlatformRoute('/home')).toBe(true);
      expect(isPlatformRoute('/admin/platform')).toBe(true);
      expect(isPlatformRoute('/platform/settings')).toBe(true);
      expect(isPlatformRoute('/pricing')).toBe(true);
      expect(isPlatformRoute('/login')).toBe(true);
      expect(isPlatformRoute('/signup')).toBe(true);
    });

    it('returns false for tenant routes', () => {
      expect(isPlatformRoute('/dashboard')).toBe(false);
      expect(isPlatformRoute('/directory')).toBe(false);
    });
  });

  describe('isAuthRoute', () => {
    it('returns true for auth routes', () => {
      expect(isAuthRoute('/sign-in')).toBe(true);
      expect(isAuthRoute('/sign-up')).toBe(true);
      expect(isAuthRoute('/forgot-password')).toBe(true);
      expect(isAuthRoute('/api/auth/session')).toBe(true);
    });

    it('returns false for non-auth routes', () => {
      expect(isAuthRoute('/')).toBe(false);
      expect(isAuthRoute('/dashboard')).toBe(false);
    });
  });
});
