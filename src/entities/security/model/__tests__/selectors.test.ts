import { describe, it, expect } from 'vitest';
import { toTelHref, contactTypeLabel, isValidSecurityPhone } from '../selectors';

describe('toTelHref', () => {
  it('builds a tel: href from a plain phone number', () => {
    expect(toTelHref('0123456789')).toBe('tel:0123456789');
  });

  it('strips spaces, dashes, and parentheses', () => {
    expect(toTelHref('+27 82 123 4567')).toBe('tel:+27821234567');
    expect(toTelHref('(012) 345-6789')).toBe('tel:0123456789');
  });

  it('keeps the + prefix for international numbers', () => {
    expect(toTelHref('+1 (555) 010-9999')).toBe('tel:+15550109999');
  });

  it('falls back to the raw input when nothing remains', () => {
    expect(toTelHref('---')).toBe('tel:---');
  });
});

describe('contactTypeLabel', () => {
  it('maps known contact types to labels', () => {
    expect(contactTypeLabel('INTERNAL_SECURITY')).toBe('Internal security');
    expect(contactTypeLabel('ARMED_RESPONSE')).toBe('Armed response');
    expect(contactTypeLabel('EMERGENCY_SERVICES')).toBe('Emergency services');
  });

  it('falls back to the raw type for unknown values', () => {
    expect(contactTypeLabel('SOME_NEW_TYPE' as never)).toBe('SOME_NEW_TYPE');
  });
});

describe('isValidSecurityPhone', () => {
  it('accepts SA numbers between 9 and 15 digits', () => {
    expect(isValidSecurityPhone('0821234567')).toBe(true);
    expect(isValidSecurityPhone('+27821234567')).toBe(true);
  });

  it('accepts formatted numbers by counting digits only', () => {
    expect(isValidSecurityPhone('(011) 555-1234')).toBe(true);
  });

  it('rejects numbers with fewer than 9 digits', () => {
    expect(isValidSecurityPhone('12345678')).toBe(false);
    expect(isValidSecurityPhone('')).toBe(false);
  });

  it('rejects numbers with more than 15 digits', () => {
    expect(isValidSecurityPhone('1234567890123456')).toBe(false);
  });
});
