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
