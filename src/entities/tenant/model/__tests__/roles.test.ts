import { describe, it, expect } from 'vitest';
import { getEffectiveRole } from '../roles';

describe('getEffectiveRole', () => {
  it('returns AGENT when isAgent is true (highest priority)', () => {
    expect(getEffectiveRole(true, true, true)).toBe('AGENT');
    expect(getEffectiveRole(true, false, false)).toBe('AGENT');
  });

  it('returns OWNER when isPropertyOwner is true and not an agent', () => {
    expect(getEffectiveRole(false, true, false)).toBe('OWNER');
    expect(getEffectiveRole(false, true, true)).toBe('OWNER');
  });

  it('returns SOLO when isSoloSeatHolder is true and not agent/owner', () => {
    expect(getEffectiveRole(false, false, true)).toBe('SOLO');
  });

  it('returns RESIDENT when no roles are active (default)', () => {
    expect(getEffectiveRole(false, false, false)).toBe('RESIDENT');
  });

  it('handles edge case with all false', () => {
    expect(getEffectiveRole(false, false, false)).toBe('RESIDENT');
  });
});
