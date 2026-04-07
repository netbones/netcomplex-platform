import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

/** Supported language codes for i18n */
export const supportedLanguages = ['en', 'af', 'xh', 'zu'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

/** Display names for supported languages */
export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  af: 'Afrikaans',
  xh: 'Xhosa',
  zu: 'Zulu',
};

/** Default language when user preference is not set */
export const defaultLanguage = 'en';

/** Content-specific locale configuration */
export const contentLocales = {
  /** Locales available for CMS content translations */
  supported: supportedLanguages,

  /** Default locale for content (fallback) */
  default: defaultLanguage,

  /** Whether to show language selector to users */
  userSelectorEnabled: true,

  /** Auto-translate configuration (for future use) */
  autoTranslate: {
    enabled: false,
    provider: null as 'deepl' | 'google' | 'openai' | null,
    apiKey: null,
  },
};

/** Get available locales for content */
export function getContentLocales(): SupportedLanguage[] {
  return [...supportedLanguages];
}

/** Get localized content from JSON field with fallback */
export function getLocalizedValue(
  localeData: Record<string, unknown> | null | undefined,
  userLocale: string,
  fallbackLocale: string = defaultLanguage
): string | null {
  if (!localeData) return null;

  // Try user's preferred locale
  if (localeData[userLocale] && typeof localeData[userLocale] === 'string') {
    return localeData[userLocale] as string;
  }

  // Fallback to default locale
  if (localeData[fallbackLocale] && typeof localeData[fallbackLocale] === 'string') {
    return localeData[fallbackLocale] as string;
  }

  // Fallback to first available key
  const keys = Object.keys(localeData);
  if (keys.length > 0 && typeof localeData[keys[0]] === 'string') {
    return localeData[keys[0]] as string;
  }

  return null;
}

/** All available namespaces */
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

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    ns: namespaces,
    defaultNS: 'common',
    preload: [...supportedLanguages],
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
      lookupQuerystring: 'lang',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
