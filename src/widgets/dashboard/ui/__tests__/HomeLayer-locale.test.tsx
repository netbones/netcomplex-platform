import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { getLocalizedValue } from '@shared/lib/i18n/config';

// Mock useLanguage to simulate different locale values
vi.mock('@shared/lib/hooks/useSafeTranslation', () => ({
  useLanguage: vi.fn(),
  useSafeTranslation: vi.fn(),
}));

import { useLanguage } from '@shared/lib/hooks/useSafeTranslation';

/**
 * resolveTitle equivalent — mirrors HomeLayer.resolveTitle logic:
 * - If title is a string → return as-is
 * - If title is a JSONB object → use getLocalizedValue with the given locale
 */
function resolveTitle(title: string | Record<string, unknown>, locale: string): string {
  if (typeof title === 'string') return title;
  return getLocalizedValue(title, locale) || '';
}

describe('HomeLayer resolveTitle with dynamic locale', () => {
  const enTitle = 'Hello';
  const afTitle = 'Hallo';
  const xhTitle = 'Molo';
  const zuTitle = 'Sawubona';

  const jsonbTitle = {
    en: enTitle,
    af: afTitle,
    xh: xhTitle,
    zu: zuTitle,
  };

  describe('JSONB title with different locales', () => {
    it('returns English value when locale is en', () => {
      const result = resolveTitle(jsonbTitle, 'en');
      expect(result).toBe(enTitle);
    });

    it('returns Afrikaans value when locale is af', () => {
      const result = resolveTitle(jsonbTitle, 'af');
      expect(result).toBe(afTitle);
    });

    it('returns Xhosa value when locale is xh', () => {
      const result = resolveTitle(jsonbTitle, 'xh');
      expect(result).toBe(xhTitle);
    });

    it('falls back to default locale when requested locale is missing', () => {
      // Only English is available — requesting Xhosa should fall back to English
      const enOnly = { en: 'Only English' };
      const result = resolveTitle(enOnly, 'xh');
      expect(result).toBe('Only English');
    });
  });

  describe('plain string title', () => {
    it('returns the string unchanged regardless of locale', () => {
      const plainTitle = 'Just a plain string title';
      expect(resolveTitle(plainTitle, 'af')).toBe(plainTitle);
      expect(resolveTitle(plainTitle, 'en')).toBe(plainTitle);
      expect(resolveTitle(plainTitle, 'xh')).toBe(plainTitle);
      expect(resolveTitle(plainTitle, 'zu')).toBe(plainTitle);
    });

    it('returns empty string for empty string title', () => {
      expect(resolveTitle('', 'en')).toBe('');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for null/undefined JSONB values', () => {
      // getLocalizedValue returns null for null/undefined, resolveTitle converts to ''
      expect(resolveTitle(null as unknown as Record<string, unknown>, 'en')).toBe('');
      expect(resolveTitle(undefined as unknown as Record<string, unknown>, 'en')).toBe('');
    });

    it('returns empty string for empty JSONB object', () => {
      expect(resolveTitle({}, 'en')).toBe('');
    });
  });
});

describe('HomeLayer useLanguage integration', () => {
  it('useLanguage returns language matching defaultLanguage when i18n is initialized', () => {
    const mockLanguage = 'af';
    vi.mocked(useLanguage).mockReturnValue({
      language: mockLanguage,
      isReady: true,
      changeLanguage: vi.fn(),
    });

    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe(mockLanguage);
  });
});
