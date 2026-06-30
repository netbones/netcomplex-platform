import { describe, it, expect } from 'vitest';

import { getLocalizedValue, contentLocales, getContentLocales } from '@shared/lib/i18n';

describe('content i18n', () => {
  describe('getLocalizedValue', () => {
    it('returns value for user locale when available', () => {
      const localeData = { en: 'English Title', af: 'Afrikaanse Titel' };
      const result = getLocalizedValue(localeData, 'af', 'en');
      expect(result).toBe('Afrikaanse Titel');
    });

    it('falls back to default locale when user locale missing', () => {
      const localeData = { en: 'English Title', af: 'Afrikaanse Titel' };
      const result = getLocalizedValue(localeData, 'zu', 'en');
      expect(result).toBe('English Title');
    });

    it('falls back to first available key when both missing', () => {
      const localeData = { en: 'English Title', af: 'Afrikaanse Titel' };
      const result = getLocalizedValue(localeData, 'xh', 'zu');
      expect(result).toBe('English Title');
    });

    it('returns null for null input', () => {
      const result = getLocalizedValue(null, 'en', 'en');
      expect(result).toBeNull();
    });

    it('returns null for undefined input', () => {
      const result = getLocalizedValue(undefined, 'en', 'en');
      expect(result).toBeNull();
    });

    it('returns null for empty object', () => {
      const result = getLocalizedValue({}, 'en', 'en');
      expect(result).toBeNull();
    });

    it('handles complex HTML content', () => {
      const localeData = {
        en: '<p>Hello <strong>World</strong></p>',
        af: '<p>Hallo <strong>Wêreld</strong></p>',
      };
      const result = getLocalizedValue(localeData, 'af', 'en');
      expect(result).toBe('<p>Hallo <strong>Wêreld</strong></p>');
    });

    it('handles nested objects gracefully (returns null)', () => {
      const localeData = { en: { nested: 'value' } };
      const result = getLocalizedValue(localeData, 'en', 'en');
      expect(result).toBeNull();
    });
  });

  describe('contentLocales config', () => {
    it('has supported locales', () => {
      expect(contentLocales.supported).toContain('en');
      expect(contentLocales.supported).toContain('af');
      expect(contentLocales.supported).toContain('xh');
      expect(contentLocales.supported).toContain('zu');
    });

    it('has default locale', () => {
      expect(contentLocales.default).toBe('en');
    });

    it('has user selector enabled', () => {
      expect(contentLocales.userSelectorEnabled).toBe(true);
    });

    it('auto-translate is disabled by default', () => {
      expect(contentLocales.autoTranslate.enabled).toBe(false);
      expect(contentLocales.autoTranslate.provider).toBeNull();
    });
  });

  describe('getContentLocales', () => {
    it('returns array of supported languages', () => {
      const locales = getContentLocales();
      expect(locales).toEqual(['en', 'af', 'xh', 'zu']);
    });
  });

  describe('Content API transformation simulation', () => {
    it('transforms JSONB content to localized format', () => {
      const mockDbContent = {
        id: 'test-123',
        title: { en: 'Test Title', af: 'Toets Titel' },
        content: { en: '<p>Test content</p>', af: '<p>Toets inhoud</p>' },
        excerpt: { en: 'Summary', af: 'Opsomming' },
        defaultLocale: 'en',
        contentType: 'article',
        category: 'NEWS',
        published: true,
        createdAt: new Date(),
      };

      // Simulate transformContentForLocale
      const userLocale = 'af';
      const transformed = {
        id: mockDbContent.id,
        title: getLocalizedValue(mockDbContent.title as Record<string, unknown>, userLocale, 'en'),
        content: getLocalizedValue(
          mockDbContent.content as Record<string, unknown>,
          userLocale,
          'en'
        ),
        excerpt: getLocalizedValue(
          mockDbContent.excerpt as Record<string, unknown>,
          userLocale,
          'en'
        ),
      };

      expect(transformed.title).toBe('Toets Titel');
      expect(transformed.content).toBe('<p>Toets inhoud</p>');
      expect(transformed.excerpt).toBe('Opsomming');
    });

    it('falls back to English when Afrikaans not available', () => {
      const mockDbContent = {
        title: { en: 'English Only Title' },
        content: { en: '<p>English content</p>' },
        defaultLocale: 'en',
      };

      const result = getLocalizedValue(mockDbContent.title as Record<string, unknown>, 'af', 'en');
      expect(result).toBe('English Only Title');
    });
  });
});
