import { describe, it, expect } from 'vitest';
import { getActiveSpaceId } from './spaces';

describe('getActiveSpaceId', () => {
  it('returns "home" for empty pathname', () => {
    expect(getActiveSpaceId('')).toBe('home');
  });

  it('returns "home" for /dashboard', () => {
    expect(getActiveSpaceId('/dashboard')).toBe('home');
  });

  it('returns "home" for /dashboard/ (trailing slash)', () => {
    expect(getActiveSpaceId('/dashboard/')).toBe('home');
  });

  it('returns "providers" for /dashboard/providers', () => {
    expect(getActiveSpaceId('/dashboard/providers')).toBe('providers');
  });

  it('returns "services" for /dashboard/services', () => {
    expect(getActiveSpaceId('/dashboard/services')).toBe('services');
  });

  it('returns "community" for /dashboard/community', () => {
    expect(getActiveSpaceId('/dashboard/community')).toBe('community');
  });

  it('returns "messages" for /dashboard/communication', () => {
    expect(getActiveSpaceId('/dashboard/communication')).toBe('messages');
  });

  it('returns "messages" for nested /dashboard/communication/announcements', () => {
    expect(getActiveSpaceId('/dashboard/communication/announcements')).toBe('messages');
  });

  it('returns "admin" for legacy /dashboard/admin (back-compat)', () => {
    expect(getActiveSpaceId('/dashboard/admin')).toBe('admin');
  });

  it('returns "admin" for legacy nested /dashboard/admin/users (back-compat)', () => {
    expect(getActiveSpaceId('/dashboard/admin/users')).toBe('admin');
  });

  it('returns "admin" for canonical /admin', () => {
    expect(getActiveSpaceId('/admin')).toBe('admin');
  });

  it('returns "admin" for canonical /admin/ (trailing slash)', () => {
    expect(getActiveSpaceId('/admin/')).toBe('admin');
  });

  it('returns "admin" for canonical /admin/users', () => {
    expect(getActiveSpaceId('/admin/users')).toBe('admin');
  });

  it('returns "admin" for deeply nested /admin/surveys/abc-123/preview', () => {
    expect(getActiveSpaceId('/admin/surveys/abc-123/preview')).toBe('admin');
  });

  it('returns "home" for /adminusers (prefix not followed by /)', () => {
    expect(getActiveSpaceId('/adminusers')).toBe('home');
  });

  it('returns "home" for /dashboard/unknown-slug', () => {
    expect(getActiveSpaceId('/dashboard/unknown-slug')).toBe('home');
  });

  it('returns "home" for /something/else', () => {
    expect(getActiveSpaceId('/something/else')).toBe('home');
  });
});
