import { describe, it, expect } from 'vitest';
import {
  formatVisitorStatus,
  formatEventMethod,
  formatActorLabel,
  buildShareMessage,
  ACCESS_REQUEST_DEFAULT_TTL_MS,
  QUICK_ACCESS_VALIDITY_MS,
} from '../constants';

describe('formatVisitorStatus', () => {
  it('capitalizes and lowercases common statuses', () => {
    expect(formatVisitorStatus('ACTIVE')).toBe('Active');
    expect(formatVisitorStatus('PENDING')).toBe('Pending');
    expect(formatVisitorStatus('EXPIRED')).toBe('Expired');
    expect(formatVisitorStatus('CANCELLED')).toBe('Cancelled');
    expect(formatVisitorStatus('DENIED')).toBe('Denied');
  });
});

describe('formatEventMethod', () => {
  it('maps every AccessEventMethod to a friendly label', () => {
    expect(formatEventMethod('QR')).toBe('QR');
    expect(formatEventMethod('CODE')).toBe('Code');
    expect(formatEventMethod('MANUAL')).toBe('Manual');
    expect(formatEventMethod('ANPR')).toBe('ANPR');
    expect(formatEventMethod('INTERCOM')).toBe('Intercom');
    expect(formatEventMethod('AUTO_LIST')).toBe('Auto-list');
  });
});

describe('formatActorLabel', () => {
  it('includes actor name when present', () => {
    expect(formatActorLabel('RESIDENT', 'Jane Doe')).toBe('Resident: Jane Doe');
    expect(formatActorLabel('MANAGER', 'Bob')).toBe('Manager: Bob');
    expect(formatActorLabel('GUARD', 'Ace')).toBe('Guard: Ace');
  });

  it('falls back to a generic label when name is null', () => {
    expect(formatActorLabel('RESIDENT', null)).toBe('Resident');
    expect(formatActorLabel('MANAGER', null)).toBe('Manager');
    expect(formatActorLabel('GUARD', null)).toBe('Guard');
  });

  it('handles system actor types', () => {
    expect(formatActorLabel('AUTO_LIST', null)).toBe('Auto-list');
    expect(formatActorLabel('AUTO_DENY', null)).toBe('Auto-deny');
    expect(formatActorLabel('AWAITING_RESIDENT', null)).toBe('Awaiting resident');
  });

  it('returns raw type for unknown actor types', () => {
    expect(formatActorLabel('SOME_UNKNOWN' as never, null)).toBe('SOME_UNKNOWN');
  });
});

describe('buildShareMessage', () => {
  it('produces a multi-line share message with name, code, and URL', () => {
    const msg = buildShareMessage({
      visitorName: 'Alex',
      propertyLabel: '12 Main St',
      code: '123456',
      shareUrl: 'https://app.example/access-control/code/123456?t=tenant-1',
    });

    expect(msg).toContain('Hi Alex,');
    expect(msg).toContain('Your access code for 12 Main St is 123456.');
    expect(msg).toContain('https://app.example/access-control/code/123456?t=tenant-1');
  });
});

describe('access-control TTL constants', () => {
  it('defaults access request TTL to 3 minutes', () => {
    expect(ACCESS_REQUEST_DEFAULT_TTL_MS).toBe(3 * 60 * 1000);
  });

  it('defaults quick access validity to 2 hours', () => {
    expect(QUICK_ACCESS_VALIDITY_MS).toBe(2 * 60 * 60 * 1000);
  });
});
