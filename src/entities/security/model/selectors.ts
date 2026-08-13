import type { SecurityContactType } from './types';
import { SECURITY_CONTACT_TYPE_OPTIONS } from './constants';

/** Normalize phone for tel: links (strip spaces, keep + and digits). */
export function toTelHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned || phone}`;
}

export function contactTypeLabel(type: SecurityContactType): string {
  return SECURITY_CONTACT_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
}

/** Loose SA/international phone validation for security contacts. */
export function isValidSecurityPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}
