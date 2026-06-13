export const supportedLanguages = ['en', 'af', 'xh', 'zu'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  af: 'Afrikaans',
  xh: 'Xhosa',
  zu: 'Zulu',
};

export const defaultLanguage = 'en';

export const contentLocales = {
  supported: supportedLanguages,
  default: defaultLanguage,
  userSelectorEnabled: true,
  autoTranslate: {
    enabled: false,
    provider: null as 'deepl' | 'google' | 'openai' | null,
    apiKey: null,
  },
};

export function getContentLocales(): SupportedLanguage[] {
  return [...supportedLanguages];
}

export function getLocalizedValue(
  localeData: Record<string, unknown> | null | undefined,
  userLocale: string,
  fallbackLocale: string = defaultLanguage
): string | null {
  if (!localeData) return null;

  if (localeData[userLocale] && typeof localeData[userLocale] === 'string') {
    return localeData[userLocale] as string;
  }

  if (localeData[fallbackLocale] && typeof localeData[fallbackLocale] === 'string') {
    return localeData[fallbackLocale] as string;
  }

  const keys = Object.keys(localeData);
  if (keys.length > 0 && typeof localeData[keys[0]] === 'string') {
    return localeData[keys[0]] as string;
  }

  return null;
}

/**
 * Get localized value that also handles TipTap JSON objects.
 * Returns the full TipTap document if found, or a string for plain text.
 */
export function getLocalizedContent(
  localeData: Record<string, unknown> | null | undefined,
  userLocale: string,
  fallbackLocale: string = defaultLanguage
): string | Record<string, unknown> | null {
  if (!localeData) return null;

  // If it's a TipTap document (has type: 'doc'), return as-is
  if (localeData.type === 'doc') {
    return localeData as Record<string, unknown>;
  }

  // Try user locale
  if (localeData[userLocale]) {
    const value = localeData[userLocale];
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  // Try fallback locale
  if (localeData[fallbackLocale]) {
    const value = localeData[fallbackLocale];
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  // Return first available value
  const keys = Object.keys(localeData);
  if (keys.length > 0) {
    const value = localeData[keys[0]];
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

export const namespaces = [
  'common',
  'dashboard',
  'services',
  'messages',
  'forms',
  'resources',
  'conservation',
  'groups',
  'interest',
  'maintenance',
  'bookings',
  'notifications',
  'directory',
  'admin',
  'platform',
];
