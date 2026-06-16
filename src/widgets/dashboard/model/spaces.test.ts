import { describe, it, expect } from 'vitest';
import { SPACES, type SpaceId } from './spaces';

describe('SPACES href registry', () => {
  it('home space has href /dashboard', () => {
    expect(SPACES.home.href).toBe('/dashboard');
  });

  it('services space has href /dashboard/services', () => {
    expect(SPACES.services.href).toBe('/dashboard/services');
  });

  it('community space has href /dashboard/community', () => {
    expect(SPACES.community.href).toBe('/dashboard/community');
  });

  it('messages space has href /messages', () => {
    expect(SPACES.messages.href).toBe('/messages');
  });

  it('admin space has href /admin (canonical entry)', () => {
    expect(SPACES.admin.href).toBe('/admin');
  });

  it('every SpaceId entry has a non-empty href string', () => {
    const ids: SpaceId[] = ['home', 'services', 'community', 'messages', 'admin'];
    for (const id of ids) {
      expect(typeof SPACES[id].href).toBe('string');
      expect(SPACES[id].href.length).toBeGreaterThan(0);
    }
  });
});
