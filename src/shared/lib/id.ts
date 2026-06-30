const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function cryptoRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return fallbackId();
}

function fallbackId(): string {
  return Array.from({ length: 36 }, (_, i) => {
    if (i === 8 || i === 13 || i === 18 || i === 23) return '-';
    if (i === 14) return '4';
    return ID_ALPHABET[(Math.random() * ID_ALPHABET.length) | 0];
  }).join('');
}

export function createId(): string {
  return cryptoRandomUUID();
}

export function createPrefixedId(prefix: string): string {
  return `${prefix}_${cryptoRandomUUID()}`;
}
